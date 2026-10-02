import type { SessionConfig } from '../../../shared/types'
import { capabilitiesOf, type ProtocolCapabilities, type SessionProtocol } from '../../../shared/protocol'
import { TelnetTransport } from './telnet'
import { SerialTransport } from './serial'

/**
 * 一条拨出去的字节流。Telnet 和串口只有这个：
 * 没有 exec 通道、没有 SFTP、没有并发通道，能力在 capabilities 上声明。
 * SSH 不实现这个接口——它有 ssh2 的完整通道模型（见 SshPool），
 * 但对外声明同一组能力（capabilitiesOf），MCP 工具按能力降级。
 */
export interface ByteTransport {
  readonly protocol: SessionProtocol
  readonly capabilities: ProtocolCapabilities
  /** 拨号。成功之后 onData 才会来数据。 */
  dial(): Promise<void>
  write(data: string | Buffer): void
  onData(cb: (data: Buffer) => void): void
  onClose(cb: () => void): void
  onError(cb: (error: Error) => void): void
  close(): void
}

/** 从会话配置拨一条字节流。仅 Telnet / 串口走这里，SSH 仍走 SshPool。 */
export function dialTransport(session: SessionConfig): ByteTransport {
  if (session.protocol === 'telnet') {
    return new TelnetTransport(session.host.trim(), session.port || 23)
  }
  if (session.protocol === 'serial') {
    return new SerialTransport({
      path: session.serialPath?.trim() ?? '',
      baudRate: session.baudRate,
      dataBits: session.dataBits,
      stopBits: session.stopBits,
      parity: session.parity
    })
  }
  throw new Error(`${session.protocol ?? 'ssh'} 不是字节流协议`)
}

interface Slot {
  transport: ByteTransport
  refs: number
  ready: Promise<void>
}

/** 字节流协议持有的一个引用。最后一次 release 才真正断开。 */
export interface TransportHold {
  transport: ByteTransport
  release: () => void
}

/**
 * 字节流连接池：同一台设备只拨一次（串口本来就只能开一个句柄），
 * 多扇终端共享同一条字节流，引用计数归零才断开。
 */
export class TransportPool {
  private slots = new Map<string, Slot>()

  acquire(session: SessionConfig): Promise<TransportHold> {
    const existing = this.slots.get(session.id)
    if (existing) {
      existing.refs += 1
      const hold = this.hold(session.id, existing)
      return existing.ready.then(() => hold).catch((error: unknown) => {
        hold.release()
        throw error
      })
    }

    const transport = dialTransport(session)
    let resolveReady: () => void = () => undefined
    let rejectReady: (error: Error) => void = () => undefined
    const slot: Slot = {
      transport,
      refs: 1,
      ready: new Promise<void>((resolve, reject) => {
        resolveReady = resolve
        rejectReady = reject
      })
    }
    this.slots.set(session.id, slot)

    transport.onClose(() => {
      if (this.slots.get(session.id) === slot) this.slots.delete(session.id)
    })
    transport
      .dial()
      .then(() => resolveReady())
      .catch((error: unknown) => {
        if (this.slots.get(session.id) === slot) this.slots.delete(session.id)
        rejectReady(error instanceof Error ? error : new Error(String(error)))
      })

    const hold = this.hold(session.id, slot)
    return slot.ready.then(() => hold).catch((error: unknown) => {
      hold.release()
      throw error
    })
  }

  private hold(sessionId: string, slot: Slot): TransportHold {
    let released = false
    return {
      transport: slot.transport,
      release: () => {
        if (released) return
        released = true
        slot.refs -= 1
        if (slot.refs > 0) return
        if (this.slots.get(sessionId) === slot) this.slots.delete(sessionId)
        try {
          slot.transport.close()
        } catch {
          /* 连接已经断了 */
        }
      }
    }
  }
}

export { capabilitiesOf }
export type { ProtocolCapabilities, SessionProtocol }
