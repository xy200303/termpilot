import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, posix } from 'node:path'
import { app, dialog, type WebContents } from 'electron'
import { Client, type OpenMode, type SFTPWrapper } from 'ssh2'
import { IPC } from '../../shared/ipc-channels'
import type { RemoteFile, SftpInstallEvent } from '../../shared/types'
import type { StorageService } from './StorageService'
import type { SshHold, SshPool } from './SshPool'

interface LiveConn {
  client: Client
  sftp: SFTPWrapper
  release: () => void
}

/**
 * 文件通道挂在已经连到目标机的那条 SSH 会话上。
 * 和终端共用时，关掉其中一边不会拆掉另一边；最后一次引用才断开。
 */
export class SftpService {
  private conns = new Map<string, Promise<LiveConn>>()
  /** 这台机器的文件通道该走哪条 SSH。fresh 表示刚改过子系统，不能复用登录时的旧会话。 */
  private route = new Map<string, 'shared' | 'fresh'>()
  private choosing = new Map<string, Promise<'shared' | 'fresh'>>()
  /** 没改成内置时留下的说明。原来的通道也打不开，才显示给用户。 */
  private switchNote = new Map<string, string[]>()

  constructor(
    private storage: StorageService,
    private getSender: () => WebContents | null,
    private sshPool: SshPool
  ) {}

  async list(sessionId: string, dir: string): Promise<{ path: string; entries: RemoteFile[] }> {
    const sftp = await this.sftpOf(sessionId)
    const requested = dir && dir !== '' ? dir : '.'
    return using(sftp, requested, async (target) => {
      const path = await realpath(sftp, target).catch(() => target)
      const entries = await readdir(sftp, path)
      return { path, entries }
    })
  }

  async mkdir(sessionId: string, dir: string, name: string): Promise<void> {
    const sftp = await this.sftpOf(sessionId)
    const target = posix.join(dir || '.', name)
    await using(sftp, target, (path) => call((cb) => sftp.mkdir(path, cb)))
  }

  async mkdirPath(sessionId: string, path: string): Promise<void> {
    const sftp = await this.sftpOf(sessionId)
    await using(sftp, path, (target) => call((cb) => sftp.mkdir(target, cb)))
  }

  async put(sessionId: string, localPath: string, remotePath: string): Promise<void> {
    assertLocal(localPath)
    if (!existsSync(localPath)) throw new Error('本地文件不存在')
    const sftp = await this.sftpOf(sessionId)
    await using(sftp, remotePath, (target) => call((cb) => sftp.fastPut(localPath, target, cb)))
  }

  async get(sessionId: string, remotePath: string, localPath: string): Promise<void> {
    assertLocal(localPath)
    if (!existsSync(dirname(localPath))) throw new Error('本地目录不存在')
    const sftp = await this.sftpOf(sessionId)
    await using(sftp, remotePath, (target) => call((cb) => sftp.fastGet(target, localPath, cb)))
  }

  async rename(sessionId: string, from: string, to: string): Promise<void> {
    const sftp = await this.sftpOf(sessionId)
    try {
      await call((cb) => sftp.rename(from, to, cb))
    } catch (error) {
      const nextFrom = (await loginRelative(sftp, from)) ?? from
      const nextTo = (await loginRelative(sftp, to)) ?? to
      if (!noSuchFile(error) || (nextFrom === from && nextTo === to)) throw error
      await call((cb) => sftp.rename(nextFrom, nextTo, cb))
    }
  }

  async remove(sessionId: string, path: string, kind: RemoteFile['kind']): Promise<void> {
    const sftp = await this.sftpOf(sessionId)
    await using(sftp, path, async (target) => {
      if (kind === 'dir') await removeDir(sftp, target)
      else await call((cb) => sftp.unlink(target, cb))
    })
  }

  async upload(sessionId: string, dir: string): Promise<number> {
    const picked = await dialog.showOpenDialog({
      title: '上传到当前目录',
      properties: ['openFile', 'multiSelections']
    })
    if (picked.canceled || picked.filePaths.length === 0) return 0
    const sftp = await this.sftpOf(sessionId)
    for (const local of picked.filePaths) {
      const remote = posix.join(dir || '.', basename(local))
      await using(sftp, remote, (target) => call((cb) => sftp.fastPut(local, target, cb)))
    }
    return picked.filePaths.length
  }

  async download(sessionId: string, file: RemoteFile): Promise<boolean> {
    if (file.kind === 'dir') throw new Error('先进入目录再下载里面的文件')
    const picked = await dialog.showSaveDialog({
      title: '下载到本地',
      defaultPath: file.name
    })
    if (picked.canceled || !picked.filePath) return false
    const sftp = await this.sftpOf(sessionId)
    await using(sftp, file.path, (target) => call((cb) => sftp.fastGet(target, picked.filePath!, cb)))
    return true
  }

  async readText(sessionId: string, path: string): Promise<string> {
    const sftp = await this.sftpOf(sessionId)
    return using(sftp, path, (target) => readTextAt(sftp, target))
  }

  async writeText(sessionId: string, path: string, text: string): Promise<void> {
    const sftp = await this.sftpOf(sessionId)
    const data = Buffer.from(text, 'utf8')
    await using(sftp, path, (target) => writeAll(sftp, target, data))
  }

  close(sessionId: string): void {
    const pending = this.conns.get(sessionId)
    this.conns.delete(sessionId)
    void pending?.then((c) => c.release()).catch(() => undefined)
  }

  disposeAll(): void {
    for (const id of [...this.conns.keys()]) this.close(id)
  }

  private async sftpOf(sessionId: string): Promise<SFTPWrapper> {
    const live = this.conns.get(sessionId)
    if (live) {
      return live.then((conn) => conn.sftp).catch((error: unknown) => {
        this.conns.delete(sessionId)
        throw error
      })
    }
    const kind = await this.choose(sessionId)
    try {
      return await (kind === 'fresh' ? this.openFresh(sessionId) : this.open(sessionId))
    } catch (error) {
      const note = this.switchNote.get(sessionId)
      if (note && note.length > 0) {
        this.switchNote.delete(sessionId)
        this.emit(sessionId, 'start', '内置 SFTP 没改成，机器上原来的文件通道也没打开')
        for (const line of note) this.emit(sessionId, 'log', line)
        const message = error instanceof Error ? error.message : String(error)
        this.emit(sessionId, 'error', message)
      }
      throw error
    }
  }

  /** 先用内置 SFTP。已经是就直接用；不是就先改，再开新连接。改不了才用原来的。 */
  private choose(sessionId: string): Promise<'shared' | 'fresh'> {
    const known = this.route.get(sessionId)
    if (known) return Promise.resolve(known)
    const pending = this.choosing.get(sessionId)
    if (pending) return pending
    const next = this.decide(sessionId).finally(() => {
      this.choosing.delete(sessionId)
    })
    this.choosing.set(sessionId, next)
    return next
  }

  private async decide(sessionId: string): Promise<'shared' | 'fresh'> {
    const hold = await this.openHold(sessionId)
    try {
      const result = await execScript(hold.client, installScript(), () => undefined)
      const lines = result.lines.filter((line) => !line.startsWith('TERMPILOT_SFTP '))
      if (result.code === 0 && result.lines.some((line) => line === 'TERMPILOT_SFTP switched')) {
        this.emit(sessionId, 'start', '这台机器还没用 sshd 自带的 SFTP，先改过去')
        for (const line of lines) this.emit(sessionId, 'log', line)
        this.emit(sessionId, 'done', '已经改成内置 SFTP，正在连接')
        this.route.set(sessionId, 'fresh')
        return 'fresh'
      }
      if (result.code === 0 && result.lines.some((line) => line === 'TERMPILOT_SFTP already')) {
        this.route.set(sessionId, 'shared')
        return 'shared'
      }
      this.switchNote.set(sessionId, lines)
      this.route.set(sessionId, 'shared')
      return 'shared'
    } finally {
      hold.release()
    }
  }

  private open(sessionId: string): Promise<SFTPWrapper> {
    const live = this.conns.get(sessionId)
    if (live) {
      return live.then((conn) => conn.sftp).catch((error: unknown) => {
        this.conns.delete(sessionId)
        throw error
      })
    }
    const pending = this.connect(sessionId)
    this.conns.set(sessionId, pending)
    return pending.then((conn) => conn.sftp).catch((error: unknown) => {
      this.conns.delete(sessionId)
      throw error
    })
  }

  private emit(sessionId: string, phase: SftpInstallEvent['phase'], text: string): void {
    const wc = this.getSender()
    if (!wc || wc.isDestroyed()) return
    wc.send(IPC.sftpInstall, { sessionId, phase, text } satisfies SftpInstallEvent)
  }

  private openHold(sessionId: string): Promise<SshHold> {
    const session = this.storage.list().find((s) => s.id === sessionId)
    if (!session || (session.mode ?? 'forward') !== 'forward') {
      return Promise.reject(new Error('只能浏览正向 SSH 的文件'))
    }
    return this.sshPool.acquire(session, this.storage.getSecret(sessionId), this.storage.getJumpSecret(sessionId))
  }

  /** 安装脚本改的是 sshd 配置。必须新开一条连接，旧会话不会读到新子系统。 */
  private openFresh(sessionId: string): Promise<SFTPWrapper> {
    this.conns.delete(sessionId)
    const session = this.storage.list().find((item) => item.id === sessionId)
    if (!session || (session.mode ?? 'forward') !== 'forward') {
      return Promise.reject(new Error('只能浏览正向 SSH 的文件'))
    }
    const pending = this.sshPool
      .acquireIsolated(session, this.storage.getSecret(sessionId), this.storage.getJumpSecret(sessionId))
      .then(
        (hold) =>
          new Promise<LiveConn>((resolve, reject) => {
            hold.client.sftp((err, sftp) => {
              if (err || !sftp) {
                hold.release()
                reject(err ?? new Error('打不开 SFTP'))
                return
              }
              resolve({ client: hold.client, sftp, release: hold.release })
            })
          })
      )
    this.conns.set(sessionId, pending)
    return pending.then((conn) => conn.sftp).catch((error: unknown) => {
      this.conns.delete(sessionId)
      throw error
    })
  }

  private connect(sessionId: string): Promise<LiveConn> {
    return this.openHold(sessionId).then(
      (hold) =>
        new Promise((resolve, reject) => {
          hold.client.sftp((err, sftp) => {
            if (err || !sftp) {
              hold.release()
              reject(err ?? new Error('打不开 SFTP'))
              return
            }
            hold.client.on('close', () => {
              const pending = this.conns.get(sessionId)
              void pending?.then((conn) => {
                if (conn.client === hold.client) this.conns.delete(sessionId)
              })
              hold.release()
            })
            resolve({ client: hold.client, sftp, release: hold.release })
          })
        })
    )
  }
}

function execScript(
  client: Client,
  script: string,
  onLog: (line: string) => void
): Promise<{ code: number; lines: string[] }> {
  return new Promise((resolve, reject) => {
    client.exec('sh -s', (err, stream) => {
      if (err) {
        reject(err)
        return
      }
      const lines: string[] = []
      let pending = ''
      const take = (chunk: Buffer | string) => {
        pending += chunk.toString()
        let nl = pending.indexOf('\n')
        while (nl >= 0) {
          const line = pending.slice(0, nl).replace(/\r$/, '')
          pending = pending.slice(nl + 1)
          if (line.trim()) {
            lines.push(line)
            onLog(line)
          }
          nl = pending.indexOf('\n')
        }
      }
      stream.on('data', take)
      stream.stderr.on('data', take)
      stream.on('close', (code: number | null) => {
        if (pending.trim()) {
          lines.push(pending.trim())
          onLog(pending.trim())
        }
        resolve({ code: code ?? 1, lines })
      })
      stream.end(script)
    })
  })
}

/** 安装脚本在 resources 里。开发时读项目目录，打包后读安装目录。 */
function installScript(): string {
  const packaged = join(process.resourcesPath, 'install-sftp.sh')
  const file = app.isPackaged && existsSync(packaged) ? packaged : join(app.getAppPath(), 'resources', 'install-sftp.sh')
  return readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
}

function realpath(sftp: SFTPWrapper, path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    sftp.realpath(path, (err, resolved) => {
      if (err || !resolved) reject(err ?? new Error('无法解析路径'))
      else resolve(resolved)
    })
  })
}

function readdir(sftp: SFTPWrapper, dir: string): Promise<RemoteFile[]> {
  return new Promise((resolve, reject) => {
    sftp.readdir(dir, (err, list) => {
      if (err) {
        reject(err)
        return
      }
      const entries: RemoteFile[] = list
        .filter((item) => item.filename !== '.' && item.filename !== '..')
        .map((item) => {
          const mode = item.attrs.mode ?? 0
          const isDir = (mode & 0o170000) === 0o040000
          const isLink = (mode & 0o170000) === 0o120000
          return {
            name: item.filename,
            path: posix.join(dir, item.filename),
            kind: isDir ? 'dir' : isLink ? 'link' : 'file',
            size: item.attrs.size,
            mtime: (item.attrs.mtime ?? 0) * 1000
          }
        })
      entries.sort((a, b) => {
        if (a.kind === 'dir' && b.kind !== 'dir') return -1
        if (a.kind !== 'dir' && b.kind === 'dir') return 1
        return a.name.localeCompare(b.name)
      })
      resolve(entries)
    })
  })
}

async function removeDir(sftp: SFTPWrapper, path: string, depth = 0): Promise<void> {
  if (depth > 32) throw new Error('目录层级过深')
  const entries = await readdir(sftp, path).catch(() => [] as RemoteFile[])
  for (const item of entries) {
    if (item.kind === 'dir') await removeDir(sftp, item.path, depth + 1)
    else await using(sftp, item.path, (target) => call((cb) => sftp.unlink(target, cb)))
  }
  await call((cb) => sftp.rmdir(path, cb))
}

function assertLocal(file: string): void {
  if (!isAbsolute(file)) throw new Error('本地路径需要是绝对路径')
}

function call(run: (cb: (err: Error | undefined | null) => void) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    run((err) => (err ? reject(err) : resolve()))
  })
}

const MAX_EDIT_BYTES = 1_500_000
const CHUNK = 32 * 1024
const loginDirs = new WeakMap<SFTPWrapper, Promise<string>>()

async function readTextAt(sftp: SFTPWrapper, path: string): Promise<string> {
  const size = await statSize(sftp, path)
  if (size > MAX_EDIT_BYTES) throw new Error('文件超过 1.5MB，不在编辑器里打开')
  const buf = await readAll(sftp, path)
  if (buf.includes(0)) throw new Error('这是二进制文件，不能用文本编辑器打开')
  return buf.toString('utf8')
}

function statSize(sftp: SFTPWrapper, path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    sftp.stat(path, (err, stats) => {
      if (err) reject(err)
      else resolve(stats.size)
    })
  })
}

async function readAll(sftp: SFTPWrapper, path: string): Promise<Buffer> {
  const handle = await openFile(sftp, path, 'r')
  try {
    const chunks: Buffer[] = []
    let pos = 0
    for (;;) {
      const chunk = await readChunk(sftp, handle, pos)
      if (chunk.length === 0) break
      chunks.push(chunk)
      pos += chunk.length
    }
    return Buffer.concat(chunks)
  } finally {
    await closeFile(sftp, handle).catch(() => undefined)
  }
}

async function writeAll(sftp: SFTPWrapper, path: string, data: Buffer): Promise<void> {
  const handle = await openFile(sftp, path, 'w')
  try {
    for (let pos = 0; pos < data.length; pos += CHUNK) {
      const end = Math.min(pos + CHUNK, data.length)
      await writeChunk(sftp, handle, data.subarray(pos, end), pos)
    }
  } catch (error) {
    await closeFile(sftp, handle).catch(() => undefined)
    throw error
  }
  await closeFile(sftp, handle)
}

function openFile(sftp: SFTPWrapper, path: string, flags: OpenMode): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    sftp.open(path, flags, (err, handle) => {
      if (err || !handle) reject(err ?? new Error('无法打开文件'))
      else resolve(handle)
    })
  })
}

function readChunk(sftp: SFTPWrapper, handle: Buffer, position: number): Promise<Buffer> {
  const buffer = Buffer.allocUnsafe(CHUNK)
  return new Promise((resolve, reject) => {
    sftp.read(handle, buffer, 0, buffer.length, position, (err, bytesRead) => {
      if (err) {
        if (codeOf(err) === 1) resolve(Buffer.alloc(0))
        else reject(err)
        return
      }
      resolve(Buffer.from(buffer.subarray(0, bytesRead)))
    })
  })
}

function writeChunk(sftp: SFTPWrapper, handle: Buffer, data: Buffer, position: number): Promise<void> {
  return new Promise((resolve, reject) => {
    sftp.write(handle, data, 0, data.length, position, (err) => (err ? reject(err) : resolve()))
  })
}

function closeFile(sftp: SFTPWrapper, handle: Buffer): Promise<void> {
  return call((cb) => sftp.close(handle, cb))
}

async function using<T>(sftp: SFTPWrapper, path: string, run: (path: string) => Promise<T>): Promise<T> {
  try {
    return await run(path)
  } catch (error) {
    const alt = await loginRelative(sftp, path)
    if (!alt || !noSuchFile(error)) throw error
    return await run(alt)
  }
}

async function loginRelative(sftp: SFTPWrapper, path: string): Promise<string | null> {
  if (!path.startsWith('/')) return null
  const home = await loginDir(sftp)
  const root = home.replace(/\/+$/, '')
  if (!root.startsWith('/')) return null
  const prefix = root === '/' ? '/' : `${root}/`
  if (!path.startsWith(prefix)) return null
  const rest = path.slice(prefix.length)
  return rest && rest !== path ? rest : null
}

function loginDir(sftp: SFTPWrapper): Promise<string> {
  const cached = loginDirs.get(sftp)
  if (cached) return cached
  const pending = realpath(sftp, '.').catch(() => '')
  loginDirs.set(sftp, pending)
  return pending
}

function noSuchFile(error: unknown): boolean {
  return codeOf(error) === 2
}

function codeOf(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined
  const code = (error as { code?: unknown }).code
  return typeof code === 'number' ? code : undefined
}
