import { createRequire } from 'node:module'
import { join } from 'node:path'
import type { ByteTransport } from './index'
import { SERIAL_DEFAULTS, type ProtocolCapabilities, type SerialParity } from '../../../shared/protocol'

/**
 * serialport 是原生模块（@serialport/bindings-cpp，N-API prebuilds 覆盖
 * win32 / darwin / linux）。和 node-pty 一样用 createRequire 动态加载并兜底：
 * 加载失败时其余协议不受影响，只有串口功能报友好错误。
 */
let serialport: typeof import('serialport') | null = null
let serialportLoadError: string | null = null
try {
  const req = createRequire(join(__dirname, 'require-shim.js'))
  serialport = req('serialport') as typeof import('serialport')
} catch (e) {
  serialportLoadError = e instanceof Error ? e.message : String(e)
  console.error('[TermPilot] serialport 加载失败（串口不可用）:', serialportLoadError)
}

/** 本机可用串口，给 MCP 的 serial_list 探路用。 */
export interface SerialPortInfo {
  path: string
  manufacturer?: string
  serialNumber?: string
  friendlyName?: string
}

export async function listSerialPorts(): Promise<SerialPortInfo[]> {
  if (!serialport) throw new Error(`串口功能不可用: ${serialportLoadError ?? 'serialport 未安装'}`)
  const ports = await serialport.SerialPort.list()
  return ports.map((port) => ({
    path: port.path,
    manufacturer: port.manufacturer || undefined,
    serialNumber: port.serialNumber || undefined,
    friendlyName: port.friendlyName || undefined
  }))
}

export interface SerialOptions {
  path: string
  baudRate?: number
  dataBits?: number
  stopBits?: number
  parity?: SerialParity
}

/** 串口传输：serialport 包的一条字节流。没有 resize，没有并发。 */
export class SerialTransport implements ByteTransport {
  readonly protocol = 'serial' as const
  readonly capabilities: ProtocolCapabilities = { pty: true, exec: false, sftp: false, concurrent: false }

  private port: import('serialport').SerialPort | null = null
  private dataCb: ((data: Buffer) => void) | null = null
  private closeCb: (() => void) | null = null
  private errorCb: ((error: Error) => void) | null = null

  constructor(private options: SerialOptions) {}

  dial(): Promise<void> {
    if (!serialport) return Promise.reject(new Error(`串口功能不可用: ${serialportLoadError ?? 'serialport 未安装'}`))
    const path = this.options.path.trim()
    if (!path) return Promise.reject(new Error('串口连接需要设备路径（COM3 / /dev/ttyUSB0）。先用 serial_list 看本机有哪些串口'))
    return new Promise((resolve, reject) => {
      const dataBits = this.options.dataBits
      const stopBits = this.options.stopBits
      const port = new serialport!.SerialPort({
        path,
        baudRate: this.options.baudRate ?? SERIAL_DEFAULTS.baudRate,
        dataBits: dataBits === 5 || dataBits === 6 || dataBits === 7 || dataBits === 8 ? dataBits : SERIAL_DEFAULTS.dataBits,
        stopBits: stopBits === 1 || stopBits === 2 ? stopBits : SERIAL_DEFAULTS.stopBits,
        parity: this.options.parity ?? SERIAL_DEFAULTS.parity,
        autoOpen: false
      })
      this.port = port
      port.on('data', (data: Buffer) => this.dataCb?.(data))
      port.on('close', () => this.closeCb?.())
      port.on('error', (error) => this.errorCb?.(error))
      port.open((error) => {
        if (error) {
          reject(new Error(`打不开串口 ${path}: ${error.message}`))
          return
        }
        resolve()
      })
    })
  }

  write(data: string | Buffer): void {
    this.port?.write(typeof data === 'string' ? data : new Uint8Array(data))
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
    const port = this.port
    this.port = null
    try {
      if (port?.isOpen) port.close()
      else port?.destroy()
    } catch {
      /* 已经断了 */
    }
  }
}
