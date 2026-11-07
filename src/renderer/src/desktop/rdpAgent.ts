import init, {
  DesktopSize,
  DeviceEvent,
  InputTransaction,
  Session,
  SessionBuilder,
  ClipboardData,
  RotationUnit,
  Extension,
  setup as setupRdpLogging
} from 'ironrdp-wasm'
import type { ClipboardItem } from 'ironrdp-wasm'
import wasmUrl from '../../../../node_modules/ironrdp-wasm/pkg/rdp_client_bg.wasm?url'
import type { DesktopAgentInput } from '../../../shared/desktop-agent'
import { captureCanvas, waitForCanvas } from './capture'

let wasmReady: Promise<unknown> | null = null

function ready(): Promise<unknown> {
  wasmReady ??= init(wasmUrl).then((module) => {
    setupRdpLogging('warn')
    return module
  })
  return wasmReady
}

export interface RdpConnection {
  session: Session
  canvas: HTMLCanvasElement
}

const connections = new Map<string, RdpConnection>()

export function registerRdp(viewId: string, connection: RdpConnection): void {
  connections.set(viewId, connection)
}

export function unregisterRdp(viewId: string): void {
  connections.delete(viewId)
}

export async function runRdpAgentById(viewId: string, input: DesktopAgentInput): Promise<{ pngBase64?: string; note: string }> {
  const connection = connections.get(viewId)
  if (!connection) throw new Error('RDP 画面不存在或已断开，请先打开该 RDP 标签')
  if (input.action === 'wait') return waitForCanvas(connection.canvas, input)
  return runRdpAgent(connection, input)
}

export async function connectRdp(options: {
  url: string
  host: string
  port: number
  username: string
  password?: string
  width?: number
  height?: number
  canvas: HTMLCanvasElement
  clipboard?: {
    read: () => Promise<string>
    write: (text: string) => void | Promise<void>
  }
}): Promise<RdpConnection> {
  await ready()
  let session: Session | null = null
  let builder = new SessionBuilder()
  builder = builder.destination(`${options.host}:${options.port}`)
  builder = builder.proxyAddress(options.url)
  builder = builder.authToken(new URL(options.url).searchParams.get('token') ?? 'termpilot')
  builder = builder.extension(new Extension('enable_credssp', true))
  builder = builder.username(options.username)
  if (options.password) builder = builder.password(options.password)
  builder = builder.desktopSize(new DesktopSize(options.width ?? 1280, options.height ?? 720))
  builder = builder.renderCanvas(options.canvas)
  builder = builder.setCursorStyleCallback((style: string) => {
    options.canvas.style.cursor = style
  })
  builder = builder.setCursorStyleCallbackContext(null)
  if (options.clipboard) {
    const clipboard = options.clipboard
    builder = builder.remoteClipboardChangedCallback((data: ClipboardData) => {
      const text = textFromClipboard(data)
      if (text !== null) void Promise.resolve(clipboard.write(text)).catch(() => undefined)
    })
    builder = builder.forceClipboardUpdateCallback(() => {
      void (async () => {
        const text = await clipboard.read()
        if (!text || !session) return
        const data = new ClipboardData()
        data.addText('text/plain', text)
        try {
          await session.onClipboardPaste(data)
        } finally {
          data.free()
        }
      })().catch((error) => console.error('[RDP] clipboard sync failed', error))
    })
  }
  session = await builder.connect()
  return { session, canvas: options.canvas }
}

function textFromClipboard(data: ClipboardData): string | null {
  for (const item of data.items() as ClipboardItem[]) {
    const mime = item.mimeType()
    if (!mime.includes('text') && mime !== 'UTF8_STRING') continue
    const value = item.value()
    if (typeof value === 'string') return value
    if (value instanceof Uint8Array) return new TextDecoder().decode(value)
  }
  return null
}

export function runRdpAgent(connection: RdpConnection, input: Exclude<DesktopAgentInput, { action: 'wait' }>): { pngBase64?: string; note: string } {
  try {
    return runRdpAgentUnsafe(connection, input)
  } catch (error) {
    throw new Error(rdpErrorText(error))
  }
}

function runRdpAgentUnsafe(connection: RdpConnection, input: Exclude<DesktopAgentInput, { action: 'wait' }>): { pngBase64?: string; note: string } {
  const { session, canvas } = connection
  if (input.action === 'screenshot') {
    const shot = captureCanvas(canvas, input.grid)
    return {
      pngBase64: shot.pngBase64,
      note: `RDP 画面已截取（${shot.width}×${shot.height}${shot.grid ? `，网格 ${shot.grid}px，坐标与图片一致` : ''}）`
    }
  }
  if (input.action === 'click') {
    canvas.focus()
    const button = input.button === 'right' ? 2 : input.button === 'middle' ? 1 : 0
    const point = rdpPoint(canvas, input.x, input.y)
    const events: DeviceEvent[] = [DeviceEvent.mouseMove(point.x, point.y)]
    for (let i = 0; i < (input.double ? 2 : 1); i++) {
      events.push(DeviceEvent.mouseButtonPressed(button), DeviceEvent.mouseButtonReleased(button))
    }
    applyEvents(session, events)
    return { note: `已发送 RDP 点击（图片坐标 ${input.x}, ${input.y}）` }
  }
  if (input.action === 'key') {
    canvas.focus()
    sendCombo(session, input.keys)
    return { note: `已发送 RDP 按键 ${input.keys}` }
  }
  if (input.action === 'type') {
    canvas.focus()
    const events: DeviceEvent[] = []
    for (const char of input.text) {
      const needsShift = /[A-Z~!@#$%^&*()_+{}|:"<>?]/.test(char)
      if (needsShift) events.push(DeviceEvent.keyPressed(0x2a))
      events.push(DeviceEvent.unicodePressed(char), DeviceEvent.unicodeReleased(char))
      if (needsShift) events.push(DeviceEvent.keyReleased(0x2a))
    }
    applyEvents(session, events)
    return { note: `已逐字输入 ${Array.from(input.text).length} 个字符` }
  }
  const events: DeviceEvent[] = []
  if (input.x !== undefined && input.y !== undefined) {
    const point = rdpPoint(canvas, input.x, input.y)
    events.push(DeviceEvent.mouseMove(point.x, point.y))
  }
  const amount = input.deltaY > 0 ? -1 : 1
  events.push(DeviceEvent.wheelRotations(true, amount, RotationUnit.Line))
  applyEvents(session, events)
  return { note: `已发送 RDP 滚动 ${input.deltaY}` }
}

function rdpPoint(canvas: HTMLCanvasElement, x: number, y: number): { x: number; y: number } {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
    throw new Error(`坐标 (${x}, ${y}) 超出图片范围 ${canvas.width}×${canvas.height}`)
  }
  return { x: Math.round(x), y: Math.round(y) }
}

function apply(session: Session, event: DeviceEvent): void {
  applyEvents(session, [event])
}

function applyEvents(session: Session, events: DeviceEvent[]): void {
  if (events.length === 0) return
  try {
    const transaction = new InputTransaction()
    for (const event of events) transaction.addEvent(event)
    session.applyInputs(transaction)
  } catch (error) {
    const candidate = error as { kind?: () => number; backtrace?: () => string }
    const kind = typeof candidate.kind === 'function' ? candidate.kind() : -1
    const backtrace = typeof candidate.backtrace === 'function' ? candidate.backtrace() : ''
    console.error(`[RDP] applyInputs failed kind=${kind} backtrace=${backtrace}`)
    throw error
  }
}

const SPECIAL: Record<string, number> = {
  enter: 0x1c,
  esc: 0x01,
  escape: 0x01,
  tab: 0x0f,
  space: 0x39,
  backspace: 0x0e,
  delete: 0xe053,
  up: 0xe048,
  down: 0xe050,
  left: 0xe04b,
  right: 0xe04d,
  home: 0xe047,
  end: 0xe04f,
  pageup: 0xe049,
  pagedown: 0xe051,
  insert: 0xe052,
  minus: 0x0c,
  equal: 0x0d,
  slash: 0x35,
  backslash: 0x2b,
  comma: 0x33,
  period: 0x34,
  semicolon: 0x27,
  quote: 0x28,
  backquote: 0x29,
  bracketleft: 0x1a,
  bracketright: 0x1b
}

const MODIFIERS: Record<string, number> = {
  ctrl: 0x1d,
  control: 0x1d,
  alt: 0x38,
  shift: 0x2a,
  meta: 0xe05b,
  win: 0xe05b
}

const LETTERS: Record<string, number> = {
  a: 0x1e,
  b: 0x30,
  c: 0x2e,
  d: 0x20,
  e: 0x12,
  f: 0x21,
  g: 0x22,
  h: 0x23,
  i: 0x17,
  j: 0x24,
  k: 0x25,
  l: 0x26,
  m: 0x32,
  n: 0x31,
  o: 0x18,
  p: 0x19,
  q: 0x10,
  r: 0x13,
  s: 0x1f,
  t: 0x14,
  u: 0x16,
  v: 0x2f,
  w: 0x11,
  x: 0x2d,
  y: 0x15,
  z: 0x2c
}

const DIGITS: Record<string, number> = {
  '1': 0x02,
  '2': 0x03,
  '3': 0x04,
  '4': 0x05,
  '5': 0x06,
  '6': 0x07,
  '7': 0x08,
  '8': 0x09,
  '9': 0x0a,
  '0': 0x0b
}

function sendCombo(session: Session, combo: string): void {
  const parts = combo.toLowerCase().split('-').filter(Boolean)
  const main = parts.pop()
  if (!main) throw new Error('按键不能为空')
  const events: DeviceEvent[] = []
  for (const modifier of parts) {
    const scancode = MODIFIERS[modifier]
    if (!scancode) throw new Error(`不认识的修饰键 ${modifier}`)
    events.push(DeviceEvent.keyPressed(scancode))
  }
  const scancode = SPECIAL[main] ?? LETTERS[main] ?? DIGITS[main]
  if (!scancode) throw new Error(`不认识的按键 ${main}`)
  events.push(DeviceEvent.keyPressed(scancode), DeviceEvent.keyReleased(scancode))
  for (const modifier of [...parts].reverse()) {
    events.push(DeviceEvent.keyReleased(MODIFIERS[modifier]))
  }
  applyEvents(session, events)
}

function rdpErrorText(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const candidate = error as { kind?: () => number; backtrace?: () => string; reason?: () => string }
    const backtrace = typeof candidate.backtrace === 'function' ? candidate.backtrace() : ''
    if (typeof candidate.kind === 'function') return `RDP 错误（类别 ${candidate.kind()}）${backtrace ? `：${backtrace}` : ''}`
    if (backtrace) return backtrace
    if (typeof candidate.reason === 'function') return candidate.reason()
    return JSON.stringify(error)
  }
  return String(error)
}

const DIRECT_KEY_CODES: Record<string, number> = {
  Backspace: 0x0e,
  Tab: 0x0f,
  Enter: 0x1c,
  NumpadEnter: 0xe01c,
  Escape: 0x01,
  Space: 0x39,
  Delete: 0xe053,
  Insert: 0xe052,
  ArrowUp: 0xe048,
  ArrowDown: 0xe050,
  ArrowLeft: 0xe04b,
  ArrowRight: 0xe04d,
  Home: 0xe047,
  End: 0xe04f,
  PageUp: 0xe049,
  PageDown: 0xe051,
  ControlLeft: 0x1d,
  ControlRight: 0xe01d,
  ShiftLeft: 0x2a,
  ShiftRight: 0x36,
  AltLeft: 0x38,
  AltRight: 0xe038,
  MetaLeft: 0xe05b,
  MetaRight: 0xe05c,
  ContextMenu: 0xe05d,
  CapsLock: 0x3a,
  NumLock: 0x45,
  ScrollLock: 0x46,
  Backquote: 0x29,
  Minus: 0x0c,
  Equal: 0x0d,
  BracketLeft: 0x1a,
  BracketRight: 0x1b,
  Backslash: 0x2b,
  Semicolon: 0x27,
  Quote: 0x28,
  Comma: 0x33,
  Period: 0x34,
  Slash: 0x35,
  IntlBackslash: 0x56,
  Numpad0: 0x52,
  Numpad1: 0x4f,
  Numpad2: 0x50,
  Numpad3: 0x51,
  Numpad4: 0x4b,
  Numpad5: 0x4c,
  Numpad6: 0x4d,
  Numpad7: 0x47,
  Numpad8: 0x48,
  Numpad9: 0x49,
  NumpadDecimal: 0x53,
  NumpadDivide: 0xe035,
  NumpadMultiply: 0x37,
  NumpadSubtract: 0x4a,
  NumpadAdd: 0x4e,
  F1: 0x3b,
  F2: 0x3c,
  F3: 0x3d,
  F4: 0x3e,
  F5: 0x3f,
  F6: 0x40,
  F7: 0x41,
  F8: 0x42,
  F9: 0x43,
  F10: 0x44,
  F11: 0x57,
  F12: 0x58
}

function directScancode(code: string): number | null {
  if (DIRECT_KEY_CODES[code]) return DIRECT_KEY_CODES[code]
  if (code.startsWith('Key')) return LETTERS[code.slice(3).toLowerCase()] ?? null
  if (code.startsWith('Digit')) return DIGITS[code.slice(5)] ?? null
  return null
}

/** 用户在 RDP 画面里的直接输入，和 Agent 共用同一套 PS/2 事件。 */
export function attachRdpInput(canvas: HTMLCanvasElement, session: Session): () => void {
  const onMouseMove = (event: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    const x = Math.round((event.clientX - rect.left) * (canvas.width / rect.width))
    const y = Math.round((event.clientY - rect.top) * (canvas.height / rect.height))
    apply(session, DeviceEvent.mouseMove(x, y))
  }
  const onMouseDown = (event: MouseEvent) => {
    event.preventDefault()
    canvas.focus()
    apply(session, DeviceEvent.mouseButtonPressed(event.button))
  }
  const onMouseUp = (event: MouseEvent) => {
    event.preventDefault()
    apply(session, DeviceEvent.mouseButtonReleased(event.button))
  }
  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    const amount = event.deltaY > 0 ? -1 : 1
    apply(session, DeviceEvent.wheelRotations(true, amount, RotationUnit.Line))
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing) return
    event.preventDefault()
    event.stopPropagation()
    const scancode = directScancode(event.code)
    if (scancode) apply(session, DeviceEvent.keyPressed(scancode))
  }
  const onKeyUp = (event: KeyboardEvent) => {
    if (event.isComposing) return
    event.preventDefault()
    event.stopPropagation()
    const scancode = directScancode(event.code)
    if (scancode) apply(session, DeviceEvent.keyReleased(scancode))
  }
  const onBlur = () => session.releaseAllInputs()
  const onContextMenu = (event: Event) => event.preventDefault()
  const onCompositionEnd = (event: CompositionEvent) => {
    for (const char of event.data) {
      apply(session, DeviceEvent.unicodePressed(char))
      apply(session, DeviceEvent.unicodeReleased(char))
    }
  }

  canvas.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('mousedown', onMouseDown)
  canvas.addEventListener('mouseup', onMouseUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('keydown', onKeyDown)
  canvas.addEventListener('keyup', onKeyUp)
  canvas.addEventListener('blur', onBlur)
  canvas.addEventListener('contextmenu', onContextMenu)
  canvas.addEventListener('compositionend', onCompositionEnd)
  return () => {
    session.releaseAllInputs()
    canvas.removeEventListener('mousemove', onMouseMove)
    canvas.removeEventListener('mousedown', onMouseDown)
    canvas.removeEventListener('mouseup', onMouseUp)
    canvas.removeEventListener('wheel', onWheel)
    canvas.removeEventListener('keydown', onKeyDown)
    canvas.removeEventListener('keyup', onKeyUp)
    canvas.removeEventListener('blur', onBlur)
    canvas.removeEventListener('contextmenu', onContextMenu)
    canvas.removeEventListener('compositionend', onCompositionEnd)
  }
}
