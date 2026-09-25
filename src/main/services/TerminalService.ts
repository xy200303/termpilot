import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { WebContents } from 'electron'
import { Client } from 'ssh2'
import type { ClientChannel } from 'ssh2'
import type { IPty } from 'node-pty'
import { IPC } from '../../shared/ipc-channels'
import type { TermCreateOptions, TermDataEvent, TermStatusEvent } from '../../shared/types'
import { dialSsh, endJump } from '../ssh-config'
import type { StorageService } from './StorageService'

/**
 * node-pty 是原生模块，且需要匹配 Electron ABI（electron-rebuild）。
 * 用 createRequire 动态加载并兜底：加载失败时 SSH 终端仍可用，
 * 仅本地终端报友好错误，不至于拖垮整个主进程。
 */
let pty: typeof import('node-pty') | null = null
let ptyLoadError: string | null = null
try {
  const req = createRequire(join(__dirname, 'require-shim.js'))
  pty = req('node-pty') as typeof import('node-pty')
} catch (e) {
  ptyLoadError = e instanceof Error ? e.message : String(e)
  console.error('[TermPilot] node-pty 加载失败（本地终端不可用）:', ptyLoadError)
}

interface TermEntry {
  id: string
  sessionId: string | null
  kind: 'ssh' | 'local'
  client?: Client
  /** 经过跳板时，目标连接挂在这上面。关掉终端要一起断开。 */
  jump?: Client
  stream?: ClientChannel
  ptyProc?: IPty
}

/**
 * 终端服务：统一管理 SSH shell 通道（ssh2）与本地 PTY（node-pty）。
 * 数据下行通过 webContents.send 推送，上行走 IPC send。
 */
export class TerminalService {
  private terms = new Map<string, TermEntry>()
  private output = new Map<string, string>()
  private lastStatus = new Map<string, TermStatusEvent>()
  private statusListeners = new Set<(event: TermStatusEvent) => void>()
  private bindWaiters = new Map<string, () => void>()

  constructor(
    private storage: StorageService,
    private getSender: () => WebContents | null
  ) {}

  async create(opts: TermCreateOptions): Promise<void> {
    // 同 id 重复创建（React StrictMode 双调用 / 重挂载）直接忽略
    if (this.terms.has(opts.termId)) return

    if (opts.kind === 'local') {
      this.createLocal(opts)
    } else {
      await this.createSsh(opts)
    }
  }

  input(termId: string, data: string): void {
    const t = this.terms.get(termId)
    if (!t) return
    if (t.stream) t.stream.write(data)
    else if (t.ptyProc) t.ptyProc.write(data)
  }

  resize(termId: string, cols: number, rows: number): void {
    const t = this.terms.get(termId)
    if (!t || cols <= 0 || rows <= 0) return
    try {
      if (t.stream) t.stream.setWindow(rows, cols, 0, 0)
      else if (t.ptyProc) t.ptyProc.resize(cols, rows)
    } catch {
      /* 连接已断开时忽略 resize 错误 */
    }
  }

  close(termId: string): void {
    const t = this.terms.get(termId)
    if (!t) return
    this.terms.delete(termId)
    this.output.delete(termId)
    this.lastStatus.delete(termId)
    try {
      t.stream?.close()
      t.client?.end()
      endJump(t.jump)
      t.ptyProc?.kill()
    } catch {
      /* 清理阶段的异常忽略 */
    }
  }

  listTerms(): { id: string; sessionId: string | null; kind: TermEntry['kind']; status: string }[] {
    return [...this.terms.values()].map((t) => ({
      id: t.id,
      sessionId: t.sessionId,
      kind: t.kind,
      status: this.lastStatus.get(t.id)?.status ?? 'unknown'
    }))
  }

  /** 界面把 xterm 订上之后再放行 SSH，避免登录横幅丢在订阅之前 */
  expectBind(termId: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.bindWaiters.delete(termId)
        reject(new Error('界面没有打开终端'))
      }, timeoutMs)
      this.bindWaiters.set(termId, () => {
        clearTimeout(timer)
        this.bindWaiters.delete(termId)
        resolve()
      })
    })
  }

  markBound(termId: string): void {
    this.bindWaiters.get(termId)?.()
  }

  waitStatus(termId: string, timeoutMs: number): Promise<void> {
    const current = this.lastStatus.get(termId)
    if (current?.status === 'connected') return Promise.resolve()
    if (current?.status === 'error') return Promise.reject(new Error(current.error ?? '连接失败'))

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.statusListeners.delete(onStatus)
        reject(new Error('连接超时'))
      }, timeoutMs)
      const onStatus = (event: TermStatusEvent) => {
        if (event.termId !== termId) return
        if (event.status === 'connected') {
          clearTimeout(timer)
          this.statusListeners.delete(onStatus)
          resolve()
        } else if (event.status === 'error' || event.status === 'disconnected') {
          clearTimeout(timer)
          this.statusListeners.delete(onStatus)
          reject(new Error(event.error ?? '连接失败'))
        }
      }
      this.statusListeners.add(onStatus)
    })
  }

  readTail(termId: string, maxChars: number): string {
    if (!this.terms.has(termId)) throw new Error('终端不存在或已断开')
    return (this.output.get(termId) ?? '').slice(-maxChars)
  }

  async execCommand(termId: string, command: string, timeoutMs: number): Promise<string> {
    const term = this.terms.get(termId)
    if (!term?.stream && !term?.ptyProc) throw new Error('终端还没连上')
    const before = this.output.get(termId) ?? ''
    this.input(termId, command.endsWith('\n') ? command : `${command}\n`)
    const deadline = Date.now() + timeoutMs
    let last = before
    let quietSince = Date.now()
    while (Date.now() < deadline) {
      await delay(80)
      const cur = this.output.get(termId) ?? ''
      if (cur !== last) {
        last = cur
        quietSince = Date.now()
        continue
      }
      if (cur !== before && Date.now() - quietSince >= 800) break
    }
    const cur = this.output.get(termId) ?? ''
    return cur.startsWith(before) ? cur.slice(before.length) : cur
  }

  disposeAll(): void {
    for (const id of [...this.terms.keys()]) this.close(id)
  }

  // ---------------------------------------------------------------- ssh

  private async createSsh(opts: TermCreateOptions): Promise<void> {
    const session = this.storage.list().find((s) => s.id === opts.sessionId)
    if (!session) {
      this.sendStatus(opts.termId, opts.sessionId ?? null, 'error', '会话不存在')
      return
    }

    const entry: TermEntry = { id: opts.termId, sessionId: session.id, kind: 'ssh' }
    this.terms.set(opts.termId, entry)
    this.sendStatus(opts.termId, session.id, 'connecting')

    const client = new Client()
    entry.client = client

    client
      .on('ready', () => {
        if (entry.stream) return
        client.shell(
          { term: 'xterm-256color', cols: opts.cols, rows: opts.rows },
          (err, stream) => {
            if (err) {
              this.sendStatus(opts.termId, session.id, 'error', `打开 shell 失败: ${err.message}`)
              this.close(opts.termId)
              return
            }
            entry.stream = stream
            this.sendStatus(opts.termId, session.id, 'connected')
            stream.on('data', (d: Buffer) => this.sendData(opts.termId, d))
            stream.stderr.on('data', (d: Buffer) => this.sendData(opts.termId, d))
            stream.on('close', () => {
              this.sendStatus(opts.termId, session.id, 'disconnected')
              this.close(opts.termId)
            })
          }
        )
      })
      .on('error', (err) => {
        this.sendStatus(opts.termId, session.id, 'error', err.message)
        this.close(opts.termId)
      })
      .on('close', () => {
        this.sendStatus(opts.termId, session.id, 'disconnected')
        this.close(opts.termId)
      })

    try {
      entry.jump = dialSsh(
        session,
        this.storage.getSecret(session.id),
        this.storage.getJumpSecret(session.id),
        client,
        {
          cols: opts.cols,
          rows: opts.rows,
          onJumpShell: (stream) => {
            entry.stream = stream
            this.sendStatus(opts.termId, session.id, 'connected')
            stream.on('data', (d: Buffer) => this.sendData(opts.termId, d))
            stream.stderr.on('data', (d: Buffer) => this.sendData(opts.termId, d))
            stream.on('close', () => {
              this.sendStatus(opts.termId, session.id, 'disconnected')
              this.close(opts.termId)
            })
          }
        }
      )
    } catch (e) {
      this.sendStatus(
        opts.termId,
        session.id,
        'error',
        e instanceof Error ? e.message : String(e)
      )
      this.close(opts.termId)
    }
  }

  // -------------------------------------------------------------- local

  private createLocal(opts: TermCreateOptions): void {
    if (!pty) {
      this.sendStatus(
        opts.termId,
        null,
        'error',
        `node-pty 不可用: ${ptyLoadError ?? '未知原因'}（原生模块需 electron-rebuild）`
      )
      return
    }
    const shell =
      process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash'

    const entry: TermEntry = { id: opts.termId, sessionId: null, kind: 'local' }
    this.terms.set(opts.termId, entry)

    try {
      const proc = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: opts.cols,
        rows: opts.rows,
        cwd: homedir(),
        env: process.env as Record<string, string>
      })
      entry.ptyProc = proc
      this.sendStatus(opts.termId, null, 'connected')
      proc.onData((d) => this.sendData(opts.termId, Buffer.from(d, 'utf-8')))
      proc.onExit(() => {
        this.sendStatus(opts.termId, null, 'disconnected')
        this.close(opts.termId)
      })
    } catch (e) {
      this.sendStatus(opts.termId, null, 'error', e instanceof Error ? e.message : String(e))
      this.close(opts.termId)
    }
  }

  // ------------------------------------------------------------- events

  private sendData(termId: string, data: Buffer): void {
    const prev = this.output.get(termId) ?? ''
    const next = prev + data.toString('utf8')
    this.output.set(termId, next.length > 100_000 ? next.slice(-100_000) : next)
    const wc = this.getSender()
    if (!wc || wc.isDestroyed()) return
    const payload: TermDataEvent = { termId, data }
    wc.send(IPC.termData, payload)
  }

  private sendStatus(
    termId: string,
    sessionId: string | null,
    status: TermStatusEvent['status'],
    error?: string
  ): void {
    const payload: TermStatusEvent = { termId, sessionId, status, error }
    this.lastStatus.set(termId, payload)
    for (const listener of [...this.statusListeners]) listener(payload)
    const wc = this.getSender()
    if (!wc || wc.isDestroyed()) return
    wc.send(IPC.termStatus, payload)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
