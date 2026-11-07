import type { DesktopWaitInput } from '../../../shared/desktop-agent'

export interface CanvasCapture {
  pngBase64: string
  width: number
  height: number
}

/** 只取原始画面；坐标网格统一由主进程合成，三种桌面来源保持一致。 */
export function captureCanvas(canvas: HTMLCanvasElement): CanvasCapture {
  if (canvas.width === 0 || canvas.height === 0) throw new Error('桌面画面尚未加载，请等待连接完成后再截图')
  const output = document.createElement('canvas')
  output.width = canvas.width
  output.height = canvas.height
  const context = output.getContext('2d')
  if (!context) throw new Error('无法创建截图画布')
  context.drawImage(canvas, 0, 0)
  return {
    pngBase64: output.toDataURL('image/png').split(',')[1],
    width: output.width,
    height: output.height
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
