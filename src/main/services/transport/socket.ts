import type { Socket } from 'node:net'
import type { ByteTransport } from './index'
import type { ProtocolCapabilities } from '../../../shared/protocol'

/**
 * 反向监听接受进来的 socket，包成字节流交给 TerminalService 托管。
 * 对端连进来时就已经"拨号成功"，dial 直接就绪。
 * 反向 shell 也只有一条字节流：没有 exec 通道、没有 SFTP。
 *
 * 反向 shell 是裸管道，对端没有 PTY 的 ONLCR（\n → \r\n）翻译，
 * 直接交给 xterm 会画成阶梯（每行接着上一行的列往下走），这里补回车。
 */
export class SocketTransport implements ByteTransport {
  readonly protocol = 'reverse' as const
  readonly capabilities: ProtocolCapabilities = { pty: true, exec: false, sftp: false, concurrent: false }

  private dataCb: ((data: Buffer) => void) | null = null
  private closeCb: (() => void) | null = null
  private errorCb: ((error: Error) => void) | null = null
  /** 上一块数据的最后一个字节是 \r。跨块边界的 \r\n 不能再补。 */
  private lastByteCR = false

  constructor(private socket: Socket) {
    socket.on('data', (chunk: Buffer | string) => {
      const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
      this.dataCb?.(this.onlcr(buf))
    })
    socket.on('close', () => this.closeCb?.())
    socket.on('error', (error) => {
      this.errorCb?.(error)
      socket.destroy()
    })
  }

  /** 裸 \n（前面不是 \r）补成 \r\n，模拟 PTY 的 ONLCR。 */
  private onlcr(data: Buffer): Buffer {
    if (data.length === 0) return data
    const enterCR = this.lastByteCR
    this.lastByteCR = data[data.length - 1] === 0x0d
    let prevCR = enterCR
    let extra = 0
    for (const b of data) {
      if (b === 0x0a && !prevCR) extra += 1
      prevCR = b === 0x0d
    }
    if (extra === 0) return data
    const out = Buffer.allocUnsafe(data.length + extra)
    prevCR = enterCR
    let j = 0
    for (const b of data) {
      if (b === 0x0a && !prevCR) out[j++] = 0x0d
      out[j++] = b
      prevCR = b === 0x0d
    }
    return out
  }

  dial(): Promise<void> {
    return Promise.resolve()
  }

  write(data: string | Buffer): void {
    this.socket.write(data)
  }

  onData(cb: (data: Buffer) => void): void {
    this.dataCb = cb
  }

  onClose(cb: () => void): void {
    this.closeCb = cb
  }

  onError(cb: (error: Error) => void): void {
    this.errorCb = cb
  }

  close(): void {
    this.socket.destroy()
  }
}
