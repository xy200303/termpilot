import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { WebContents } from 'electron'
import { Client } from 'ssh2'
import type { ClientChannel } from 'ssh2'
import type { IPty } from 'node-pty'
import { IPC } from '../../shared/ipc-channels'
import type { TermCreateOptions, TermDataEvent, TermMetaEvent, TermStatusEvent, SessionConfig } from '../../shared/types'
import { dialSsh, endJump } from '../ssh-config'
import type { StorageService } from './StorageService'
import type { SshHold, SshPool } from './SshPool'

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
  /** 和文件树共用的那条 SSH 会话。最后一次引用才真正断开。 */
  release?: () => void
  stream?: ClientChannel
  ptyProc?: IPty
  title: string
  remark: string
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
  /** 界面已经订上输出。之前的内容先补一次，避免重启后的记录被新输出盖掉。 */
  private viewReady = new Set<string>()
  private flushTimers = new Map<string, ReturnType<typeof setTimeout>>()
  /** 正在退出。此时断开不要把窗口从库里删掉。 */
  private parking = false

  constructor(
    private storage: StorageService,
    private getSender: () => WebContents | null,
    private sshPool: SshPool
  ) {
    this.hydrate()
  }

  async create(opts: TermCreateOptions): Promise<void> {
    const existing = this.terms.get(opts.termId)
    if (existing?.stream || existing?.ptyProc) return
    if (existing && this.lastStatus.get(opts.termId)?.status === 'connecting') return

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

  /** 人关掉或助手关掉。编号不再恢复。 */
  close(termId: string): void {
    const t = this.terms.get(termId)
    this.releaseLive(t)
    this.terms.delete(termId)
    this.output.delete(termId)
    this.lastStatus.delete(termId)
    this.viewReady.delete(termId)
    const timer = this.flushTimers.get(termId)
    if (timer) clearTimeout(timer)
    this.flushTimers.delete(termId)
    this.storage.forgetOpenTerm(termId)
  }

  /** 界面订上之后，把已经记下的输出补到画面上。 */
  bindView(termId: string): void {
    const text = this.output.get(termId) ?? ''
    const first = !this.viewReady.has(termId)
    this.viewReady.add(termId)
    if (first && text) this.push(termId, Buffer.from(text, 'utf8'))
  }

  saved(): { id: string; sessionId: string | null; kind: 'ssh' | 'local'; title: string; remark: string }[] {
    return this.storage.listOpenTerms().map((term) => ({
      id: term.id,
      sessionId: term.sessionId,
      kind: term.kind,
      title: term.title,
      remark: term.remark
    }))
  }

  listTerms(): {
    id: string
    sessionId: string | null
    kind: TermEntry['kind']
    status: string
    title: string
    remark: string
  }[] {
    return [...this.terms.values()].map((t) => ({
      id: t.id,
      sessionId: t.sessionId,
      kind: t.kind,
      status: this.lastStatus.get(t.id)?.status ?? 'unknown',
      title: t.title,
      remark: t.remark
    }))
  }

  /** 窗口短标题或助手备注。编号不变。 */
  setLabel(termId: string, patch: { title?: string; remark?: string }): void {
    const term = this.terms.get(termId)
    if (!term) return
    if (patch.title !== undefined) term.title = patch.title.trim().slice(0, 80) || term.title
    if (patch.remark !== undefined) term.remark = patch.remark.trim().slice(0, 200)
    this.persist(term)
    this.sendMeta(term)
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

  /** 退出时记下输出并断开。窗口编号、备注和记录留着，下次打开还在。 */
  disposeAll(): void {
    this.parking = true
    for (const id of [...this.flushTimers.keys()]) {
      const timer = this.flushTimers.get(id)
      if (timer) clearTimeout(timer)
      this.flush(id)
    }
    this.flushTimers.clear()
    for (const term of this.terms.values()) this.releaseLive(term)
    this.terms.clear()
    this.viewReady.clear()
  }

  // ---------------------------------------------------------------- ssh

  private async createSsh(opts: TermCreateOptions): Promise<void> {
    const session = this.storage.list().find((s) => s.id === opts.sessionId)
    if (!session) {
      this.sendStatus(opts.termId, opts.sessionId ?? null, 'error', '会话不存在')
      return
    }

    const prior = this.terms.get(opts.termId)
    const entry: TermEntry = prior ?? {
      id: opts.termId,
      sessionId: session.id,
      kind: 'ssh',
      title: opts.title?.trim() || '窗口',
      remark: ''
    }
    if (!prior) {
      this.terms.set(opts.termId, entry)
      this.persist(entry)
    }
    this.sendStatus(opts.termId, session.id, 'connecting')

    const secret = this.storage.getSecret(session.id)
    const jumpSecret = this.storage.getJumpSecret(session.id)
    try {
      const hold = await this.sshPool.acquire(session, secret, jumpSecret)
      if (!this.terms.has(opts.termId)) {
        hold.release()
        return
      }
      this.bindShared(entry, hold, opts)
      return
    } catch (error) {
      if (!this.terms.has(opts.termId)) return
      if (session.jumpHost?.trim() && isForwardDenied(error)) {
        this.openJumpShell(entry, opts, session, secret, jumpSecret)
        return
      }
      this.sendStatus(opts.termId, session.id, 'error', error instanceof Error ? error.message : String(error))
    }
  }

  /** 转发已经通了。shell 开在这条会话上，不再向跳板要一次连接。 */
  private bindShared(entry: TermEntry, hold: SshHold, opts: TermCreateOptions): void {
    const sessionId = entry.sessionId
    entry.client = hold.client
    entry.release = hold.release
    hold.client.on('error', (err) => {
      this.releaseLive(entry)
      this.sendStatus(opts.termId, sessionId, 'error', err.message)
    })
    hold.client.on('close', () => {
      this.releaseLive(entry)
      this.sendStatus(opts.termId, sessionId, 'disconnected')
    })
    hold.client.shell({ term: 'xterm-256color', cols: opts.cols, rows: opts.rows }, (err, stream) => {
      if (!this.terms.has(opts.termId)) return
      if (err || !stream) {
        this.sendStatus(opts.termId, sessionId, 'error', `打开 shell 失败: ${err?.message ?? '未知原因'}`)
        return
      }
      entry.stream = stream
      this.sendStatus(opts.termId, sessionId, 'connected')
      stream.on('data', (d: Buffer) => this.sendData(opts.termId, d))
      stream.stderr.on('data', (d: Buffer) => this.sendData(opts.termId, d))
      stream.on('close', () => {
        this.releaseLive(entry)
        this.sendStatus(opts.termId, sessionId, 'disconnected')
      })
    })
  }

  /** 跳板不许转发时，只给终端在跳板里再登录一次。这条没有 SSH 会话，文件树用不上。 */
  private openJumpShell(
    entry: TermEntry,
    opts: TermCreateOptions,
    session: SessionConfig,
    secret: string | null,
    jumpSecret: string | null
  ): void {
    const client = new Client()
    entry.client = client
    client
      .on('error', (err) => {
        this.releaseLive(entry)
        this.sendStatus(opts.termId, session.id, 'error', err.message)
      })
      .on('close', () => {
        this.releaseLive(entry)
        this.sendStatus(opts.termId, session.id, 'disconnected')
      })
    try {
      entry.jump = dialSsh(session, secret, jumpSecret, client, {
        cols: opts.cols,
        rows: opts.rows,
        onJumpShell: (stream) => {
          entry.stream = stream
          this.sendStatus(opts.termId, session.id, 'connected')
          stream.on('data', (d: Buffer) => this.sendData(opts.termId, d))
          stream.stderr.on('data', (d: Buffer) => this.sendData(opts.termId, d))
          stream.on('close', () => {
            this.releaseLive(entry)
            this.sendStatus(opts.termId, session.id, 'disconnected')
          })
        }
      })
    } catch (e) {
      this.releaseLive(entry)
      this.sendStatus(opts.termId, session.id, 'error', e instanceof Error ? e.message : String(e))
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

    const prior = this.terms.get(opts.termId)
    const entry: TermEntry = prior ?? {
      id: opts.termId,
      sessionId: null,
      kind: 'local',
      title: opts.title?.trim() || '窗口',
      remark: ''
    }
    if (!prior) {
      this.terms.set(opts.termId, entry)
      this.persist(entry)
    }

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
        if (this.parking) return
        this.sendStatus(opts.termId, null, 'disconnected')
        this.close(opts.termId)
      })
    } catch (e) {
      this.sendStatus(opts.termId, null, 'error', e instanceof Error ? e.message : String(e))
    }
  }

  // ------------------------------------------------------------- events

  private sendMeta(term: TermEntry): void {
    const wc = this.getSender()
    if (!wc || wc.isDestroyed()) return
    const payload: TermMetaEvent = { termId: term.id, title: term.title, remark: term.remark }
    wc.send(IPC.termMeta, payload)
  }

  private sendData(termId: string, data: Buffer): void {
    const prev = this.output.get(termId) ?? ''
    const next = prev + data.toString('utf8')
    this.output.set(termId, next.length > 100_000 ? next.slice(-100_000) : next)
    this.scheduleFlush(termId)
    if (this.viewReady.has(termId)) this.push(termId, data)
  }

  private hydrate(): void {
    for (const saved of this.storage.listOpenTerms()) {
      if (saved.kind === 'ssh' && !this.storage.list().some((session) => session.id === saved.sessionId)) {
        this.storage.forgetOpenTerm(saved.id)
        continue
      }
      this.terms.set(saved.id, {
        id: saved.id,
        sessionId: saved.sessionId,
        kind: saved.kind,
        title: saved.title,
        remark: saved.remark
      })
      if (saved.scrollback) this.output.set(saved.id, saved.scrollback)
      this.lastStatus.set(saved.id, {
        termId: saved.id,
        sessionId: saved.sessionId,
        status: 'disconnected'
      })
    }
  }

  private persist(term: TermEntry): void {
    this.storage.saveOpenTerm({
      id: term.id,
      sessionId: term.sessionId,
      kind: term.kind,
      title: term.title,
      remark: term.remark
    })
  }

  private scheduleFlush(termId: string): void {
    if (this.flushTimers.has(termId)) return
    this.flushTimers.set(
      termId,
      setTimeout(() => {
        this.flushTimers.delete(termId)
        this.flush(termId)
      }, 800)
    )
  }

  private flush(termId: string): void {
    const text = this.output.get(termId)
    if (text === undefined) return
    this.storage.saveTermScrollback(termId, text)
  }

  private releaseLive(term: TermEntry | undefined): void {
    if (!term) return
    const stream = term.stream
    const release = term.release
    const client = term.client
    const jump = term.jump
    const ptyProc = term.ptyProc
    term.stream = undefined
    term.release = undefined
    term.client = undefined
    term.jump = undefined
    term.ptyProc = undefined
    try {
      stream?.close()
      if (release) release()
      else client?.end()
      endJump(jump)
      ptyProc?.kill()
    } catch {
      /* 断开阶段的异常忽略 */
    }
  }

  private push(termId: string, data: Buffer): void {
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

function isForwardDenied(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('跳板无法转到目标机')
}
