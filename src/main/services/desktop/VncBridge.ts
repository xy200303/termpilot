import { createServer, type Server } from 'node:http'
import { connect, type Socket } from 'node:net'
import { randomUUID } from 'node:crypto'
import { WebSocketServer, WebSocket } from 'ws'
import { TrafficMeter, type TrafficSnapshot } from './TrafficMeter'

/** 一条 VNC 标签对应一个回环 WebSocket 桥。令牌只用于这一次连接。 */
export class VncBridge {
  private http: Server | null = null
  private wss: WebSocketServer | null = null
  private remote: Socket | null = null
  private client: WebSocket | null = null
  private readonly token = randomUUID()
  private readonly traffic = new TrafficMeter()
  private outgoing: Buffer[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private drainTimer: NodeJS.Timeout | null = null
  private static readonly HIGH_WATER = 8 * 1024 * 1024
  private static readonly LOW_WATER = 1024 * 1024

  constructor(
    private readonly viewId: string,
    private readonly onStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'error', message?: string) => void
  ) {}

  get url(): string | null {
    const address = this.http?.address()
    if (!address || typeof address === 'string') return null
    return `ws://127.0.0.1:${address.port}/${this.viewId}?token=${this.token}`
  }

  metrics(): TrafficSnapshot {
    return this.traffic.snapshot()
  }

  async open(host: string, port: number): Promise<string> {
    const http = createServer()
    const wss = new WebSocketServer({ noServer: true })
    this.http = http
    this.wss = wss

    http.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url ?? '/', 'ws://127.0.0.1')
      if (url.pathname !== `/${this.viewId}` || url.searchParams.get('token') !== this.token) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
        socket.destroy()
        return
      }
      wss.handleUpgrade(req, socket, head, (ws) => this.attach(ws, host, port))
    })

    await new Promise<void>((resolve, reject) => {
      http.once('error', reject)
      http.listen(0, '127.0.0.1', () => resolve())
    })
    const address = http.address()
    if (!address || typeof address === 'string') throw new Error('VNC 本地桥接启动失败')
    return `ws://127.0.0.1:${address.port}/${this.viewId}?token=${this.token}`
  }

  private attach(ws: WebSocket, host: string, port: number): void {
    this.client = ws
    this.onStatus('connecting')
    const remote = connect({ host, port })
    this.remote = remote
    remote.setTimeout(15_000, () => remote.destroy(new Error('连接 VNC 服务超时')))

    remote.on('connect', () => {
      remote.setTimeout(0)
      remote.setNoDelay(true)
      this.onStatus('connected')
    })
    remote.on('data', (data) => {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data)
      this.traffic.addIn(buffer.length)
      this.outgoing.push(buffer)
      this.pump(ws, remote)
    })
    remote.on('error', (error) => {
      this.onStatus('error', `VNC 连接失败：${error.message}`)
      ws.close()
    })
    remote.on('close', () => {
      this.onStatus('disconnected')
      ws.close()
    })

    ws.on('message', (data) => {
      const buffer = Array.isArray(data) ? Buffer.concat(data) : Buffer.isBuffer(data) ? data : Buffer.from(data)
      this.traffic.addOut(buffer.length)
      if (!remote.destroyed) remote.write(buffer)
    })
    ws.on('close', () => remote.destroy())
    ws.on('error', () => remote.destroy())
  }

  private pump(ws: WebSocket, remote: Socket): void {
    if (this.flushTimer || this.drainTimer) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      if (ws.readyState !== WebSocket.OPEN) {
        this.outgoing = []
        return
      }
      if (ws.bufferedAmount > VncBridge.HIGH_WATER) {
        remote.pause()
        this.drainTimer = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            this.stopDrain()
            this.outgoing = []
            return
          }
          if (ws.bufferedAmount > VncBridge.LOW_WATER) return
          this.stopDrain()
          remote.resume()
          if (this.outgoing.length > 0) this.pump(ws, remote)
        }, 20)
        return
      }
      const chunks = this.outgoing
      this.outgoing = []
      if (chunks.length > 0) ws.send(Buffer.concat(chunks))
    }, 2)
  }

  private stopDrain(): void {
    if (this.drainTimer) clearInterval(this.drainTimer)
    this.drainTimer = null
  }

  close(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer)
    this.flushTimer = null
    this.stopDrain()
    this.outgoing = []
    this.client?.close()
    this.remote?.destroy()
    this.wss?.close()
    this.http?.close()
    this.client = null
    this.remote = null
    this.wss = null
    this.http = null
  }
}
