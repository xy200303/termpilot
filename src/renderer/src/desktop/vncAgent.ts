import type RFB from '@novnc/novnc'
import type { DesktopAgentInput } from '../../../shared/desktop-agent'
import { captureCanvas, scaleToCanvas, waitForCanvas } from './capture'

interface Entry {
  rfb: RFB
  canvas: HTMLCanvasElement
}

const entries = new Map<string, Entry>()

export function registerVnc(viewId: string, rfb: RFB, canvas: HTMLCanvasElement): void {
  entries.set(viewId, { rfb, canvas })
}

export function unregisterVnc(viewId: string): void {
  entries.delete(viewId)
}

export async function runVncAgent(viewId: string, input: DesktopAgentInput): Promise<{ pngBase64?: string; note: string }> {
  const entry = entries.get(viewId)
  if (!entry) throw new Error('VNC 画面不存在或已断开，请先打开该 VNC 标签')
  const { rfb, canvas } = entry
  if (input.action === 'screenshot') {
    const shot = captureCanvas(canvas)
    return {
      pngBase64: shot.pngBase64,
      note: `VNC 画面已截取（${shot.width}×${shot.height}）`
    }
  }
  if (input.action === 'wait') return waitForCanvas(canvas, input)
  if (rfb.viewOnly) throw new Error('这条 VNC 连接是只观看模式，不能发送鼠标键盘')
  if (input.action === 'click') {
    const button = input.button === 'right' ? 2 : input.button === 'middle' ? 1 : 0
    const buttons = input.button === 'right' ? 2 : input.button === 'middle' ? 4 : 1
    const target = scaleToCanvas(canvas, input.x, input.y, input.fromWidth, input.fromHeight)
    const point = canvasPoint(canvas, target.x, target.y)
    const base = { bubbles: true, cancelable: true, button, clientX: point.x, clientY: point.y }
    canvas.focus()
    for (let i = 0; i < (input.double ? 2 : 1); i++) {
      canvas.dispatchEvent(new MouseEvent('mousemove', { ...base, buttons: 0 }))
      canvas.dispatchEvent(new MouseEvent('mousedown', { ...base, buttons, detail: i + 1 }))
      canvas.dispatchEvent(new MouseEvent('mouseup', { ...base, buttons: 0, detail: i + 1 }))
      canvas.dispatchEvent(new MouseEvent('click', { ...base, buttons: 0, detail: i + 1 }))
    }
    return { note: `已发送 VNC 点击（图片坐标 ${target.x}, ${target.y}${target.scaled ? '，已按截图尺寸换算' : ''}）` }
  }
  if (input.action === 'key') {
    rfb.focus()
    sendCombo(rfb, input.keys)
    return { note: `已发送 VNC 按键 ${input.keys}` }
  }
  if (input.action === 'type') {
    rfb.focus()
    const count = Array.from(input.text).length
    if (input.method === 'clipboard') {
      // VNC 没有文本通道：先把整段写进远端剪贴板，再让目标应用自己粘贴
      rfb.clipboardPasteFrom(input.text)
      await new Promise((resolve) => setTimeout(resolve, 150))
      const combo = input.pasteKeys ?? 'ctrl-v'
      sendCombo(rfb, combo)
      return { note: `已把 ${count} 个字符写入远端剪贴板，并发送 ${combo} 粘贴` }
    }
    for (const char of input.text) sendChar(rfb, char)
    return { note: `已逐字输入 ${count} 个字符` }
  }
  const rect = canvas.getBoundingClientRect()
  const scaled = scaleToCanvas(canvas, input.x ?? canvas.width / 2, input.y ?? canvas.height / 2, input.fromWidth, input.fromHeight)
  const point = canvasPoint(canvas, scaled.x, scaled.y)
  canvas.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: input.deltaY, clientX: point.x, clientY: point.y }))
  return { note: `已发送 VNC 滚动 ${input.deltaY}（画布显示宽度 ${Math.round(rect.width)}px）` }
}

function canvasPoint(canvas: HTMLCanvasElement, x: number, y: number): { x: number; y: number } {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
    throw new Error(`坐标 (${x}, ${y}) 超出图片范围 ${canvas.width}×${canvas.height}`)
  }
  const rect = canvas.getBoundingClientRect()
  return {
    x: rect.left + x * (rect.width / canvas.width),
    y: rect.top + y * (rect.height / canvas.height)
  }
}

const SPECIAL: Record<string, { keysym: number; code: string }> = {
  enter: { keysym: 0xff0d, code: 'Enter' },
  esc: { keysym: 0xff1b, code: 'Escape' },
  escape: { keysym: 0xff1b, code: 'Escape' },
  tab: { keysym: 0xff09, code: 'Tab' },
  space: { keysym: 0x20, code: 'Space' },
  backspace: { keysym: 0xff08, code: 'Backspace' },
  delete: { keysym: 0xffff, code: 'Delete' },
  insert: { keysym: 0xff63, code: 'Insert' },
  up: { keysym: 0xff52, code: 'ArrowUp' },
  down: { keysym: 0xff54, code: 'ArrowDown' },
  left: { keysym: 0xff51, code: 'ArrowLeft' },
  right: { keysym: 0xff53, code: 'ArrowRight' },
  home: { keysym: 0xff50, code: 'Home' },
  end: { keysym: 0xff57, code: 'End' },
  pageup: { keysym: 0xff55, code: 'PageUp' },
  pagedown: { keysym: 0xff56, code: 'PageDown' },
  minus: { keysym: 0x2d, code: 'Minus' },
  equal: { keysym: 0x3d, code: 'Equal' },
  slash: { keysym: 0x2f, code: 'Slash' },
  backslash: { keysym: 0x5c, code: 'Backslash' },
  comma: { keysym: 0x2c, code: 'Comma' },
  period: { keysym: 0x2e, code: 'Period' },
  semicolon: { keysym: 0x3b, code: 'Semicolon' },
  quote: { keysym: 0x27, code: 'Quote' },
  backquote: { keysym: 0x60, code: 'Backquote' },
  bracketleft: { keysym: 0x5b, code: 'BracketLeft' },
  bracketright: { keysym: 0x5d, code: 'BracketRight' },
  f1: { keysym: 0xffbe, code: 'F1' },
  f2: { keysym: 0xffbf, code: 'F2' },
  f3: { keysym: 0xffc0, code: 'F3' },
  f4: { keysym: 0xffc1, code: 'F4' },
  f5: { keysym: 0xffc2, code: 'F5' },
  f6: { keysym: 0xffc3, code: 'F6' },
  f7: { keysym: 0xffc4, code: 'F7' },
  f8: { keysym: 0xffc5, code: 'F8' },
  f9: { keysym: 0xffc6, code: 'F9' },
  f10: { keysym: 0xffc7, code: 'F10' },
  f11: { keysym: 0xffc8, code: 'F11' },
  f12: { keysym: 0xffc9, code: 'F12' }
}

const MODIFIERS: Record<string, { keysym: number; code: string }> = {
  ctrl: { keysym: 0xffe3, code: 'ControlLeft' },
  control: { keysym: 0xffe3, code: 'ControlLeft' },
  alt: { keysym: 0xffe9, code: 'AltLeft' },
  shift: { keysym: 0xffe1, code: 'ShiftLeft' },
  meta: { keysym: 0xffe7, code: 'MetaLeft' },
  win: { keysym: 0xffe7, code: 'MetaLeft' }
}

const CHAR_CODES: Record<string, string> = {
  ' ': 'Space',
  '-': 'Minus',
  _: 'Minus',
  '=': 'Equal',
  '+': 'Equal',
  '[': 'BracketLeft',
  '{': 'BracketLeft',
  ']': 'BracketRight',
  '}': 'BracketRight',
  '\\': 'Backslash',
  '|': 'Backslash',
  ';': 'Semicolon',
  ':': 'Semicolon',
  "'": 'Quote',
  '"': 'Quote',
  ',': 'Comma',
  '<': 'Comma',
  '.': 'Period',
  '>': 'Period',
  '/': 'Slash',
  '?': 'Slash',
  '`': 'Backquote',
  '~': 'Backquote'
}

function sendCombo(rfb: RFB, combo: string): void {
  const parts = combo.split('-').filter(Boolean)
  const main = parts.pop()
  if (!main) throw new Error('按键不能为空')
  const modifiers = parts.map((name) => {
    const item = MODIFIERS[name.toLowerCase()]
    if (!item) throw new Error(`不认识的修饰键 ${name}`)
    return item
  })
  for (const item of modifiers) rfb.sendKey(item.keysym, item.code, true)
  try {
    const special = SPECIAL[main.toLowerCase()]
    if (special) rfb.sendKey(special.keysym, special.code)
    else if (Array.from(main).length === 1) sendChar(rfb, main)
    else throw new Error(`不认识的按键 ${main}`)
  } finally {
    for (const item of [...modifiers].reverse()) rfb.sendKey(item.keysym, item.code, false)
  }
}

function sendChar(rfb: RFB, char: string): void {
  if (char === '\n' || char === '\r') {
    rfb.sendKey(SPECIAL.enter.keysym, SPECIAL.enter.code)
    return
  }
  if (char === '\t') {
    rfb.sendKey(SPECIAL.tab.keysym, SPECIAL.tab.code)
    return
  }
  const point = char.codePointAt(0)
  if (point === undefined) return
  const code = charCode(char, point)
  const needsShift = /[A-Z~!@#$%^&*()_+{}|:"<>?]/.test(char)
  if (needsShift) rfb.sendKey(MODIFIERS.shift.keysym, MODIFIERS.shift.code, true)
  try {
    const keysym = point <= 0xff ? point : 0x01000000 + point
    rfb.sendKey(keysym, code)
  } finally {
    if (needsShift) rfb.sendKey(MODIFIERS.shift.keysym, MODIFIERS.shift.code, false)
  }
}

function charCode(char: string, point: number): string {
  if (/[a-z]/i.test(char)) return `Key${char.toUpperCase()}`
  if (/^[0-9]$/.test(char)) return `Digit${char}`
  const shiftedDigits: Record<string, string> = {
    '!': 'Digit1',
    '@': 'Digit2',
    '#': 'Digit3',
    $: 'Digit4',
    '%': 'Digit5',
    '^': 'Digit6',
    '&': 'Digit7',
    '*': 'Digit8',
    '(': 'Digit9',
    ')': 'Digit0'
  }
  return CHAR_CODES[char] ?? shiftedDigits[char] ?? `Unicode${point.toString(16)}`
}
