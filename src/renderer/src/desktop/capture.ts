import type { DesktopWaitInput } from '../../../shared/desktop-agent'
import i18n from '../i18n'

const tr = (key: string, params?: Record<string, string | number>): string =>
  String(i18n.t(key, { ...(params ?? {}), defaultValue: key }))

export interface CanvasCapture {
  /** PNG 字节，直接过 IPC；不再在渲染进程里编码成 base64 字符串 */
  png: Uint8Array
  width: number
  height: number
}

/** 只取原始画面；坐标网格统一由主进程合成，三种桌面来源保持一致。 */
export async function captureCanvas(canvas: HTMLCanvasElement): Promise<CanvasCapture> {
  if (canvas.width === 0 || canvas.height === 0) throw new Error(tr('capture.not_ready'))
  const output = document.createElement('canvas')
  output.width = canvas.width
  output.height = canvas.height
  const context = output.getContext('2d')
  if (!context) throw new Error(tr('capture.canvas_failed'))
  context.drawImage(canvas, 0, 0)
  const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error(tr('capture.canvas_failed'))
  return {
    png: new Uint8Array(await blob.arrayBuffer()),
    width: output.width,
    height: output.height
  }
}

/** 截图尺寸和当前画布不同时，把坐标按比例换算到当前画面。 */
export function scaleToCanvas(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  fromWidth?: number,
  fromHeight?: number
): { x: number; y: number; scaled: boolean } {
  const sx = fromWidth && fromWidth > 0 && fromWidth !== canvas.width ? canvas.width / fromWidth : 1
  const sy = fromHeight && fromHeight > 0 && fromHeight !== canvas.height ? canvas.height / fromHeight : 1
  return { x: Math.round(x * sx), y: Math.round(y * sy), scaled: sx !== 1 || sy !== 1 }
}

export async function waitForCanvas(canvas: HTMLCanvasElement, input: DesktopWaitInput): Promise<{ note: string }> {
  const ms = Math.max(0, Math.min(input.ms ?? 500, 60_000))
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms))
  const stableMs = Math.max(0, Math.min(input.stableMs ?? 0, 60_000))
  if (stableMs === 0) return { note: tr('capture.waited', { ms }) }
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
      return { note: tr('capture.stable', { ms: stableMs, fixed: ms }) }
    }
  }
  throw new Error(tr('capture.stable_timeout', { ms: timeoutMs }))
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
