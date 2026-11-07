/**
 * 连接协议与能力模型。
 * SSH 是全能终端协议；Telnet 和串口只有终端字节流。
 * RDP / VNC 是两种独立的图形桌面协议，不属于终端字节流。
 */
export type SessionProtocol = 'ssh' | 'telnet' | 'serial' | 'rdp' | 'vnc'
export type DesktopProtocol = 'rdp' | 'vnc'

export interface ProtocolCapabilities {
  /** 是否有终端字节流。 */
  pty: boolean
  /** 是否有图形桌面。 */
  desktop: boolean
  /** 独立 exec 通道（stdout/stderr 分流、协议级退出码）。仅 SSH。 */
  exec: boolean
  /** 文件传输。仅 SSH。 */
  sftp: boolean
  /** 同一条连接上能否开多个并发通道。仅 SSH。 */
  concurrent: boolean
}

const SSH_CAPABILITIES: ProtocolCapabilities = { pty: true, desktop: false, exec: true, sftp: true, concurrent: true }
const STREAM_CAPABILITIES: ProtocolCapabilities = { pty: true, desktop: false, exec: false, sftp: false, concurrent: false }
const DESKTOP_CAPABILITIES: ProtocolCapabilities = { pty: false, desktop: true, exec: false, sftp: false, concurrent: false }

export function isDesktopProtocol(protocol: string | undefined): protocol is DesktopProtocol {
  return protocol === 'rdp' || protocol === 'vnc'
}

export function capabilitiesOf(protocol: SessionProtocol | undefined): ProtocolCapabilities {
  if (isDesktopProtocol(protocol)) return DESKTOP_CAPABILITIES
  return protocol === 'telnet' || protocol === 'serial' ? STREAM_CAPABILITIES : SSH_CAPABILITIES
}

/** 错误提示和界面里用的中文名。 */
export function protocolLabel(protocol: SessionProtocol | undefined): string {
  if (protocol === 'telnet') return 'Telnet'
  if (protocol === 'serial') return '串口'
  if (protocol === 'rdp') return 'RDP'
  if (protocol === 'vnc') return 'VNC'
  return 'SSH'
}

export function defaultPort(protocol: SessionProtocol | undefined): number {
  if (protocol === 'telnet') return TELNET_DEFAULT_PORT
  if (protocol === 'rdp') return RDP_DEFAULT_PORT
  if (protocol === 'vnc') return VNC_DEFAULT_PORT
  return 22
}

export type SerialParity = 'none' | 'even' | 'odd' | 'mark' | 'space'

export const SERIAL_DEFAULTS = {
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none' as SerialParity
}

export const TELNET_DEFAULT_PORT = 23
export const RDP_DEFAULT_PORT = 3389
export const VNC_DEFAULT_PORT = 5900
