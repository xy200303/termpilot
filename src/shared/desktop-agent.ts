/** 截图时的画面尺寸；和当前尺寸不同时，坐标按比例换算。 */
export interface DesktopScaleSource {
  fromWidth?: number
  fromHeight?: number
  /** desktop_screenshot 返回的截图编号，点击时按这张图的坐标空间换算。 */
  shotId?: string
}

export interface DesktopClickInput extends DesktopScaleSource {
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

export interface DesktopScrollInput extends DesktopScaleSource {
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

export interface DesktopRegion {
  x: number
  y: number
  width: number
  height: number
}

export type DesktopAgentInput =
  | { action: 'screenshot'; grid?: boolean | number; region?: DesktopRegion }
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
