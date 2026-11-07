import { nativeImage, type NativeImage, type WebContents } from 'electron'
import { pickLineColor } from './color'
import { buildGridScript } from './gridScript'

export type GridRenderOptions = {
  step: number
  /** 数字标注间隔，默认 max(step, 100)，细网格只画线不标数字。 */
  labelStep?: number
  /** 这张图左上角对应的坐标值；整屏为 0，局部截图为裁剪起点。 */
  originX?: number
  originY?: number
  /** 局部截图显示起点角标，整屏不显示。 */
  showOrigin?: boolean
  /** 这张图覆盖的 CSS 尺寸，用来把图片像素换算回 CSS 坐标。 */
  spanWidth: number
  spanHeight: number
}

const BLOCK = 32

function alphaFor(step: number): number {
  return step >= 50 ? 0.55 : step >= 20 ? 0.4 : 0.32
}

/** 每 32px 小块算一个线色，相近颜色合并，返回索引表和颜色表。 */
function buildLineMap(image: NativeImage): { width: number; height: number; tone: number[]; colors: string[] } {
  const data = image.toBitmap()
  const size = image.getSize()
  const width = Math.ceil(size.width / BLOCK)
  const height = Math.ceil(size.height / BLOCK)
  const cells = width * height
  const red = new Float32Array(cells)
  const green = new Float32Array(cells)
  const blue = new Float32Array(cells)
  const counts = new Uint32Array(cells)
  for (let y = 0; y < size.height; y += 2) {
    const row = Math.floor(y / BLOCK) * width
    for (let x = 0; x < size.width; x += 2) {
      const i = (y * size.width + x) * 4
      const cell = row + Math.floor(x / BLOCK)
      blue[cell] += data[i]
      green[cell] += data[i + 1]
      red[cell] += data[i + 2]
      counts[cell] += 1
    }
  }

  const colors: string[] = []
  const lookup = new Map<string, number>()
  const tone: number[] = []
  for (let i = 0; i < cells; i += 1) {
    const n = counts[i] > 0 ? counts[i] : 1
    const line = pickLineColor({ r: red[i] / n, g: green[i] / n, b: blue[i] / n })
    const key = `${line.r >> 2},${line.g >> 2},${line.b >> 2}`
    let index = lookup.get(key)
    if (index === undefined) {
      index = colors.length
      lookup.set(key, index)
      colors.push(`${line.r},${line.g},${line.b}`)
    }
    tone.push(index)
  }
  return { width, height, tone, colors }
}

/** 在渲染进程里给截图叠网格；失败时返回原图。 */
export async function renderGrid(wc: WebContents, image: NativeImage, options: GridRenderOptions): Promise<NativeImage> {
  const step = Math.round(Number(options.step) || 0)
  const size = image.getSize()
  if (step < 5 || size.width < 2 || size.height < 2) return image

  const lineMap = buildLineMap(image)
  const script = buildGridScript({
    step,
    labelStep: Math.max(step, Math.round(Number(options.labelStep) || 0) || 100),
    originX: Number(options.originX) || 0,
    originY: Number(options.originY) || 0,
    spanWidth: Math.max(1, Number(options.spanWidth) || size.width),
    spanHeight: Math.max(1, Number(options.spanHeight) || size.height),
    showOrigin: Boolean(options.showOrigin),
    alpha: alphaFor(step),
    block: BLOCK,
    toneWidth: lineMap.width,
    toneHeight: lineMap.height,
    tone: lineMap.tone,
    colors: lineMap.colors,
    dataUrl: image.toDataURL()
  })

  try {
    const out = (await wc.executeJavaScript(script, true)) as string
    if (!out || !out.startsWith('data:image/png;base64,')) return image
    const drawn = nativeImage.createFromDataURL(out)
    return drawn.isEmpty() ? image : drawn
  } catch {
    return image
  }
}
