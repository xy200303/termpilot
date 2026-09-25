import { newTermId } from '../../shared/ids'
import net from 'node:net'
import type { WebContents } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import type { ReverseIncoming, ReverseListenState, TermStatusEvent } from '../../shared/types'

interface PendingConn {
  sessionId: string
  socket: net.Socket
  /** 渲染进程尚未挂上 xterm 时先缓存，避免丢开机横幅 */
  buffer: Buffer[]
  bound: boolean
}

/**
 * 反向 shell 监听。
 * 只绑定 127.0.0.1：公网暴露交给 cpolar 等外部穿透，本工具不自己做端口映射。
 * 远端连入后，字节流直接接到对应终端标签。
 */
export class ReverseListenerService {
  private servers = new Map<string, { server: net.Server; port: number }>()
  private conns = new Map<string, PendingConn>()

  constructor(private getSender: () => WebContents | null) {}

  start(sessionId: string, port: number): void {
    if (this.servers.has(sessionId)) return
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      this.emitState({ sessionId, listening: false, port, peers: 0, error: '端口无效' })
      return
    }

    const server = net.createServer((socket) => this.accept(sessionId, socket))
    server.on('error', (err) => {
      this.servers.delete(sessionId)
      this.emitState({
        sessionId,
        listening: false,
        port,
        peers: this.peerCount(sessionId),
        error: err.message
      })
    })
    server.listen(port, '127.0.0.1', () => {
      this.servers.set(sessionId, { server, port })
      this.emitState({ sessionId, listening: true, port, peers: 0 })
    })
  }

  stop(sessionId: string): void {
    const rec = this.servers.get(sessionId)
    this.servers.delete(sessionId)
    rec?.server.close()
    for (const [termId, conn] of this.conns) {
      if (conn.sessionId === sessionId) {
        conn.socket.destroy()
        this.conns.delete(termId)
        this.emitStatus(termId, sessionId, 'disconnected')
      }
    }
    this.emitState({
      sessionId,
      listening: false,
      port: rec?.port ?? 0,
      peers: 0
    })
  }

  /** 渲染进程的 xterm 已订阅数据后再放行缓存 */
  bind(termId: string): void {
    const conn = this.conns.get(termId)
    if (!conn || conn.bound) return
    conn.bound = true
    for (const chunk of conn.buffer) this.emitData(termId, chunk)
    conn.buffer = []
    this.emitStatus(termId, conn.sessionId, 'connected')
  }

  input(termId: string, data: string): boolean {
    const conn = this.conns.get(termId)
    if (!conn) return false
    conn.socket.write(data)
    return true
  }

  close(termId: string): boolean {
    const conn = this.conns.get(termId)
    if (!conn) return false
    conn.socket.destroy()
    this.conns.delete(termId)
    this.emitState({
      sessionId: conn.sessionId,
      listening: this.servers.has(conn.sessionId),
      port: this.servers.get(conn.sessionId)?.port ?? 0,
      peers: this.peerCount(conn.sessionId)
    })
    return true
  }

  disposeAll(): void {
    for (const id of [...this.servers.keys()]) this.stop(id)
  }

  private accept(sessionId: string, socket: net.Socket): void {
    const termId = newTermId()
    const conn: PendingConn = { sessionId, socket, buffer: [], bound: false }
    this.conns.set(termId, conn)

    socket.on('data', (chunk: Buffer | string) => {
      const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
      if (!conn.bound) {
        conn.buffer.push(buf)
        return
      }
      this.emitData(termId, buf)
    })
    socket.on('close', () => {
      this.conns.delete(termId)
      this.emitStatus(termId, sessionId, 'disconnected')
      const rec = this.servers.get(sessionId)
      this.emitState({
        sessionId,
        listening: Boolean(rec),
        port: rec?.port ?? 0,
        peers: this.peerCount(sessionId)
      })
    })
    socket.on('error', () => socket.destroy())

    const peer = `${socket.remoteAddress ?? '?'}:${socket.remotePort ?? '?'}`
    const payload: ReverseIncoming = { sessionId, termId, peer }
    this.send(IPC.reverseIncoming, payload)
    const rec = this.servers.get(sessionId)
    this.emitState({
      sessionId,
      listening: true,
      port: rec?.port ?? 0,
      peers: this.peerCount(sessionId)
    })
  }

  private peerCount(sessionId: string): number {
    let n = 0
    for (const c of this.conns.values()) if (c.sessionId === sessionId) n++
    return n
  }

  private emitData(termId: string, data: Buffer): void {
    this.send(IPC.termData, { termId, data })
  }

  private emitStatus(
    termId: string,
    sessionId: string,
    status: TermStatusEvent['status'],
    error?: string
  ): void {
    const payload: TermStatusEvent = { termId, sessionId, status, error }
    this.send(IPC.termStatus, payload)
  }

  private emitState(state: ReverseListenState): void {
    this.send(IPC.reverseState, state)
  }

  private send(channel: string, payload: unknown): void {
    const wc = this.getSender()
    if (!wc || wc.isDestroyed()) return
    wc.send(channel, payload)
  }
}
