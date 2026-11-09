import {
  connectIronRdp,
  runIronRdp,
  type IronRdpConnection,
  type IronRdpOptions
} from './ironRdp'
import type { DesktopAgentInput } from '../../../shared/desktop-agent'
import { captureCanvas, scaleToCanvas, waitForCanvas } from './capture'
import i18n from '../i18n'

const tr = (key: string, params?: Record<string, string | number>): string =>
  String(i18n.t(key, { ...(params ?? {}), defaultValue: key }))

export type RdpConnection = IronRdpConnection

const connections = new Map<string, RdpConnection>()

export function registerRdp(viewId: string, connection: RdpConnection): void {
  connections.set(viewId, connection)
}

export function unregisterRdp(viewId: string): void {
  connections.delete(viewId)
}

export async function connectRdp(options: Omit<IronRdpOptions, 'width' | 'height'> & { width?: number; height?: number }): Promise<RdpConnection> {
  return connectIronRdp({ ...options, width: options.width ?? 1280, height: options.height ?? 720 })
}

export { runIronRdp }

function requireCanvas(connection: RdpConnection): HTMLCanvasElement {
  const canvas = connection.canvas()
  if (!canvas) throw new Error(tr('common.rdp_desktop_not_found_or_disconnected'))
  return canvas
}

function requireVisibleCanvas(connection: RdpConnection): HTMLCanvasElement {
  const canvas = requireCanvas(connection)
  const rect = canvas.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1) throw new Error(tr('rdp.rdp_canvas_not_visible'))
  return canvas
}

export async function runRdpAgentById(viewId: string, input: DesktopAgentInput): Promise<{ png?: Uint8Array; note: string }> {
  const connection = connections.get(viewId)
  if (!connection) throw new Error(tr('common.rdp_desktop_not_found_or_disconnected_open_the_r'))
  if (input.action === 'wait') return waitForCanvas(requireCanvas(connection), input)
  return runRdpAgent(connection, input)
}

/** 桌面标签里的「发送文字」入口，走 RDP 剪贴板 + 粘贴快捷键。 */
export async function sendTextToRdp(viewId: string, text: string, pasteKeys = 'ctrl-v'): Promise<void> {
  const connection = connections.get(viewId)
  if (!connection) throw new Error(tr('common.rdp_desktop_not_found_or_disconnected'))
  await pasteIntoRdp(connection, text, pasteKeys)
}

async function pasteIntoRdp(connection: RdpConnection, text: string, pasteKeys?: string): Promise<string> {
  requireCanvas(connection).focus({ preventScroll: true })
  // 组件通过 navigator.clipboard 读本机剪贴板，先写入要发送的文字；
  // 粘贴完成前不能还原，否则远端读到的会是还原后的旧内容。
  await window.api.desktop.clipboard.write(text)
  await new Promise((resolve) => setTimeout(resolve, 200))
  await connection.ui.sendClipboardData()
  await new Promise((resolve) => setTimeout(resolve, 150))
  const combo = pasteKeys ?? 'ctrl-v'
  if (combo === 'ctrl-v' || combo === 'ctrl+shift-v') {
    connection.ui.ctrlV()
  } else {
    sendCombo(connection, combo)
  }
  return combo
}

export async function runRdpAgent(
  connection: RdpConnection,
  input: Exclude<DesktopAgentInput, { action: 'wait' }>
): Promise<{ png?: Uint8Array; note: string }> {
  try {
    return await runRdpAgentUnsafe(connection, input)
  } catch (error) {
    throw new Error(rdpErrorText(error))
  }
}

async function runRdpAgentUnsafe(
  connection: RdpConnection,
  input: Exclude<DesktopAgentInput, { action: 'wait' }>
): Promise<{ png?: Uint8Array; note: string }> {
  if (input.action === 'screenshot') {
    const shot = await captureCanvas(requireCanvas(connection))
    return {
      png: shot.png,
      note: tr('common.rdp_screen_captured_w_h', { w: shot.width, h: shot.height })
    }
  }
  if (input.action === 'click') {
    const canvas = requireVisibleCanvas(connection)
    canvas.focus({ preventScroll: true })
    const target = scaleToCanvas(canvas, input.x, input.y, input.fromWidth, input.fromHeight)
    const point = clientPoint(canvas, target.x, target.y)
    const button = input.button === 'right' ? 2 : input.button === 'middle' ? 1 : 0
    dispatchMouse(canvas, 'mousemove', point, button)
    for (let i = 0; i < (input.double ? 2 : 1); i++) {
      dispatchMouse(canvas, 'mousedown', point, button)
      dispatchMouse(canvas, 'mouseup', point, button)
    }
    return { note: tr('common.rdp_click_sent_image_coordinates_x_y_scaled', { x: target.x, y: target.y, scaled: target.scaled ? tr('common.scaled_from_the_screenshot_size') : '' }) }
  }
  if (input.action === 'key') {
    const canvas = requireVisibleCanvas(connection)
    canvas.focus({ preventScroll: true })
    sendCombo(connection, input.keys)
    return { note: tr('common.rdp_key_sent_keys', { keys: input.keys }) }
  }
  if (input.action === 'type') {
    const canvas = requireVisibleCanvas(connection)
    canvas.focus({ preventScroll: true })
    const count = Array.from(input.text).length
    // xrdp 会丢掉 Unicode 键盘事件里的非 ASCII 字符，含中文时直接走剪贴板
    if (input.method === 'clipboard' || /[^\x00-\x7f]/.test(input.text)) {
      const combo = await pasteIntoRdp(connection, input.text, input.pasteKeys)
      return { note: tr('common.wrote_count_characters_to_the_remote_clipboard_a', { count, combo }) }
    }
    typeText(input.text)
    return { note: tr('common.typed_count_characters', { count }) }
  }
  const canvas = requireVisibleCanvas(connection)
  canvas.focus({ preventScroll: true })
  if (input.x !== undefined && input.y !== undefined) {
    const scaled = scaleToCanvas(canvas, input.x, input.y, input.fromWidth, input.fromHeight)
    const point = clientPoint(canvas, scaled.x, scaled.y)
    if (point.clientX >= 0) dispatchMouse(canvas, 'mousemove', point, 0)
  }
  const delta = input.deltaY > 0 ? 120 : -120
  canvas.dispatchEvent(
    new WheelEvent('wheel', { bubbles: true, cancelable: true, composed: true, deltaY: delta, deltaMode: 1 })
  )
  return { note: tr('common.rdp_scroll_sent_delta', { delta: input.deltaY }) }
}

function clientPoint(canvas: HTMLCanvasElement, x: number, y: number): { clientX: number; clientY: number } {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
    throw new Error(tr('common.coordinates_x_y_are_outside_the_image_w_h', { x, y, w: canvas.width, h: canvas.height }))
  }
  const rect = canvas.getBoundingClientRect()
  return {
    clientX: rect.left + (x / canvas.width) * rect.width,
    clientY: rect.top + (y / canvas.height) * rect.height
  }
}

function dispatchMouse(
  canvas: HTMLCanvasElement,
  type: 'mousemove' | 'mousedown' | 'mouseup',
  point: { clientX: number; clientY: number },
  button: number
): void {
  const buttons = type === 'mousedown' ? [1, 4, 2][button] ?? 1 : 0
  canvas.dispatchEvent(
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: point.clientX,
      clientY: point.clientY,
      button,
      buttons
    })
  )
}

/** 组件在 window 上抓键盘，事件必须能冒泡到 window；key 是单字符时走 unicode 输入。 */
function dispatchKey(type: 'keydown' | 'keyup', init: KeyboardEventInit): void {
  window.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init }))
}

const NAMED_CODES: Record<string, string> = {
  enter: 'Enter',
  esc: 'Escape',
  escape: 'Escape',
  tab: 'Tab',
  space: 'Space',
  backspace: 'Backspace',
  delete: 'Delete',
  insert: 'Insert',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  minus: 'Minus',
  equal: 'Equal',
  slash: 'Slash',
  backslash: 'Backslash',
  comma: 'Comma',
  period: 'Period',
  semicolon: 'Semicolon',
  quote: 'Quote',
  backquote: 'Backquote',
  bracketleft: 'BracketLeft',
  bracketright: 'BracketRight'
}

const MODIFIER_CODES: Record<string, { code: string; key: string; flag: 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey' }> = {
  ctrl: { code: 'ControlLeft', key: 'Control', flag: 'ctrlKey' },
  control: { code: 'ControlLeft', key: 'Control', flag: 'ctrlKey' },
  alt: { code: 'AltLeft', key: 'Alt', flag: 'altKey' },
  shift: { code: 'ShiftLeft', key: 'Shift', flag: 'shiftKey' },
  meta: { code: 'MetaLeft', key: 'Meta', flag: 'metaKey' },
  win: { code: 'MetaLeft', key: 'Meta', flag: 'metaKey' }
}

function mainKeyCode(name: string): { code: string; key: string } | null {
  if (NAMED_CODES[name]) return { code: NAMED_CODES[name], key: NAMED_CODES[name] === 'Space' ? ' ' : NAMED_CODES[name] }
  if (/^[a-z]$/.test(name)) return { code: `Key${name.toUpperCase()}`, key: name }
  if (/^[0-9]$/.test(name)) return { code: `Digit${name}`, key: name }
  if (/^f([1-9]|1[0-2])$/.test(name)) return { code: name.toUpperCase(), key: name.toUpperCase() }
  return null
}

function sendCombo(connection: RdpConnection, combo: string): void {
  const parts = combo.toLowerCase().split('-').filter(Boolean)
  const main = parts.pop()
  if (!main) throw new Error(tr('common.key_cannot_be_empty'))
  const modifiers = parts.map((modifier) => {
    const found = MODIFIER_CODES[modifier]
    if (!found) throw new Error(tr('common.unknown_modifier_key', { key: modifier }))
    return found
  })
  const target = mainKeyCode(main)
  if (!target) throw new Error(tr('common.unknown_key_key', { key: main }))

  const flags: KeyboardEventInit = {}
  for (const modifier of modifiers) {
    const label = modifier.code
    dispatchKey('keydown', { code: label, key: modifier.key, ...flags })
    Object.assign(flags, { [modifier.flag]: true })
  }
  dispatchKey('keydown', { ...flags, code: target.code, key: target.key })
  dispatchKey('keyup', { ...flags, code: target.code, key: target.key })
  for (const modifier of [...modifiers].reverse()) {
    dispatchKey('keyup', { code: modifier.code, key: modifier.key, ...flags })
  }
}

const LINE_BREAKS: Record<string, { code: string; key: string }> = {
  '\n': { code: 'Enter', key: 'Enter' },
  '\r': { code: 'Enter', key: 'Enter' },
  '\t': { code: 'Tab', key: 'Tab' }
}

function typeText(text: string): void {
  for (const char of text) {
    const named = LINE_BREAKS[char]
    if (named) {
      dispatchKey('keydown', { code: named.code, key: named.key })
      dispatchKey('keyup', { code: named.code, key: named.key })
      continue
    }
    dispatchKey('keydown', { code: '', key: char })
    dispatchKey('keyup', { code: '', key: char })
  }
}

function rdpErrorText(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const candidate = error as { kind?: () => number; backtrace?: () => string; reason?: () => string }
    const backtrace = typeof candidate.backtrace === 'function' ? candidate.backtrace() : ''
    if (typeof candidate.kind === 'function') return tr('rdp.error_kind', { kind: String(candidate.kind()), detail: backtrace ? tr('rdp.error_detail', { text: backtrace }) : '' })
    if (backtrace) return backtrace
    if (typeof candidate.reason === 'function') return candidate.reason()
    return JSON.stringify(error)
  }
  return String(error)
}

export { rdpErrorText }
