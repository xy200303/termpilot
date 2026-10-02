/**
 * 连接协议与能力模型。
 * SSH 是全能协议：终端、exec 通道、SFTP、并发通道都有。
 * Telnet 和串口只有一条字节流：没有 exec、没有 SFTP、没有并发通道，
 * 五个屏幕族工具（term_pty / term_write / term_read / term_lines / term_screenshot）
 * 对三种协议行为一致。
 */
export type SessionProtocol = 'ssh' | 'telnet' | 'serial'

export interface ProtocolCapabilities {
  /** 终端字节流。所有协议都有。 */
  pty: true
  /** 独立 exec 通道（stdout/stderr 分流、协议级退出码）。仅 SSH。 */
  exec: boolean
  /** 文件传输。仅 SSH。 */
  sftp: boolean
  /** 同一条连接上能否开多个并发通道。仅 SSH。 */
  concurrent: boolean
}

const SSH_CAPABILITIES: ProtocolCapabilities = { pty: true, exec: true, sftp: true, concurrent: true }
const STREAM_CAPABILITIES: ProtocolCapabilities = { pty: true, exec: false, sftp: false, concurrent: false }

export function capabilitiesOf(protocol: SessionProtocol | undefined): ProtocolCapabilities {
  return protocol === 'telnet' || protocol === 'serial' ? STREAM_CAPABILITIES : SSH_CAPABILITIES
}

/** 错误提示和界面里用的中文名。 */
export function protocolLabel(protocol: SessionProtocol | undefined): string {
  if (protocol === 'telnet') return 'Telnet'
  if (protocol === 'serial') return '串口'
  return 'SSH'
}

export type SerialParity = 'none' | 'even' | 'odd' | 'mark' | 'space'

export const SERIAL_DEFAULTS = {
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none' as SerialParity
}

export const TELNET_DEFAULT_PORT = 23
