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
  /** keys 逐字发按键（默认）；clipboard 先写远端剪贴板再发粘贴快捷键。 */
  method?: 'keys' | 'clipboard'
  /** clipboard 模式用的粘贴快捷键，默认 ctrl-v；终端一般是 ctrl-shift-v。 */
  pasteKeys?: string
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
  /** PNG 字节，经 IPC 结构化克隆传回主进程，避免 base64 多一份拷贝 */
  png?: Uint8Array
  note?: string
}
