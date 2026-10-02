import net from 'node:net'
import type { WebContents } from 'electron'
import { newTermId } from '../../shared/ids'
import { IPC } from '../../shared/ipc-channels'
import type { ReverseIncoming, ReverseListenState, TermStatusEvent } from '../../shared/types'
import type { TerminalService } from './TerminalService'
import { SocketTransport } from './transport'

/**
 * 反向 shell 监听。
 * 只绑定 127.0.0.1：公网暴露交给 cpolar 等外部穿透，本工具不自己做端口映射。
 * 远端连入后，socket 包成 SocketTransport 交给 TerminalService 收编成普通终端：
 * 反向终端和 SSH / Telnet / 串口走同一套数据通路，MCP 的屏幕族工具也能用。
 */
export class ReverseListenerService {
  private servers = new Map<string, { server: net.Server; port: number }>()
  /** termId -> sessionId。只用来数在线对端和停监听时批量断开。 */
  private peers = new Map<string, string>()

  constructor(
    private terminal: TerminalService,
    private getSender: () => WebContents | null
  ) {}

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
    // 关终端会带着断开 socket，onClosed 回调里再清理 peers
    for (const [termId, sid] of [...this.peers]) {
      if (sid !== sessionId) continue
      this.terminal.close(termId)
      // TerminalService.close 静默移除，界面上把标签状态补成已断开
      this.send(IPC.termStatus, { termId, sessionId, status: 'disconnected' } satisfies TermStatusEvent)
    }
    this.emitState({
      sessionId,
      listening: false,
      port: rec?.port ?? 0,
      peers: 0
    })
  }

  disposeAll(): void {
    for (const id of [...this.servers.keys()]) this.stop(id)
  }

  private accept(sessionId: string, socket: net.Socket): void {
    const termId = newTermId()
    this.peers.set(termId, sessionId)
    const peer = `${socket.remoteAddress ?? '?'}:${socket.remotePort ?? '?'}`

    this.terminal.adoptStream(termId, sessionId, new SocketTransport(socket), {
      remark: peer,
      onClosed: () => {
        if (!this.peers.delete(termId)) return
        const rec = this.servers.get(sessionId)
        this.emitState({
          sessionId,
          listening: Boolean(rec),
          port: rec?.port ?? 0,
          peers: this.peerCount(sessionId)
        })
      }
    })

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
    for (const sid of this.peers.values()) if (sid === sessionId) n++
    return n
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
