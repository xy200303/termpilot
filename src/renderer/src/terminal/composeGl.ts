import type { IBufferCell, ITheme, Terminal } from '@xterm/xterm'
import { tryDrawCustomChar } from './xtermGlyphs'

export interface ComposeLook {
  cellWidth: number
  cellHeight: number
  fontFamily: string
  fontSize: number
  theme: ITheme
}

/**
 * xterm WebGL 渲染器里的设备像素格子。
 * 见 addon-webgl WebglRenderer._updateDimensions。
 */
interface DeviceCells {
  cellW: number
  cellH: number
  charH: number
  charLeft: number
  charTop: number
  dpr: number
}

const ANSI16 = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'brightBlack',
  'brightRed',
  'brightGreen',
  'brightYellow',
  'brightBlue',
  'brightMagenta',
  'brightCyan',
  'brightWhite'
] as const

/** 把缓冲里的一段行贴成 PNG。行号含首不含尾。不打开第二个终端。 */
export function composeTerminalRange(term: Terminal, start: number, end: number, look: ComposeLook): string {
  const cols = Math.max(2, term.cols)
  const rows = Math.max(1, end - start)
  const device = deviceCells(term, look)
  const canvas = document.createElement('canvas')
  canvas.width = device.cellW * cols
  canvas.height = device.cellH * rows
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('字形图没有建成')
  ctx.imageSmoothingEnabled = false
  const masks = new Map<string, HTMLCanvasElement>()

  const theme = look.theme
  const buffer = term.buffer.active
  const cursorLine = buffer.baseY + buffer.cursorY
  const cursorX = buffer.cursorX
  const cell = buffer.getNullCell()
  const fallbackFg = parseColor(theme.foreground ?? '') ?? [0.83, 0.83, 0.83, 1]
  const fallbackBg = parseColor(theme.background ?? '') ?? [0.12, 0.12, 0.12, 1]
  ctx.fillStyle = css(fallbackBg)
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let row = 0; row < rows; row += 1) {
    const line = buffer.getLine(start + row)
    for (let col = 0; col < cols; col += 1) {
      const current = line?.getCell(col, cell)
      if (!current || current.getWidth() === 0) continue
      const span = Math.max(1, current.getWidth())
      const cursor = start + row === cursorLine && col === cursorX
      let fg = cursor ? parseColor(theme.cursorAccent ?? '') ?? fallbackFg : cellColor(theme, current, true, fallbackFg, fallbackBg)
      const bg = cursor ? parseColor(theme.cursor ?? '') ?? fallbackBg : cellColor(theme, current, false, fallbackFg, fallbackBg)
      if (!cursor && current.isDim()) fg = [fg[0] * 0.5, fg[1] * 0.5, fg[2] * 0.5, 1]
      const x = col * device.cellW
      const y = row * device.cellH
      const w = span * device.cellW
      ctx.fillStyle = css(bg)
      ctx.fillRect(x, y, w, device.cellH)
      if (current.isInvisible()) continue
      const chars = current.getChars()
      if (!chars) continue
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, w, device.cellH)
      ctx.clip()
      ctx.fillStyle = css(fg)
      const custom = tryDrawCustomChar(ctx, chars, x, y, device.cellW, device.cellH, look.fontSize, device.dpr)
      if (!custom) {
        const mask = glyphMask(masks, chars, current, term, look, device, w, css(fg), fg)
        ctx.drawImage(mask, x, y)
      }
      const thick = Math.max(1, Math.floor((look.fontSize * device.dpr) / 15))
      if (current.isUnderline() || current.isOverline() || current.isStrikethrough()) {
        ctx.strokeStyle = css(fg)
        ctx.lineWidth = thick
        ctx.beginPath()
        if (current.isUnderline()) {
          const uy = y + device.charTop + device.charH - thick
          ctx.moveTo(x, uy)
          ctx.lineTo(x + w, uy)
        }
        if (current.isOverline()) {
          ctx.moveTo(x, y + device.charTop)
          ctx.lineTo(x + w, y + device.charTop)
        }
        if (current.isStrikethrough()) {
          const sy = y + device.charTop + Math.floor(device.charH / 2)
          ctx.moveTo(x, sy)
          ctx.lineTo(x + w, sy)
        }
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  const url = canvas.toDataURL('image/png')
  const comma = url.indexOf(',')
  if (comma < 0) throw new Error('合成没有画出来')
  return url.slice(comma + 1)
}

function deviceCells(term: Terminal, look: ComposeLook): DeviceCells {
  const dpr = window.devicePixelRatio || 1
  const live = liveDevice(term)
  if (live) return { ...live, dpr }
  const lineHeight = term.options.lineHeight ?? 1
  const letterSpacing = term.options.letterSpacing ?? 0
  const charH = Math.max(1, Math.ceil(look.fontSize * dpr))
  const cellH = Math.max(charH, Math.floor(charH * lineHeight))
  return {
    cellW: Math.max(1, Math.floor(look.cellWidth * dpr) + Math.round(letterSpacing)),
    cellH,
    charH,
    charLeft: Math.floor(letterSpacing / 2),
    charTop: lineHeight === 1 ? 0 : Math.round((cellH - charH) / 2),
    dpr
  }
}

function liveDevice(term: Terminal): Omit<DeviceCells, 'dpr'> | null {
  const core = (term as { _core?: { _renderService?: { dimensions?: { device?: DeviceShape } } } })._core
  const device = core?._renderService?.dimensions?.device
  if (!device) return null
  const cellW = device.cell?.width ?? 0
  const cellH = device.cell?.height ?? 0
  const charH = device.char?.height ?? 0
  if (cellW < 1 || cellH < 1 || charH < 1) return null
  return {
    cellW,
    cellH,
    charH,
    charLeft: device.char?.left ?? 0,
    charTop: device.char?.top ?? 0
  }
}

interface DeviceShape {
  cell?: { width?: number; height?: number }
  char?: { height?: number; left?: number; top?: number }
}

/** 白字画在透明底上，再把彩色亚像素收成单一覆盖度，避免截图发虚。 */
function glyphMask(
  cache: Map<string, HTMLCanvasElement>,
  chars: string,
  cell: IBufferCell,
  term: Terminal,
  look: ComposeLook,
  device: DeviceCells,
  slotW: number,
  fgCss: string,
  fg: [number, number, number, number]
): HTMLCanvasElement {
  const key = `${cell.isBold() ? 1 : 0}${cell.isItalic() ? 1 : 0}:${slotW}:${fgCss}:${chars}`
  const hit = cache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = slotW
  canvas.height = device.cellH
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) throw new Error('字形图没有建成')
  ctx.clearRect(0, 0, slotW, device.cellH)
  ctx.font = fontOf(term, cell, device.dpr, look)
  ctx.textBaseline = 'ideographic'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(chars, device.charLeft, device.charTop + device.charH)
  const image = ctx.getImageData(0, 0, slotW, device.cellH)
  const data = image.data
  const red = Math.round(fg[0] * 255)
  const green = Math.round(fg[1] * 255)
  const blue = Math.round(fg[2] * 255)
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] ?? 0
    const cover = alpha === 0 ? 0 : Math.round((Math.max(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0) * alpha) / 255)
    data[i] = red
    data[i + 1] = green
    data[i + 2] = blue
    data[i + 3] = cover
  }
  ctx.putImageData(image, 0, 0)
  cache.set(key, canvas)
  return canvas
}

function fontOf(term: Terminal, cell: IBufferCell, dpr: number, look: ComposeLook): string {
  const weight = cell.isBold() ? term.options.fontWeightBold ?? 'bold' : term.options.fontWeight ?? 'normal'
  const italic = cell.isItalic() ? 'italic' : ''
  return `${italic} ${weight} ${Math.max(1, Math.round(look.fontSize * dpr))}px ${look.fontFamily}`
}

function css(color: [number, number, number, number]): string {
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value * 255)))
  return `rgb(${channel(color[0])},${channel(color[1])},${channel(color[2])})`
}

function cellColor(
  theme: ITheme,
  cell: IBufferCell,
  wantFg: boolean,
  fallbackFg: [number, number, number, number],
  fallbackBg: [number, number, number, number]
): [number, number, number, number] {
  const fromFg = wantFg !== Boolean(cell.isInverse())
  if (fromFg) {
    if (cell.isFgDefault()) return parseColor(theme.foreground ?? '') ?? fallbackFg
    if (cell.isFgRGB()) return rgb(cell.getFgColor())
    let index = cell.getFgColor()
    if (cell.isBold() && index < 8) index += 8
    return palette(theme, index, fallbackFg)
  }
  if (cell.isBgDefault()) return parseColor(theme.background ?? '') ?? fallbackBg
  if (cell.isBgRGB()) return rgb(cell.getBgColor())
  return palette(theme, cell.getBgColor(), fallbackBg)
}

function palette(theme: ITheme, index: number, fallback: [number, number, number, number]): [number, number, number, number] {
  if (index < 16) {
    const key = ANSI16[index]
    if (!key) return fallback
    return parseColor(theme[key] ?? '') ?? fallback
  }
  if (index < 232) {
    const level = [0, 95, 135, 175, 215, 255]
    const offset = index - 16
    const red = level[Math.floor(offset / 36)] ?? 0
    const green = level[Math.floor((offset % 36) / 6)] ?? 0
    const blue = level[offset % 6] ?? 0
    return [red / 255, green / 255, blue / 255, 1]
  }
  const gray = (8 + (index - 232) * 10) / 255
  return [gray, gray, gray, 1]
}

function rgb(color: number): [number, number, number, number] {
  return [((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255, 1]
}

function parseColor(input: string): [number, number, number, number] | null {
  const text = input.trim()
  if (text.startsWith('#')) {
    const hex = text.slice(1)
    const full = hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex
    if (full.length < 6) return null
    return [parseInt(full.slice(0, 2), 16) / 255, parseInt(full.slice(2, 4), 16) / 255, parseInt(full.slice(4, 6), 16) / 255, 1]
  }
  return null
}
