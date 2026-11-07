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
  // 按 32px 小块的底色选线色：浅底用深蓝、深底用亮青，半张亮半张暗也不会有一边看不见。
  const tone = buildTone(bitmap, width, height)
  const alpha = spacing >= 50 ? 0.58 : 0.34
  const LIGHT_BG = [37, 99, 235, alpha]
  const DARK_BG = [103, 232, 249, alpha]
  const colorAt = (x: number, y: number): number[] => {
    const bx = Math.min(tone.bw - 1, Math.floor(x / BLOCK))
    const by = Math.min(tone.bh - 1, Math.floor(y / BLOCK))
    return tone.data[by * tone.bw + bx] > 140 ? LIGHT_BG : DARK_BG
  }

  // 左上角标出这块图在原画面里的起点；顶部刻度避开它。
  const origin = `${originX},${originY}`
  const originRight = 3 + origin.length * advance + 4
  drawText(bitmap, width, height, origin, 3, 3, scale)

  // 线按 spacing 画，刻度文字最多每 100px 标一个，细网格也不会糊成一片。
  const labelStep = Math.max(1, Math.ceil(100 / spacing))
  let firstX = Math.ceil(originX / spacing) * spacing
  if (firstX <= originX) firstX += spacing
  for (let i = 0, abs = firstX; abs < originX + width; abs += spacing, i += 1) {
    const x = abs - originX
    for (let y = 0; y < height; ) {
      const color = colorAt(x, y)
      const end = Math.min(height, (Math.floor(y / BLOCK) + 1) * BLOCK)
      for (; y < end; y += 1) blend(bitmap, width, x, y, color[0], color[1], color[2], color[3])
    }
    const text = String(abs)
    if (i % labelStep === 0 && x + 3 > originRight + 4 && x + 3 + text.length * advance + 3 < width) {
      drawText(bitmap, width, height, text, x + 3, 3, scale)
    }
  }
  let firstY = Math.ceil(originY / spacing) * spacing
  if (firstY <= originY) firstY += spacing
  for (let i = 0, abs = firstY; abs < originY + height; abs += spacing, i += 1) {
    const y = abs - originY
    for (let x = 0; x < width; ) {
      const color = colorAt(x, y)
      const end = Math.min(width, (Math.floor(x / BLOCK) + 1) * BLOCK)
      for (; x < end; x += 1) blend(bitmap, width, x, y, color[0], color[1], color[2], color[3])
    }
    if (i % labelStep === 0) drawText(bitmap, width, height, String(abs), 3, y + 3, scale)
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

const BLOCK = 32

/** 把画面切成 BLOCK×BLOCK 的小块，算每块的平均亮度，用来逐段挑网格线颜色。 */
function buildTone(bitmap: Buffer, width: number, height: number): { bw: number; bh: number; data: Float32Array } {
  const bw = Math.ceil(width / BLOCK)
  const bh = Math.ceil(height / BLOCK)
  const sums = new Float32Array(bw * bh)
  const counts = new Uint32Array(bw * bh)
  for (let y = 0; y < height; y += 2) {
    const row = Math.floor(y / BLOCK) * bw
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4
      const cell = row + Math.floor(x / BLOCK)
      sums[cell] += bitmap[i + 2] * 0.299 + bitmap[i + 1] * 0.587 + bitmap[i] * 0.114
      counts[cell] += 1
    }
  }
  const data = new Float32Array(bw * bh)
  for (let i = 0; i < data.length; i += 1) data[i] = counts[i] > 0 ? sums[i] / counts[i] : 128
  return { bw, bh, data }
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
