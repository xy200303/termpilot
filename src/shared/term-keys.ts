/** Agent 可以用名字发送的按键。方向键会按终端当前的光标模式编码。 */
export const TERM_KEYS = [
  'up',
  'down',
  'left',
  'right',
  'enter',
  'tab',
  'backspace',
  'esc',
  'space',
  'home',
  'end',
  'pageup',
  'pagedown',
  'ctrl-c',
  'ctrl-d',
  'ctrl-z',
  'ctrl-l',
  'f1',
  'f2',
  'f3',
  'f4',
  'f5',
  'f6',
  'f7',
  'f8',
  'f9',
  'f10',
  'f11',
  'f12'
] as const

export type TermKey = (typeof TERM_KEYS)[number]

const ARROW: Record<'up' | 'down' | 'right' | 'left', string> = {
  up: 'A',
  down: 'B',
  right: 'C',
  left: 'D'
}

const FN: Record<string, string> = {
  f1: '\x1bOP',
  f2: '\x1bOQ',
  f3: '\x1bOR',
  f4: '\x1bOS',
  f5: '\x1b[15~',
  f6: '\x1b[17~',
  f7: '\x1b[18~',
  f8: '\x1b[19~',
  f9: '\x1b[20~',
  f10: '\x1b[21~',
  f11: '\x1b[23~',
  f12: '\x1b[24~'
}

/** 先按 keys，再输入 text，submit 为真时最后补回车。 */
export function encodeTermInput(opts: {
  keys?: readonly string[]
  text?: string
  data?: string
  submit?: boolean
  applicationCursor?: boolean
}): string {
  const app = opts.applicationCursor === true
  let out = opts.data ?? ''
  for (const key of opts.keys ?? []) out += encodeKey(key, app)
  if (opts.text) out += opts.text
  if (opts.submit) out += '\r'
  return out
}

function encodeKey(key: string, applicationCursor: boolean): string {
  if (key in ARROW) {
    const letter = ARROW[key as keyof typeof ARROW]
    return applicationCursor ? `\x1bO${letter}` : `\x1b[${letter}`
  }
  switch (key) {
    case 'enter':
      return '\r'
    case 'tab':
      return '\t'
    case 'backspace':
      return '\x7f'
    case 'esc':
      return '\x1b'
    case 'space':
      return ' '
    case 'home':
      return applicationCursor ? '\x1bOH' : '\x1b[H'
    case 'end':
      return applicationCursor ? '\x1bOF' : '\x1b[F'
    case 'pageup':
      return '\x1b[5~'
    case 'pagedown':
      return '\x1b[6~'
    case 'ctrl-c':
      return '\x03'
    case 'ctrl-d':
      return '\x04'
    case 'ctrl-z':
      return '\x1a'
    case 'ctrl-l':
      return '\x0c'
    default:
      if (key in FN) return FN[key]!
      throw new Error(`不认识的按键: ${key}`)
  }
}
