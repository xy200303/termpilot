export interface DesktopClickInput {
  x: number
  y: number
  button?: 'left' | 'middle' | 'right'
  double?: boolean
}

export interface DesktopKeyInput {
  /** 例如 enter、ctrl-c、ctrl-shift-t、alt-tab */
  keys: string
}

export interface DesktopTypeInput {
  text: string
}

export interface DesktopScrollInput {
  x?: number
  y?: number
  deltaY: number
}

export interface DesktopWaitInput {
  /** 固定等待毫秒，默认 500。 */
  ms?: number
  /** 画面连续稳定多少毫秒后返回；0 表示不检查。 */
  stableMs?: number
  /** 稳定等待的超时时间，默认 10000。 */
  timeoutMs?: number
}

export type DesktopAgentInput =
  | { action: 'screenshot'; grid?: boolean | number }
  | ({ action: 'click' } & DesktopClickInput)
  | ({ action: 'key' } & DesktopKeyInput)
  | ({ action: 'type' } & DesktopTypeInput)
  | ({ action: 'scroll' } & DesktopScrollInput)
  | ({ action: 'wait' } & DesktopWaitInput)

export interface DesktopAgentReply {
  id: string
  error?: string
  pngBase64?: string
  note?: string
}
