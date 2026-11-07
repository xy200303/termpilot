import { createServer, type Server } from 'node:http'
import { connect as connectTcp, type Socket } from 'node:net'
import { connect as connectTls, type TLSSocket, type DetailedPeerCertificate } from 'node:tls'
import { randomUUID } from 'node:crypto'
import { WebSocketServer, WebSocket, type RawData } from 'ws'
import { TrafficMeter, type TrafficSnapshot } from './TrafficMeter'

const VERSION_1 = 3390
const TAG_SEQUENCE = 0x30
const TAG_INTEGER = 0x02
const TAG_OCTET_STRING = 0x04
const TAG_UTF8STRING = 0x0c

function derLength(length: number): Buffer {
  if (length < 0x80) return Buffer.from([length])
  const bytes: number[] = []
  let value = length
  while (value > 0) {
    bytes.unshift(value & 0xff)
    value >>= 8
  }
  return Buffer.from([0x80 | bytes.length, ...bytes])
}

function derWrap(tag: number, content: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), derLength(content.length), content])
}

function derInteger(value: number): Buffer {
  if (value === 0) return derWrap(TAG_INTEGER, Buffer.from([0]))
  const bytes: number[] = []
  let current = value
  while (current > 0) {
    bytes.unshift(current & 0xff)
    current >>= 8
  }
  if (bytes[0] & 0x80) bytes.unshift(0)
  return derWrap(TAG_INTEGER, Buffer.from(bytes))
}

function derContext(tag: number, content: Buffer): Buffer {
  return derWrap(0xa0 + tag, content)
}

function derUtf8(value: string): Buffer {
  return derWrap(TAG_UTF8STRING, Buffer.from(value, 'utf8'))
}

function derOctets(value: Buffer): Buffer {
  return derWrap(TAG_OCTET_STRING, value)
}

function readLength(buffer: Buffer, offset: number): { length: number; bytes: number } {
  const first = buffer[offset]
  if (first < 0x80) return { length: first, bytes: 1 }
  const count = first & 0x7f
  let length = 0
  for (let i = 0; i < count; i++) length = (length << 8) | buffer[offset + 1 + i]
  return { length, bytes: 1 + count }
}

function readTlv(buffer: Buffer, offset: number): { tag: number; value: Buffer; size: number } {
  const tag = buffer[offset]
  const { length, bytes } = readLength(buffer, offset + 1)
  const header = 1 + bytes
  return { tag, value: buffer.subarray(offset + header, offset + header + length), size: header + length }
}

function readChildren(buffer: Buffer): Array<{ tag: number; value: Buffer; size: number }> {
  const result: Array<{ tag: number; value: Buffer; size: number }> = []
  let offset = 0
  while (offset < buffer.length) {
    const tlv = readTlv(buffer, offset)
    result.push(tlv)
    offset += tlv.size
  }
  return result
}

function derNumber(buffer: Buffer): number {
  let value = 0
  for (const byte of buffer) value = (value << 8) | byte
  return value
}

function wsBytes(data: RawData): Buffer {
  if (Buffer.isBuffer(data)) return data
  if (typeof data === 'string') return Buffer.from(data)
  if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data))
  return Buffer.concat(data)
}

function parseRequest(data: Buffer): { destination: string; x224: Buffer } {
  const outer = readTlv(data, 0)
  if (outer.tag !== TAG_SEQUENCE) throw new Error('RDCleanPath 请求不是 ASN.1 SEQUENCE')
  let version = 0
  let destination = ''
  let x224: Buffer | null = null
  for (const child of readChildren(outer.value)) {
    const tag = child.tag & 0x1f
    if (tag === 0) version = derNumber(readTlv(child.value, 0).value)
    if (tag === 2) destination = readTlv(child.value, 0).value.toString('utf8')
    if (tag === 6) x224 = readTlv(child.value, 0).value
  }
  if (version !== VERSION_1) throw new Error(`不支持 RDCleanPath 版本 ${version}`)
  if (!destination || !x224) throw new Error('RDCleanPath 请求缺少目标或 X.224 数据')
  return { destination, x224 }
}

function response(server: string, x224: Buffer, certificates: Buffer[]): Buffer {
  const parts = [
    derContext(0, derInteger(VERSION_1)),
    derContext(6, derOctets(x224)),
    derContext(7, derWrap(TAG_SEQUENCE, Buffer.concat(certificates.map(derOctets)))),
    derContext(9, derUtf8(server))
  ]
  return derWrap(TAG_SEQUENCE, Buffer.concat(parts))
}

function errorResponse(): Buffer {
  const error = derWrap(TAG_SEQUENCE, derContext(0, derInteger(1)))
  return derWrap(TAG_SEQUENCE, Buffer.concat([derContext(0, derInteger(VERSION_1)), derContext(1, error)]))
}

function parseDestination(value: string): { host: string; port: number } {
  if (value.startsWith('[')) {
    const end = value.indexOf(']')
    if (end < 0) throw new Error(`IPv6 目标格式错误：${value}`)
    const port = value.slice(end + 1).startsWith(':') ? Number(value.slice(end + 2)) : 3389
    return { host: value.slice(1, end), port: port || 3389 }
  }
  const index = value.lastIndexOf(':')
  if (index < 0) return { host: value, port: 3389 }
  const port = Number(value.slice(index + 1))
  return { host: value.slice(0, index), port: Number.isInteger(port) ? port : 3389 }
}

function certificateChain(peer: DetailedPeerCertificate): Buffer[] {
  const result: Buffer[] = []
  const seen = new Set<string>()
  let current: DetailedPeerCertificate | undefined = peer
  while (current?.raw) {
    const fingerprint = current.fingerprint256
    if (seen.has(fingerprint)) break
    seen.add(fingerprint)
    result.push(Buffer.from(current.raw))
    if (!current.issuerCertificate || current.issuerCertificate === current) break
    current = current.issuerCertificate
  }
  return result
}

function handshake(host: string, port: number, x224: Buffer): Promise<{ response: Buffer; certificates: Buffer[]; socket: TLSSocket }> {
  return new Promise((resolve, reject) => {
    const socket = connectTcp({ host, port })
    socket.setTimeout(15_000, () => socket.destroy(new Error('连接 RDP 服务超时')))
    socket.once('error', reject)
    socket.once('connect', () => {
      socket.setTimeout(0)
      socket.write(x224)
    })
    socket.once('data', (response) => {
      const responseBuffer = Buffer.from(response)
      socket.removeAllListeners('error')
      socket.removeAllListeners('data')
      const tls = connectTls({ socket, servername: host, rejectUnauthorized: false }, () => {
        resolve({ response: responseBuffer, certificates: certificateChain(tls.getPeerCertificate(true)), socket: tls })
      })
      tls.once('error', reject)
    })
  })
}

/** RDP 的 RDCleanPath 代理。每个标签一个回环地址和一次性令牌。 */
export class RdpBridge {
  private http: Server | null = null
  private wss: WebSocketServer | null = null
  private remote: TLSSocket | null = null
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

  async open(): Promise<string> {
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
      wss.handleUpgrade(req, socket, head, (ws) => this.attach(ws))
    })
    await new Promise<void>((resolve, reject) => {
      http.once('error', reject)
      http.listen(0, '127.0.0.1', () => resolve())
    })
    const address = http.address()
    if (!address || typeof address === 'string') throw new Error('RDP 本地代理启动失败')
    return `ws://127.0.0.1:${address.port}/${this.viewId}?token=${this.token}`
  }

  private attach(ws: WebSocket): void {
    this.onStatus('connecting')
    ws.once('message', async (data) => {
      try {
        const request = parseRequest(wsBytes(data))
        const { host, port } = parseDestination(request.destination)
        const result = await handshake(host, port, request.x224)
        this.remote = result.socket
        ws.send(response(`${host}:${port}`, result.response, result.certificates))
        this.relay(ws, result.socket)
        this.onStatus('connected')
      } catch (error) {
        console.error('[RDP] bridge error', error)
        this.onStatus('error', error instanceof Error ? error.message : String(error))
        try {
          ws.send(errorResponse())
        } catch {
          // 连接已经关闭时只收尾
        }
        ws.close()
      }
    })
    ws.on('error', () => this.remote?.destroy())
  }

  private relay(ws: WebSocket, socket: TLSSocket): void {
    socket.setNoDelay(true)
    socket.on('data', (data) => {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data)
      this.traffic.addIn(buffer.length)
      this.outgoing.push(buffer)
      this.pump(ws, socket)
    })
    socket.on('close', () => {
      this.onStatus('disconnected')
      ws.close()
    })
    socket.on('error', () => ws.close())
    ws.on('message', (data) => {
      const buffer = wsBytes(data)
      this.traffic.addOut(buffer.length)
      if (!socket.destroyed) socket.write(buffer)
    })
    ws.on('close', () => socket.destroy())
    ws.on('error', () => socket.destroy())
  }

  private pump(ws: WebSocket, socket: TLSSocket): void {
    if (this.flushTimer || this.drainTimer) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      if (ws.readyState !== WebSocket.OPEN) {
        this.outgoing = []
        return
      }
      if (ws.bufferedAmount > RdpBridge.HIGH_WATER) {
        socket.pause()
        this.drainTimer = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            this.stopDrain()
            this.outgoing = []
            return
          }
          if (ws.bufferedAmount > RdpBridge.LOW_WATER) return
          this.stopDrain()
          socket.resume()
          if (this.outgoing.length > 0) this.pump(ws, socket)
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
    this.remote?.destroy()
    this.wss?.close()
    this.http?.close()
    this.remote = null
    this.wss = null
    this.http = null
  }
}
