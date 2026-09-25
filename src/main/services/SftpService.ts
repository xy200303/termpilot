import { existsSync } from 'node:fs'
import { basename, dirname, isAbsolute, posix } from 'node:path'
import { dialog, type WebContents } from 'electron'
import { Client, type OpenMode, type SFTPWrapper } from 'ssh2'
import { IPC } from '../../shared/ipc-channels'
import type { RemoteFile, SftpInstallEvent } from '../../shared/types'
import { dialSsh } from '../ssh-config'
import type { StorageService } from './StorageService'

interface LiveConn {
  client: Client
  sftp: SFTPWrapper
}

/**
 * 每个正向会话一条独立的 SFTP 连接，和终端 shell 分开，关终端不会拆掉文件树。
 */
export class SftpService {
  private conns = new Map<string, Promise<LiveConn>>()
  private installs = new Map<string, Promise<void>>()

  constructor(
    private storage: StorageService,
    private getSender: () => WebContents | null
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
    void pending?.then((c) => c.client.end()).catch(() => undefined)
  }

  disposeAll(): void {
    for (const id of [...this.conns.keys()]) this.close(id)
  }

  private async sftpOf(sessionId: string): Promise<SFTPWrapper> {
    try {
      return await this.open(sessionId)
    } catch (error) {
      if (!isMissingSftp(error)) throw error
      await this.installOnce(sessionId)
      try {
        return await this.open(sessionId)
      } catch (again) {
        const message = again instanceof Error ? again.message : String(again)
        this.emit(sessionId, 'error', `安装后仍无法打开 SFTP：${message}`)
        throw again
      }
    }
  }

  private installOnce(sessionId: string): Promise<void> {
    const existing = this.installs.get(sessionId)
    if (existing) return existing
    const pending = this.installSftp(sessionId).finally(() => {
      this.installs.delete(sessionId)
    })
    this.installs.set(sessionId, pending)
    return pending
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

  /** 在当前 SSH 连接上安装 SFTP 子系统，不新开端口。 */
  private async installSftp(sessionId: string): Promise<void> {
    this.emit(sessionId, 'start', '通过当前 SSH 连接安装 SFTP，不另开端口')
    const client = await this.openClient(sessionId)
    try {
      await execScript(client, INSTALL_SFTP, (line) => this.emit(sessionId, 'log', line))
      this.emit(sessionId, 'done', '安装命令已结束，正在重新连接')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.emit(sessionId, 'error', message)
      throw error
    } finally {
      client.end()
    }
  }

  private emit(sessionId: string, phase: SftpInstallEvent['phase'], text: string): void {
    const wc = this.getSender()
    if (!wc || wc.isDestroyed()) return
    wc.send(IPC.sftpInstall, { sessionId, phase, text } satisfies SftpInstallEvent)
  }

  private openClient(sessionId: string): Promise<Client> {
    const session = this.storage.list().find((s) => s.id === sessionId)
    if (!session || (session.mode ?? 'forward') !== 'forward') {
      return Promise.reject(new Error('只能浏览正向 SSH 的文件'))
    }
    const secret = this.storage.getSecret(sessionId)
    const jumpSecret = this.storage.getJumpSecret(sessionId)
    return new Promise((resolve, reject) => {
      const client = new Client()
      client.once('ready', () => resolve(client))
      client.once('error', reject)
      dialSsh(session, secret, jumpSecret, client)
    })
  }

  private connect(sessionId: string): Promise<LiveConn> {
    return this.openClient(sessionId).then(
      (client) =>
        new Promise((resolve, reject) => {
          client.sftp((err, sftp) => {
            if (err) {
              client.end()
              reject(err)
              return
            }
            resolve({ client, sftp })
          })
        })
    )
  }
}

function isMissingSftp(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /exit code 127|establishing SFTP|sftp subsystem|sftp-server/i.test(message)
}

function execScript(client: Client, script: string, onLog: (line: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    client.exec('sh -s', (err, stream) => {
      if (err) {
        reject(err)
        return
      }
      let pending = ''
      const take = (chunk: Buffer | string) => {
        pending += chunk.toString()
        let nl = pending.indexOf('\n')
        while (nl >= 0) {
          const line = pending.slice(0, nl).replace(/\r$/, '')
          pending = pending.slice(nl + 1)
          if (line.trim()) onLog(line)
          nl = pending.indexOf('\n')
        }
      }
      stream.on('data', take)
      stream.stderr.on('data', take)
      stream.on('close', (code: number | null) => {
        if (pending.trim()) onLog(pending.trim())
        if (code === 0) resolve()
        else reject(new Error(pending.trim() || `安装 SFTP 失败，退出码 ${code ?? '未知'}`))
      })
      stream.end(script)
    })
  })
}

/** 用现有 SSH 登录安装 SFTP。sshd 会在同一端口上拉起子系统，不需要新端口。 */
const INSTALL_SFTP = `
set -e
echo "开始安装 SFTP，使用当前 SSH 连接，不另开端口"
echo "用户 $(id -un) uid=$(id -u)"
run() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo -n "$@"
  fi
}
export DEBIAN_FRONTEND=noninteractive
if command -v apt-get >/dev/null 2>&1; then
  echo "使用 apt-get 安装 openssh-sftp-server"
  run apt-get update -qq
  run apt-get install -y -qq openssh-sftp-server
elif command -v dnf >/dev/null 2>&1; then
  echo "使用 dnf 安装 openssh-server"
  run dnf install -y openssh-server
elif command -v yum >/dev/null 2>&1; then
  echo "使用 yum 安装 openssh-server"
  run yum install -y openssh-server
elif command -v apk >/dev/null 2>&1; then
  echo "使用 apk 安装 openssh-sftp-server"
  run apk add --no-cache openssh-sftp-server
elif command -v zypper >/dev/null 2>&1; then
  echo "使用 zypper 安装 openssh"
  run zypper --non-interactive install openssh
elif command -v pacman >/dev/null 2>&1; then
  echo "使用 pacman 安装 openssh"
  run pacman -Sy --noconfirm openssh
else
  echo "找不到包管理器，无法安装 SFTP" >&2
  exit 1
fi
if ! command -v sshd >/dev/null 2>&1; then
  echo "没有 sshd，无法改子系统"
  exit 1
fi
target=$(sshd -T 2>/dev/null | awk 'tolower($1)=="subsystem" && tolower($2)=="sftp" { print $3; exit }')
echo "当前 SFTP 子系统: \${target:-未配置}"
if [ "$target" = "internal-sftp" ]; then
  echo "已经是 sshd 内置 SFTP，但启动仍然失败"
  exit 1
fi
if [ -n "$target" ] && [ -x "$target" ]; then
  echo "子系统程序存在: $target"
  exit 0
fi
if [ -n "$target" ]; then
  echo "子系统程序不存在: $target"
  ls -l "$target" 2>&1 || true
fi
found=""
for p in /usr/libexec/openssh/sftp-server /usr/lib/openssh/sftp-server /usr/lib/ssh/sftp-server; do
  if [ -x "$p" ]; then
    found=$p
    break
  fi
done
use=internal-sftp
if [ -n "$found" ]; then
  use=$found
  echo "改用已有程序: $found"
else
  echo "改用 sshd 内置 internal-sftp"
fi
cfg=/etc/ssh/sshd_config
if [ ! -w "$cfg" ]; then
  echo "无法写入 $cfg"
  exit 1
fi
comment_sftp() {
  f=$1
  if [ ! -f "$f" ] || [ ! -w "$f" ]; then
    return 0
  fi
  sed -i.termpilot.bak -E 's/^([[:space:]]*)[Ss]ubsystem[[:space:]]+[sS][fF][tT][pP][[:space:]].*/# termpilot: &/' "$f"
}
comment_sftp "$cfg"
if [ -d /etc/ssh/sshd_config.d ]; then
  for f in /etc/ssh/sshd_config.d/*.conf; do
    [ -f "$f" ] || continue
    comment_sftp "$f"
  done
fi
printf '\\nSubsystem sftp %s\\n' "$use" >> "$cfg"
if ! sshd -t >/dev/null 2>&1; then
  echo "sshd 配置无效，正在还原"
  for f in /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf; do
    [ -f "$f.termpilot.bak" ] || continue
    mv "$f.termpilot.bak" "$f"
  done
  exit 1
fi
rm -f /etc/ssh/sshd_config.termpilot.bak /etc/ssh/sshd_config.d/*.conf.termpilot.bak
if command -v systemctl >/dev/null 2>&1; then
  systemctl reload sshd >/dev/null 2>&1 || systemctl reload ssh >/dev/null 2>&1 || true
fi
if [ -f /var/run/sshd.pid ]; then
  kill -HUP "$(cat /var/run/sshd.pid)" >/dev/null 2>&1 || true
fi
echo "已重载 sshd，SFTP 子系统改为 $use"
`

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
