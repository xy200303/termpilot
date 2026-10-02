import type { ClientChannel } from 'ssh2'
import type { IPty } from 'node-pty'
import type { ByteTransport } from './index'

/**
 * 一扇终端背后的活动通道。本地 PTY、SSH shell、Telnet、串口都归一成这个形状：
 * 写数据、改窗口大小（字节流协议没有窗口尺寸一说，可不实现）、关闭。
 * 数据下行和状态事件在创建通道时各自接线，都汇进 TerminalService 的 sendData / sendStatus。
 *
 * close 只关这扇终端的数据通路；共享连接的池引用（SSH 池、字节流池）
 * 由 TermEntry.release 单独交还，两者互不知道对方。
 */
export interface TerminalChannel {
  write(data: string | Buffer): void
  resize?(cols: number, rows: number): void
  close(): void
}

/** SSH shell 通道。 */
export function sshChannel(stream: ClientChannel): TerminalChannel {
  return {
    write: (data) => stream.write(data),
    resize: (cols, rows) => stream.setWindow(rows, cols, 0, 0),
    close: () => {
      try {
        stream.close()
      } catch {
        /* 已经断了 */
      }
    }
  }
}

/** 本机终端（node-pty）。 */
export function ptyChannel(proc: IPty): TerminalChannel {
  return {
    write: (data) => proc.write(typeof data === 'string' ? data : data.toString('utf8')),
    resize: (cols, rows) => proc.resize(cols, rows),
    close: () => {
      try {
        proc.kill()
      } catch {
        /* 已经退出 */
      }
    }
  }
}

/** Telnet / 串口的字节流。close 不关共享传输，池引用归零时池自己断开。 */
export function transportChannel(transport: ByteTransport): TerminalChannel {
  return {
    write: (data) => transport.write(data),
    close: () => undefined
  }
}
