import { nativeImage, type NativeImage, type WebContents } from 'electron'

export type GridRenderOptions = {
  step: number
  // 数字标注的间隔；默认取 max(step, 100)，细网格只画线不标数字，避免标签互相压住
  labelStep?: number
  // 这张图左上角对应的坐标值：整页/整窗截图是 0，局部截图是裁剪起点在页面里的坐标
  originX?: number
  originY?: number
  // 局部截图固定显示角标（包括 0,0），整页/整窗不显示
  showOrigin?: boolean
  // 这张图覆盖的 CSS 尺寸，用来把图片像素换算回 CSS 坐标
  spanWidth: number
  spanHeight: number
}

export type GridPalette = {
  name: 'red' | 'blue' | 'light'
  lineRgb: string
  lineAlpha: number
  labelRgba: string
  haloRgba: string
  chipBg: string
  chipFg: string
}

const SAMPLE_TARGET = 4000
const BLOCK = 32
const MIN_COLOR_CONTRAST = 4.5

function channel(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** WCAG 2.1 相对亮度。 */
function luminance(r: number, g: number, b: number): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG 对比度，1 表示完全一样，21 是黑白。 */
function contrast(a: number, b: number): number {
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  return (hi + 0.05) / (lo + 0.05)
}

const LUM_RED = luminance(185, 28, 28)
const LUM_BLUE = luminance(29, 78, 216)

function alphaFor(step: number): number {
  return step >= 50 ? 0.44 : step >= 20 ? 0.34 : 0.28
}

function redPalette(step: number): GridPalette {
  return {
    name: 'red',
    lineRgb: '185,28,28',
    lineAlpha: alphaFor(step),
    labelRgba: 'rgba(185,28,28,0.95)',
    haloRgba: 'rgba(255,255,255,0.88)',
    chipBg: 'rgba(255,255,255,0.86)',
    chipFg: 'rgba(185,28,28,0.95)'
  }
}

function bluePalette(step: number): GridPalette {
  return {
    name: 'blue',
    lineRgb: '29,78,216',
    lineAlpha: alphaFor(step) + 0.06,
    labelRgba: 'rgba(29,78,216,0.96)',
    haloRgba: 'rgba(255,255,255,0.9)',
    chipBg: 'rgba(255,255,255,0.9)',
    chipFg: 'rgba(29,78,216,0.97)'
  }
}

function lightPalette(step: number): GridPalette {
  return {
    name: 'light',
    lineRgb: '255,255,255',
    lineAlpha: alphaFor(step) + 0.11,
    labelRgba: 'rgba(255,255,255,0.96)',
    haloRgba: 'rgba(0,0,0,0.62)',
    chipBg: 'rgba(0,0,0,0.64)',
    chipFg: 'rgba(255,255,255,0.97)'
  }
}

/**
 * 采样整张图的平均颜色。位图是 BGRA，按内存等距抽样，不关心宽高比。
 */
function averageColor(image: NativeImage): { r: number; g: number; b: number } | undefined {
  const data = image.toBitmap()
  const pixels = Math.floor(data.length / 4)
  if (pixels === 0) return undefined
  const stride = Math.max(1, Math.floor(Math.sqrt(pixels / SAMPLE_TARGET)))
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let p = 0; p < pixels; p += stride) {
    const i = p * 4
    if (data[i + 3] < 16) continue
    b += data[i]
    g += data[i + 1]
    r += data[i + 2]
    n += 1
  }
  if (n === 0) return undefined
  return { r: r / n, g: g / n, b: b / n }
}

/**
 * 把画面切成 32px 小块并标出明暗，用 '1' 表示深底。
 * 网格线逐段取色，同一张图里亮暗各半时两边都看得清。
 */
export function lineToneMap(image: NativeImage): { bw: number; bh: number; flags: string } {
  const data = image.toBitmap()
  const size = image.getSize()
  const bw = Math.ceil(size.width / BLOCK)
  const bh = Math.ceil(size.height / BLOCK)
  const red = new Float32Array(bw * bh)
  const green = new Float32Array(bw * bh)
  const blue = new Float32Array(bw * bh)
  const counts = new Uint32Array(bw * bh)
  for (let y = 0; y < size.height; y += 2) {
    const row = Math.floor(y / BLOCK) * bw
    for (let x = 0; x < size.width; x += 2) {
      const i = (y * size.width + x) * 4
      const cell = row + Math.floor(x / BLOCK)
      blue[cell] += data[i]
      green[cell] += data[i + 1]
      red[cell] += data[i + 2]
      counts[cell] += 1
    }
  }
  let flags = ''
  for (let i = 0; i < counts.length; i += 1) {
    const n = counts[i] > 0 ? counts[i] : 1
    const lum = luminance(red[i] / n, green[i] / n, blue[i] / n)
    // 彩色线够清楚就用彩色；不够就在黑白里挑对比更高的那个。
    const cr = contrast(lum, LUM_RED)
    const cb = contrast(lum, LUM_BLUE)
    if (Math.max(cr, cb) >= MIN_COLOR_CONTRAST) flags += cr >= cb ? '0' : '1'
    else flags += contrast(lum, 1) >= contrast(lum, 0) ? '2' : '3'
  }
  return { bw, bh, flags }
}

function lineColors(step: number): Record<string, { rgb: string; alpha: number }> {
  const base = alphaFor(step)
  return {
    '0': { rgb: '185,28,28', alpha: base },
    '1': { rgb: '29,78,216', alpha: base + 0.06 },
    '2': { rgb: '255,255,255', alpha: base + 0.11 },
    '3': { rgb: '0,0,0', alpha: base + 0.06 }
  }
}

/**
 * 按背景自动选色：深底用白线，饱和的中低亮底色用白线，
 * 浅红/粉底用蓝线（红线和背景撞色），其余用红线。
 */
export function chooseGridPalette(image: NativeImage, step: number): GridPalette {
  const color = averageColor(image)
  if (!color) return redPalette(step)
  const lum = (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255
  const max = Math.max(color.r, color.g, color.b)
  const min = Math.min(color.r, color.g, color.b)
  const chroma = (max - min) / 255
  if (lum < 0.42 || (chroma > 0.2 && lum < 0.72)) return lightPalette(step)
  if (color.r > color.g + 18 && color.r > color.b + 18) return bluePalette(step)
  return redPalette(step)
}

/**
 * 给一张截图叠加坐标网格：先按图像内容选配色，再在渲染进程里用 canvas 合成。
 * 不往被截的页面里注入任何东西，所以不会闪、也不会改页面布局。
 * 返回新图；取色或绘制失败时返回原图。
 */
export async function renderGrid(wc: WebContents, image: NativeImage, options: GridRenderOptions): Promise<NativeImage> {
  const step = Math.round(Number(options.step) || 0)
  const size = image.getSize()
  if (step < 5 || size.width < 2 || size.height < 2) return image

  const spanWidth = Math.max(1, Number(options.spanWidth) || size.width)
  const spanHeight = Math.max(1, Number(options.spanHeight) || size.height)
  const originX = Number(options.originX) || 0
  const originY = Number(options.originY) || 0
  const showOrigin = Boolean(options.showOrigin)
  const labelStep = Math.max(step, Math.round(Number(options.labelStep) || 0) || 100)
  const palette = chooseGridPalette(image, step)
  const colors = lineColors(step)
  const tone = lineToneMap(image)

  try {
    const dataUrl = image.toDataURL()
    const script = `(async () => {
      const STEP = ${step}
      const LABEL_STEP = ${labelStep}
      const ORIGIN_X = ${originX}
      const ORIGIN_Y = ${originY}
      const SPANW = ${spanWidth}
      const SPANH = ${spanHeight}
      const LINE_RGB = ${JSON.stringify(palette.lineRgb)}
      const LINE_ALPHA = ${palette.lineAlpha}
      const LABEL_RGBA = ${JSON.stringify(palette.labelRgba)}
      const HALO_RGBA = ${JSON.stringify(palette.haloRgba)}
      const CHIP_BG = ${JSON.stringify(palette.chipBg)}
      const CHIP_FG = ${JSON.stringify(palette.chipFg)}
      const BLOCK = ${BLOCK}
      const TONE_W = ${tone.bw}
      const TONE_H = ${tone.bh}
      const TONE = ${JSON.stringify(tone.flags)}
      const LINE_COLORS = ${JSON.stringify(colors)}
      const img = new Image()
      img.src = ${JSON.stringify(dataUrl)}
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return ''
      ctx.drawImage(img, 0, 0)

      const sx = canvas.width / SPANW
      const sy = canvas.height / SPANH
      const font = Math.max(9, Math.min(16, Math.round(10 * Math.min(sx, sy))))
      ctx.font = font + 'px ui-monospace, SFMono-Regular, Menlo, monospace'
      ctx.textBaseline = 'top'
      const hasChip = ${showOrigin ? 'true' : 'false'}
      // 标签跟着所在小块的线色走，白底上就不会出现白字
      const colorKeyAt = (x, y) => {
        const bx = Math.min(TONE_W - 1, Math.max(0, Math.floor(x / BLOCK)))
        const by = Math.min(TONE_H - 1, Math.max(0, Math.floor(y / BLOCK)))
        return TONE[by * TONE_W + bx]
      }
      const label = (text, x, y) => {
        // 标签用描边打底，必须 save/restore，否则会改掉线条的 strokeStyle
        const key = colorKeyAt(x, y)
        const color = LINE_COLORS[key] || LINE_COLORS['0']
        ctx.save()
        ctx.font = font + 'px ui-monospace, SFMono-Regular, Menlo, monospace'
        ctx.textBaseline = 'top'
        ctx.lineWidth = 3
        ctx.strokeStyle = key === '2' ? 'rgba(0,0,0,0.62)' : 'rgba(255,255,255,0.9)'
        ctx.strokeText(text, x, y)
        ctx.lineWidth = 1
        ctx.fillStyle = 'rgba(' + color.rgb + ',0.96)'
        ctx.fillText(text, x, y)
        ctx.restore()
      }
      // 每 32px 一段按局部底色换线色，同一张图亮暗各半也不会有一边看不见
      const paintRun = (vertical, fixed, from, to) => {
        // 竖线固定的是 x，横线固定的是 y；另一个方向决定段落在哪一块
        const bx = Math.min(TONE_W - 1, Math.max(0, Math.floor((vertical ? fixed : from) / BLOCK)))
        const by = Math.min(TONE_H - 1, Math.max(0, Math.floor((vertical ? from : fixed) / BLOCK)))
        const color = LINE_COLORS[TONE[by * TONE_W + bx]] || LINE_COLORS['0']
        ctx.strokeStyle = 'rgba(' + color.rgb + ',' + color.alpha + ')'
        ctx.beginPath()
        if (vertical) {
          ctx.moveTo(Math.round(fixed) + 0.5, from)
          ctx.lineTo(Math.round(fixed) + 0.5, to)
        } else {
          ctx.moveTo(from, Math.round(fixed) + 0.5)
          ctx.lineTo(to, Math.round(fixed) + 0.5)
        }
        ctx.stroke()
      }

      ctx.lineWidth = 1
      // 数字按「第几条线」抽稀，保证标签一定落在线上
      const labelEvery = Math.max(1, Math.round(LABEL_STEP / STEP))
      let indexX = 0
      for (let gx = 0; gx * sx <= canvas.width - 1; gx += STEP) {
        const x = gx * sx
        for (let y = 0; y < canvas.height; ) {
          const end = Math.min(canvas.height, (Math.floor(y / BLOCK) + 1) * BLOCK)
          paintRun(true, x, y, end)
          y = end
        }
        if (indexX % labelEvery === 0 && !(hasChip && gx === 0)) label(String(Math.round(ORIGIN_X + gx)), Math.min(canvas.width - font * 3, Math.round(x) + 3), 3)
        indexX += 1
      }
      let indexY = 0
      for (let gy = 0; gy * sy <= canvas.height - 1; gy += STEP) {
        const y = gy * sy
        for (let x = 0; x < canvas.width; ) {
          const end = Math.min(canvas.width, (Math.floor(x / BLOCK) + 1) * BLOCK)
          paintRun(false, y, x, end)
          x = end
        }
        if (indexY % labelEvery === 0 && !(hasChip && gy === 0)) label(String(Math.round(ORIGIN_Y + gy)), 4, Math.min(canvas.height - font - 1, Math.round(y) + 2))
        indexY += 1
      }
      // 角标最后画，盖在线条和数字上面
      if (hasChip) {
        const chip = '(' + Math.round(ORIGIN_X) + ', ' + Math.round(ORIGIN_Y) + ')'
        const tw = ctx.measureText(chip).width
        ctx.fillStyle = CHIP_BG
        ctx.fillRect(0, 0, tw + 4, font + 4)
        ctx.fillStyle = CHIP_FG
        ctx.fillText(chip, 2, 2)
      }
      return canvas.toDataURL('image/png')
    })()`
    const out = (await wc.executeJavaScript(script, true)) as string
    if (!out || !out.startsWith('data:image/png;base64,')) return image
    const drawn = nativeImage.createFromDataURL(out)
    return drawn.isEmpty() ? image : drawn
  } catch {
    return image
  }
}
