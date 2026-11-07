import { nativeImage } from 'electron'

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
 */
export function withGrid(png: Buffer, spacing: number): Buffer | null {
  if (!Number.isFinite(spacing) || spacing < 8) return null
  const image = nativeImage.createFromBuffer(png)
  if (image.isEmpty()) return null
  const { width, height } = image.getSize()
  if (width < spacing || height < spacing) return null
  const bitmap = image.toBitmap()
  if (bitmap.length !== width * height * 4) return null

  const scale = width > 1600 ? 2 : 1
  const lineAlpha = 0.48
  const advance = (GLYPH_W + 1) * scale

  // 间距太密时跳过部分刻度文字，只保留能读得清的那几行。
  const labelRoom = 4 * advance + 8
  const vStep = Math.max(1, Math.ceil(labelRoom / spacing))
  for (let i = 1, x = spacing; x < width; x += spacing, i += 1) {
    for (let y = 0; y < height; y += 1) blend(bitmap, width, x, y, 255, 255, 255, lineAlpha)
    if (i % vStep === 0 && x + 3 + String(x).length * advance + 3 < width) {
      drawText(bitmap, width, height, String(x), x + 3, 3, scale)
    }
  }
  const hStep = Math.max(1, Math.ceil((GLYPH_H * scale + 6) / spacing))
  for (let i = 1, y = spacing; y < height; y += spacing, i += 1) {
    for (let x = 0; x < width; x += 1) blend(bitmap, width, x, y, 255, 255, 255, lineAlpha)
    if (i % hStep === 0) drawText(bitmap, width, height, String(y), 3, y + 3, scale)
  }

  // 尺寸和间距的说明放在右下角，避开左上角的第一列刻度。
  const summary = `${width}x${height} ${spacing}px`
  const summaryWidth = summary.length * advance + 2 * scale
  drawText(bitmap, width, height, summary, Math.max(3, width - summaryWidth - 3), Math.max(3, height - GLYPH_H * scale - 5), scale)

  return nativeImage.createFromBitmap(bitmap, { width, height }).toPNG()
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
