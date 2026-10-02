import type { Socket } from 'node:net'
import type { ByteTransport } from './index'
import type { ProtocolCapabilities } from '../../../shared/protocol'

/**
 * 反向监听接受进来的 socket，包成字节流交给 TerminalService 托管。
 * 对端连进来时就已经"拨号成功"，dial 直接就绪。
 * 反向 shell 也只有一条字节流：没有 exec 通道、没有 SFTP。
 */
export class SocketTransport implements ByteTransport {
  readonly protocol = 'reverse' as const
  readonly capabilities: ProtocolCapabilities = { pty: true, exec: false, sftp: false, concurrent: false }

  private dataCb: ((data: Buffer) => void) | null = null
  private closeCb: (() => void) | null = null
  private errorCb: ((error: Error) => void) | null = null

  constructor(private socket: Socket) {
    socket.on('data', (chunk: Buffer | string) => {
      const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
      this.dataCb?.(buf)
    })
    socket.on('close', () => this.closeCb?.())
    socket.on('error', (error) => {
      this.errorCb?.(error)
      socket.destroy()
    })
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
