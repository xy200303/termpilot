import { Socket } from 'node:net'
import type { ByteTransport } from './index'
import type { ProtocolCapabilities } from '../../../shared/protocol'

// Telnet 协议字节（RFC 854）
const IAC = 255
const DONT = 254
const DO = 253
const WONT = 252
const WILL = 251
const SB = 250
const SE = 240
// 选项号
const OPT_ECHO = 1
const OPT_SUPPRESS_GO_AHEAD = 3
const OPT_TERMINAL_TYPE = 24
const SB_TERMINAL_IS = 0
const SB_TERMINAL_SEND = 1

/**
 * Telnet 传输：net 裸 socket 加最小 IAC 协商。
 * 回绝绝大多数选项，只接受对端回显（ECHO）和抑制继续信号（SGA），
 * 并回应 TERMINAL-TYPE 询问（报 xterm-256color），老设备回绝后也能继续。
 * 登录是字节流里的人和 Agent 对话，这里不做自动登录。
 */
export class TelnetTransport implements ByteTransport {
  readonly protocol = 'telnet' as const
  readonly capabilities: ProtocolCapabilities = { pty: true, exec: false, sftp: false, concurrent: false }

  private socket: Socket | null = null
  private dataCb: ((data: Buffer) => void) | null = null
  private closeCb: (() => void) | null = null
  private errorCb: ((error: Error) => void) | null = null
  /** IAC 状态机残留的字节（跨数据块） */
  private pending: Buffer = Buffer.alloc(0)

  constructor(
    private host: string,
    private port: number
  ) {}

  dial(): Promise<void> {
    if (!this.host) return Promise.reject(new Error('Telnet 需要主机地址'))
    return new Promise((resolve, reject) => {
      const socket = new Socket()
      this.socket = socket
      let settled = false
      socket.once('connect', () => {
        settled = true
        resolve()
      })
      socket.on('error', (error) => {
        if (!settled) {
          settled = true
          reject(error)
          return
        }
        this.errorCb?.(error)
      })
      socket.on('data', (chunk: Buffer) => {
        const clean = this.filter(chunk)
        if (clean.length > 0) this.dataCb?.(clean)
      })
      socket.on('close', () => this.closeCb?.())
      socket.connect(this.port, this.host)
    })
  }

  write(data: string | Buffer): void {
    const bytes = typeof data === 'string' ? Buffer.from(data, 'utf8') : data
    // 数据里的 0xFF 要双写转义，否则对端当成 IAC
    const escaped = bytes.includes(IAC) ? Buffer.concat(splitEscape(bytes)) : bytes
    this.socket?.write(escaped)
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
    try {
      this.socket?.destroy()
    } catch {
      /* 已经断了 */
    }
    this.socket = null
  }

  /** 剥掉 IAC 协商序列并就地回话，返回真正属于画面的字节。 */
  private filter(chunk: Buffer): Buffer {
    const input = this.pending.length > 0 ? Buffer.concat([this.pending, chunk]) : chunk
    this.pending = Buffer.alloc(0)
    const out: number[] = []
    let i = 0
    while (i < input.length) {
      const byte = input[i]!
      if (byte !== IAC) {
        out.push(byte)
        i += 1
        continue
      }
      if (i + 1 >= input.length) {
        this.pending = input.subarray(i)
        break
      }
      const verb = input[i + 1]!
      if (verb === IAC) {
        // IAC IAC 就是一个 0xFF 数据字节
        out.push(IAC)
        i += 2
        continue
      }
      if (verb === SB) {
        // 子协商：找 IAC SE。跨块就先存起来等下一块。
        const end = findSubEnd(input, i + 2)
        if (end < 0) {
          this.pending = input.subarray(i)
          break
        }
        this.answerSub(input.subarray(i + 2, end))
        i = end + 2
        continue
      }
      if (verb === DO || verb === DONT || verb === WILL || verb === WONT) {
        if (i + 2 >= input.length) {
          this.pending = input.subarray(i)
          break
        }
        this.answer(verb, input[i + 2]!)
        i += 3
        continue
      }
      // 两字节命令（NOP、DM 等），直接丢掉
      i += 2
    }
    return Buffer.from(out)
  }

  /** 回绝一切，只接 ECHO、SGA 和 TERMINAL-TYPE（答应后会收到子协商询问）。 */
  private answer(verb: number, option: number): void {
    const socket = this.socket
    if (!socket) return
    if (verb === DO) {
      const accept = option === OPT_SUPPRESS_GO_AHEAD || option === OPT_TERMINAL_TYPE
      socket.write(Buffer.from([IAC, accept ? WILL : WONT, option]))
    } else if (verb === WILL) {
      const accept = option === OPT_ECHO || option === OPT_SUPPRESS_GO_AHEAD
      socket.write(Buffer.from([IAC, accept ? DO : DONT, option]))
    }
    // DONT / WONT 是对端在关选项，不用回话
  }

  /** TERMINAL-TYPE 问一次报一次 xterm-256color，其余子协商不回。 */
  private answerSub(body: Buffer): void {
    if (body[0] !== OPT_TERMINAL_TYPE || body[1] !== SB_TERMINAL_SEND) return
    const name = Buffer.from('xterm-256color', 'ascii')
    this.socket?.write(Buffer.concat([Buffer.from([IAC, SB, OPT_TERMINAL_TYPE, SB_TERMINAL_IS]), name, Buffer.from([IAC, SE])]))
  }
}

/** 找子协商的收尾 IAC SE，返回 IAC 的下标；没找到返回 -1。 */
function findSubEnd(input: Buffer, from: number): number {
  for (let i = from; i + 1 < input.length; i++) {
    if (input[i] !== IAC) continue
    if (input[i + 1] === SE) return i
    if (input[i + 1] === IAC) i += 1 // 转义的 0xFF
  }
  return -1
}

function splitEscape(bytes: Buffer): Buffer[] {
  const parts: Buffer[] = []
  let start = 0
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] !== IAC) continue
    parts.push(bytes.subarray(start, i + 1), Buffer.from([IAC]))
    start = i + 1
  }
  parts.push(bytes.subarray(start))
  return parts
}
