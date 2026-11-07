import type { DesktopWaitInput } from '../../../shared/desktop-agent'

export interface CanvasCapture {
  pngBase64: string
  width: number
  height: number
  grid?: number
}

export function captureCanvas(canvas: HTMLCanvasElement, grid?: boolean | number): CanvasCapture {
  if (canvas.width === 0 || canvas.height === 0) throw new Error('桌面画面尚未加载，请等待连接完成后再截图')
  const spacing = grid === true ? 100 : typeof grid === 'number' ? grid : 0
  const output = document.createElement('canvas')
  output.width = canvas.width
  output.height = canvas.height
  const context = output.getContext('2d')
  if (!context) throw new Error('无法创建截图画布')
  context.drawImage(canvas, 0, 0)
  if (spacing > 0) drawGrid(context, output.width, output.height, spacing)
  return {
    pngBase64: output.toDataURL('image/png').split(',')[1],
    width: output.width,
    height: output.height,
    grid: spacing || undefined
  }
}

export async function waitForCanvas(canvas: HTMLCanvasElement, input: DesktopWaitInput): Promise<{ note: string }> {
  const ms = Math.max(0, Math.min(input.ms ?? 500, 60_000))
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms))
  const stableMs = Math.max(0, Math.min(input.stableMs ?? 0, 60_000))
  if (stableMs === 0) return { note: `已等待 ${ms}ms` }
  const timeoutMs = Math.max(100, Math.min(input.timeoutMs ?? 10_000, 60_000))
  const started = Date.now()
  let previous = canvasSignature(canvas)
  let stableSince = started
  while (Date.now() - started < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const current = canvasSignature(canvas)
    if (current !== previous) {
      previous = current
      stableSince = Date.now()
    } else if (Date.now() - stableSince >= stableMs) {
      return { note: `画面已稳定 ${stableMs}ms（另固定等待 ${ms}ms）` }
    }
  }
  throw new Error(`等待画面稳定超时（${timeoutMs}ms）`)
}

function canvasSignature(canvas: HTMLCanvasElement): string {
  const sample = document.createElement('canvas')
  sample.width = 64
  sample.height = 36
  const context = sample.getContext('2d', { willReadFrequently: true })
  if (!context) return String(Date.now())
  context.drawImage(canvas, 0, 0, sample.width, sample.height)
  const data = context.getImageData(0, 0, sample.width, sample.height).data
  let hash = 2166136261
  for (let i = 0; i < data.length; i += 4) {
    hash = Math.imul(hash ^ data[i], 16777619)
    hash = Math.imul(hash ^ data[i + 1], 16777619)
    hash = Math.imul(hash ^ data[i + 2], 16777619)
  }
  return String(hash >>> 0)
}

function drawGrid(context: CanvasRenderingContext2D, width: number, height: number, spacing: number): void {
  context.save()
  context.lineWidth = 1
  context.font = '12px sans-serif'
  context.textBaseline = 'top'
  for (let x = spacing; x < width; x += spacing) {
    context.strokeStyle = 'rgba(255, 255, 255, 0.48)'
    context.beginPath()
    context.moveTo(x + 0.5, 0)
    context.lineTo(x + 0.5, height)
    context.stroke()
    label(context, String(x), x + 3, 3)
  }
  for (let y = spacing; y < height; y += spacing) {
    context.strokeStyle = 'rgba(255, 255, 255, 0.48)'
    context.beginPath()
    context.moveTo(0, y + 0.5)
    context.lineTo(width, y + 0.5)
    context.stroke()
    label(context, String(y), 3, y + 3)
  }
  label(context, `0,0 · ${width}×${height} · ${spacing}px/格`, 3, 3)
  context.restore()
}

function label(context: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  const width = context.measureText(text).width
  context.fillStyle = 'rgba(0, 0, 0, 0.72)'
  context.fillRect(x - 2, y - 2, width + 4, 16)
  context.fillStyle = '#ffffff'
  context.fillText(text, x, y)
}
