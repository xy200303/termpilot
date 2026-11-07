import { nativeImage } from 'electron'
import type { DesktopRegion } from '../../../shared/desktop-agent'

const GLYPH_W = 5
const GLYPH_H = 7

// 只用到数字、逗号、x、p 和空格，够画「0,0 1920x1080 100px」这类刻度。
const FONT: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  'x': ['00000', '10001', '01010', '00100', '01010', '10001', '00000'],
  'p': ['00000', '11110', '10001', '10001', '11110', '10000', '10000'],
  ',': ['00000', '00000', '00000', '00000', '00110', '00100', '01000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
}

/**
 * 在主进程给截图叠坐标网格。渲染进程和原生窗口截图都走这里，
 * 所以 VNC、内嵌 RDP 和原生 RDP 的网格完全一致。
 * originX / originY 是这张图在原画面里的左上角，局部截图时刻度仍标原画面坐标。
 */
export function withGrid(png: Buffer, spacing: number, originX = 0, originY = 0): Buffer | null {
  if (!Number.isFinite(spacing) || spacing < 8) return null
  const image = nativeImage.createFromBuffer(png)
  if (image.isEmpty()) return null
  const { width, height } = image.getSize()
  if (width < spacing || height < spacing) return null
  const bitmap = image.toBitmap()
  if (bitmap.length !== width * height * 4) return null

  const scale = width > 1600 ? 2 : 1
  const advance = (GLYPH_W + 1) * scale
  // 浅色画面用深线，深色画面用浅线，避免整片网格看不见或糊成一块。
  const light = brightness(bitmap, width, height) > 140
  const line = light ? [0, 0, 0, 0.55] : [255, 255, 255, 0.55]

  // 左上角标出这块图在原画面里的起点；顶部刻度避开它。
  const origin = `${originX},${originY}`
  const originRight = 3 + origin.length * advance + 4
  drawText(bitmap, width, height, origin, 3, 3, scale)

  // 间距太密时跳过部分刻度文字，只保留能读得清的那几行。
  const labelRoom = 4 * advance + 8
  const vStep = Math.max(1, Math.ceil(labelRoom / spacing))
  let firstX = Math.ceil(originX / spacing) * spacing
  if (firstX <= originX) firstX += spacing
  for (let i = 0, abs = firstX; abs < originX + width; abs += spacing, i += 1) {
    const x = abs - originX
    for (let y = 0; y < height; y += 1) blend(bitmap, width, x, y, line[0], line[1], line[2], line[3])
    const text = String(abs)
    if (i % vStep === 0 && x + 3 > originRight + 4 && x + 3 + text.length * advance + 3 < width) {
      drawText(bitmap, width, height, text, x + 3, 3, scale)
    }
  }
  const hStep = Math.max(1, Math.ceil((GLYPH_H * scale + 6) / spacing))
  let firstY = Math.ceil(originY / spacing) * spacing
  if (firstY <= originY) firstY += spacing
  for (let i = 0, abs = firstY; abs < originY + height; abs += spacing, i += 1) {
    const y = abs - originY
    for (let x = 0; x < width; x += 1) blend(bitmap, width, x, y, line[0], line[1], line[2], line[3])
    if (i % hStep === 0) drawText(bitmap, width, height, String(abs), 3, y + 3, scale)
  }

  const summary = `${width}x${height} ${spacing}px`
  const summaryWidth = summary.length * advance + 2 * scale
  drawText(bitmap, width, height, summary, Math.max(3, width - summaryWidth - 3), Math.max(3, height - GLYPH_H * scale - 5), scale)

  return nativeImage.createFromBitmap(bitmap, { width, height }).toPNG()
}

/** 按 region 裁一块出来，返回裁剪图和它在原画面里的左上角。 */
export function cropPng(png: Buffer, region: DesktopRegion): {
  png: Buffer
  x: number
  y: number
  width: number
  height: number
  fullWidth: number
  fullHeight: number
} {
  const image = nativeImage.createFromBuffer(png)
  if (image.isEmpty()) throw new Error('截图无法解码，请重新截一次')
  const { width, height } = image.getSize()
  const x = Math.round(region.x)
  const y = Math.round(region.y)
  const w = Math.round(region.width)
  const h = Math.round(region.height)
  if (x < 0 || y < 0 || w < 8 || h < 8) throw new Error('region 的 x/y 不能为负，宽高至少 8px')
  if (x + w > width || y + h > height) {
    throw new Error(`region ${x},${y} ${w}x${h} 超出画面范围 ${width}x${height}`)
  }
  return { png: image.crop({ x, y, width: w, height: h }).toPNG(), x, y, width: w, height: h, fullWidth: width, fullHeight: height }
}

function brightness(bitmap: Buffer, width: number, height: number): number {
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 4000)))
  let sum = 0
  let count = 0
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      sum += bitmap[i + 2] * 0.299 + bitmap[i + 1] * 0.587 + bitmap[i] * 0.114
      count += 1
    }
  }
  return count > 0 ? sum / count : 128
}

function blend(bitmap: Buffer, width: number, x: number, y: number, r: number, g: number, b: number, alpha: number): void {
  const i = (y * width + x) * 4
  if (i < 0 || i + 3 >= bitmap.length) return
  const keep = 1 - alpha
  bitmap[i] = Math.round(bitmap[i] * keep + b * alpha)
  bitmap[i + 1] = Math.round(bitmap[i + 1] * keep + g * alpha)
  bitmap[i + 2] = Math.round(bitmap[i + 2] * keep + r * alpha)
}

function drawText(bitmap: Buffer, width: number, height: number, text: string, x: number, y: number, scale: number): void {
  const advance = (GLYPH_W + 1) * scale
  const boxWidth = Math.min(text.length * advance + 2 * scale, width - x)
  const boxHeight = Math.min(GLYPH_H * scale + 2 * scale, height - y)
  if (boxWidth <= 0 || boxHeight <= 0) return

  for (let by = 0; by < boxHeight; by += 1) {
    for (let bx = 0; bx < boxWidth; bx += 1) blend(bitmap, width, x + bx, y + by, 0, 0, 0, 0.72)
  }

  let cursor = x + scale
  for (const char of text) {
    const glyph = FONT[char] ?? FONT[' ']
    for (let row = 0; row < GLYPH_H; row += 1) {
      for (let col = 0; col < GLYPH_W; col += 1) {
        if (glyph[row][col] !== '1') continue
        for (let sy = 0; sy < scale; sy += 1) {
          for (let sx = 0; sx < scale; sx += 1) {
            blend(bitmap, width, cursor + col * scale + sx, y + scale + row * scale + sy, 255, 255, 255, 0.95)
          }
        }
      }
    }
    cursor += advance
    if (cursor >= x + boxWidth) break
  }
}
