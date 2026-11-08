import { createRequire } from 'node:module'
import { t as mt } from '../../i18n'
import { join } from 'node:path'
import type { ByteTransport } from './index'
import { SERIAL_DEFAULTS, type ProtocolCapabilities, type SerialParity } from '../../../shared/protocol'
import type { SerialPortInfo } from '../../../shared/types'

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
  console.error(mt('serial.load_failed'), serialportLoadError)
}

/** 本机可用串口，给 GUI 连接表单和 MCP 的 serial_list 探路用。 */
export async function listSerialPorts(): Promise<SerialPortInfo[]> {
  if (!serialport) throw new Error(mt('serial.unavailable', { reason: serialportLoadError ?? mt('serial.not_installed') }))
  const ports = await serialport.SerialPort.list()
  const listed = ports.map((port) => ({
    path: port.path,
    manufacturer: port.manufacturer || undefined,
    serialNumber: port.serialNumber || undefined,
    friendlyName: port.friendlyName || undefined
  }))
  /* 测试用：TERMPILOT_SERIAL_MOCK=1 时额外列出一个虚拟串口 */
  if (process.env.TERMPILOT_SERIAL_MOCK === '1') {
    listed.push({ path: 'MOCK', manufacturer: 'TermPilot mock', serialNumber: undefined, friendlyName: 'Mock serial port' })
  }
  return listed
}

/**
 * 测试用串口：开启 TERMPILOT_SERIAL_MOCK 后，路径 MOCK 走 serialport 的 MockBinding，
 * 写进去的字节会原样回读，用来在没有真实设备时验证串口终端链路。
 */
function openPort(
  lib: typeof import('serialport'),
  path: string,
  options: { baudRate: number; dataBits: number; stopBits: number; parity: SerialParity }
): import('serialport').SerialPort {
  if (process.env.TERMPILOT_SERIAL_MOCK === '1' && path.toUpperCase() === 'MOCK') {
    const req = createRequire(join(__dirname, 'require-shim.js'))
    const mock = req('@serialport/binding-mock') as {
      MockBinding: { reset(): void; createPort(path: string, options?: { echo?: boolean; record?: boolean }): unknown }
    }
    mock.MockBinding.reset()
    mock.MockBinding.createPort('MOCK', { echo: true, record: false })
    return new lib.SerialPortMock({ path: 'MOCK', ...options, autoOpen: false }) as unknown as import('serialport').SerialPort
  }
  return new lib.SerialPort({ path, ...options, autoOpen: false })
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
  readonly capabilities: ProtocolCapabilities = { pty: true, desktop: false, exec: false, sftp: false, concurrent: false }

  private port: import('serialport').SerialPort | null = null
  private dataCb: ((data: Buffer) => void) | null = null
  private closeCb: (() => void) | null = null
  private errorCb: ((error: Error) => void) | null = null

  constructor(private options: SerialOptions) {}

  dial(): Promise<void> {
    if (!serialport) return Promise.reject(new Error(mt('serial.unavailable', { reason: serialportLoadError ?? mt('serial.not_installed') })))
    const path = this.options.path.trim()
    if (!path) return Promise.reject(new Error(mt('serial.need_path')))
    return new Promise((resolve, reject) => {
      const dataBits = this.options.dataBits
      const stopBits = this.options.stopBits
      const port = openPort(serialport!, path, {
        baudRate: this.options.baudRate ?? SERIAL_DEFAULTS.baudRate,
        dataBits: dataBits === 5 || dataBits === 6 || dataBits === 7 || dataBits === 8 ? dataBits : SERIAL_DEFAULTS.dataBits,
        stopBits: stopBits === 1 || stopBits === 2 ? stopBits : SERIAL_DEFAULTS.stopBits,
        parity: this.options.parity ?? SERIAL_DEFAULTS.parity
      })
      this.port = port
      port.on('data', (data: Buffer) => this.dataCb?.(data))
      port.on('close', () => this.closeCb?.())
      port.on('error', (error) => this.errorCb?.(error))
      port.open((error) => {
        if (error) {
          reject(new Error(mt('serial.open_failed', { path, message: error.message })))
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
