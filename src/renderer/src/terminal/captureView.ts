import { Terminal } from '@xterm/xterm'
import { WebglAddon } from '@xterm/addon-webgl'
import type { CaptureRect, CaptureRun } from '../../../shared/types'
import { useAppStore } from '../stores/useAppStore'
import { terminalPool, type TermLook } from './TerminalPool'

const MAX_PAGES = 20
const MAX_STITCH_HEIGHT = 16000
/** 留在主进程 60 秒超时之内，并且给下一次截图留出时间。 */
const CAPTURE_BUDGET_MS = 25_000

export interface CaptureDone {
  paths: string[]
  note?: string
}

interface PageShot {
  png: string
  /** 这一屏顶部已经出现在上一张里的行数 */
  skipRows: number
  /** 这一屏里新出现、要接进长图的行数 */
  keepRows: number
  rows: number
}

/**
 * 截终端画面。
 * 当前这一屏用 capturePage 抓已经画出来的字符网格。
 * 不超过一屏的行范围，滚到那一行再拍。
 * 更长的范围在界面后面另画一块 WebGL 终端，读它自己的画面。画不出来就停。
 */
export async function captureTerminalView(opts: {
  termId: string
  mode: 'viewport' | 'scrollback'
  /** 缓冲行号，含首不含尾 */
  startLine?: number
  endLine?: number
  /** 只保存裁到这个行范围的图 */
  cropOnly?: boolean
}): Promise<CaptureDone> {
  const state = useAppStore.getState()
  if (!state.tabs.some((tab) => tab.id === opts.termId)) {
    throw new Error('终端标签不存在，先连接')
  }
  if (state.activeTabId !== opts.termId) state.setActiveTab(opts.termId)
  await waitVisible(opts.termId)

  if (opts.mode === 'viewport') {
    const shot = await grab(opts.termId)
    const paths = await window.api.capture.save([shot.png])
    const last = shot.viewportY + shot.rows - 1
    return { paths, note: `当前画面是第 ${shot.viewportY}–${Math.max(shot.viewportY, last)} 行` }
  }

  const info = terminalPool.pageInfo(opts.termId)
  if (!info) throw new Error('终端不在画面上')
  const rows = Math.max(1, info.rows)
  let start = opts.startLine ?? 0
  let end = opts.endLine ?? info.length
  if (opts.startLine === undefined && opts.endLine === undefined) {
    start = Math.max(0, info.length - rows * MAX_PAGES)
    end = info.length
  }
  if (opts.cropOnly) {
    if (start >= info.length) throw new Error(`行号超出缓冲，一共 ${info.length} 行`)
    end = Math.min(end, info.length)
    if (end <= start) throw new Error('范围内没有行')
  } else if (end <= start) {
    end = start + rows
  }
  const capped = Math.min(end, start + rows * MAX_PAGES)
  if (useAppStore.getState().appearance.experimentalScreenshot && capped - start > rows) {
    return captureReplay(opts.termId, start, end, capped)
  }
  const saved = info.viewportY
  const shots: PageShot[] = []
  const deadline = performance.now() + CAPTURE_BUDGET_MS
  let covered = start
  try {
    const pageCap = end - start <= rows ? 1 : MAX_PAGES
    while (covered < capped && shots.length < pageCap) {
      if (shots.length > 0 && performance.now() >= deadline) break
      await scrollSettled(opts.termId, covered)
      const shot = await grab(opts.termId)
      const visibleEnd = shot.viewportY + shot.rows
      if (visibleEnd <= covered) break
      const skipRows = Math.max(0, covered - shot.viewportY)
      const keepRows = Math.min(visibleEnd, capped) - covered
      if (keepRows <= 0) break
      shots.push({ png: shot.png, skipRows, keepRows, rows: shot.rows })
      covered += keepRows
    }
  } finally {
    terminalPool.scrollTo(opts.termId, saved)
  }
  if (shots.length === 0) throw new Error('没有可截的画面')

  const longPaths = await window.api.capture.save(await stitch(shots))
  const rangeNote = `第 ${start}–${Math.max(start, covered - 1)} 行`
  const partialNote = covered < end ? `范围较长，只截了 ${shots.length} 屏` : ''
  if (opts.cropOnly) {
    return {
      paths: longPaths,
      note: [rangeNote, partialNote].filter(Boolean).join('。')
    }
  }
  const framePaths = await window.api.capture.save(shots.map((shot) => shot.png))
  if (shots.length === 1 && shots[0]?.skipRows === 0 && shots[0].keepRows === shots[0].rows) {
    return { paths: framePaths, note: partialNote || undefined }
  }
  const note = [
    `前 ${framePaths.length} 张是逐屏实拍，后面 ${longPaths.length} 张是按行连续接成的长图`,
    partialNote
  ]
    .filter(Boolean)
    .join('。')
  return { paths: [...framePaths, ...longPaths], note }
}

/** 显卡单边像素上限。再高的画布容易创建失败。 */
const DEVICE_CAP = 4096
const OFFSCREEN_FAILED = '离开屏幕渲染没有画出来。请到设置里关掉「离开屏幕渲染」。'

async function captureReplay(termId: string, start: number, end: number, capped: number): Promise<CaptureDone> {
  const drawn = await replayCanvases(termId, start, capped)
  return deliverReplay(drawn.pngs, start, drawn.covered, end)
}

async function replayCanvases(
  termId: string,
  start: number,
  capped: number
): Promise<{ pngs: string[]; covered: number }> {
  const look = terminalPool.look(termId)
  const rect = terminalPool.screenRect(termId)
  if (!look || !rect) throw new Error('终端不在画面上')
  const pageRows = maxReplayRows(rect.height / Math.max(1, look.rows))
  const deadline = performance.now() + CAPTURE_BUDGET_MS
  const pngs: string[] = []
  let covered = start
  while (covered < capped && pngs.length < MAX_PAGES) {
    if (pngs.length > 0 && performance.now() >= deadline) break
    const chunkEnd = Math.min(capped, covered + pageRows)
    pngs.push(
      await paintRange(look, termId, covered, chunkEnd, rect.width / look.cols, rect.height / look.rows)
    )
    covered = chunkEnd
  }
  if (pngs.length === 0) throw new Error('没有可截的画面')
  return { pngs, covered }
}

async function paintRange(
  look: TermLook,
  termId: string,
  start: number,
  end: number,
  cellWidth: number,
  cellHeight: number
): Promise<string> {
  const data = terminalPool.rangeAnsi(termId, start, end)
  if (!data) throw new Error('终端不在画面上')
  const rows = Math.max(1, end - start)
  const cols = Math.max(2, look.cols)
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = `position:fixed;left:0;top:0;z-index:0;width:${Math.ceil(cellWidth * cols)}px;height:${Math.ceil(cellHeight * rows)}px;pointer-events:none;overflow:hidden;`
  document.body.appendChild(host)
  const term = new Terminal({
    cols,
    rows,
    fontFamily: look.fontFamily,
    fontSize: look.fontSize,
    lineHeight: look.lineHeight,
    cursorBlink: false,
    scrollback: 0,
    theme: look.theme,
    disableStdin: true,
    allowProposedApi: true
  })
  let webgl: WebglAddon | undefined
  try {
    term.open(host)
    host.style.background = look.background
    webgl = new WebglAddon(true)
    term.loadAddon(webgl)
    await written(term, data)
    term.refresh(0, Math.max(0, term.rows - 1))
    const canvas = await renderedCanvas(host)
    const url = canvas.toDataURL('image/png')
    const comma = url.indexOf(',')
    if (comma < 0) throw new Error(OFFSCREEN_FAILED)
    return url.slice(comma + 1)
  } catch (error) {
    if (error instanceof Error && error.message === '终端不在画面上') throw error
    throw new Error(OFFSCREEN_FAILED)
  } finally {
    webgl?.dispose()
    term.dispose()
    host.remove()
  }
}

async function deliverReplay(pngs: string[], start: number, covered: number, end: number): Promise<CaptureDone> {
  const images =
    pngs.length === 1 ? pngs : await stitch(pngs.map((png) => ({ png, skipRows: 0, keepRows: 1, rows: 1 })))
  const paths = await window.api.capture.save(images)
  return { paths, note: replayNote(start, covered, end) }
}

function replayNote(start: number, covered: number, end: number): string {
  const shown = `第 ${start}–${Math.max(start, covered - 1)} 行`
  const partial = covered < end ? `范围较长，只截了前 ${covered - start} 行` : ''
  return [shown, partial].filter(Boolean).join('。')
}

function maxReplayRows(cellCss: number): number {
  const dpr = window.devicePixelRatio || 1
  const cssCap = Math.floor(DEVICE_CAP / Math.max(1, dpr))
  const heightCap = Math.min(MAX_STITCH_HEIGHT, cssCap)
  return Math.max(1, Math.floor(heightCap / Math.max(1, cellCss)))
}

function written(term: Terminal, data: string): Promise<void> {
  return new Promise((resolve) => term.write(data, () => resolve()))
}

async function renderedCanvas(host: HTMLElement): Promise<HTMLCanvasElement> {
  for (let i = 0; i < 8; i++) {
    await paint()
    const canvas = host.querySelector('.xterm-screen canvas')
    if (canvas instanceof HTMLCanvasElement && canvas.width >= 2 && canvas.height >= 2 && opaque(canvas)) {
      return canvas
    }
  }
  throw new Error(OFFSCREEN_FAILED)
}

function opaque(canvas: HTMLCanvasElement): boolean {
  const gl = canvas.getContext('webgl2', { antialias: false, depth: false, preserveDrawingBuffer: true })
  if (!gl) return false
  const pixel = new Uint8Array(4)
  const x = Math.min(canvas.width - 1, 2)
  const y = Math.max(0, canvas.height - 3)
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  return pixel[3] > 0
}

let captureTail: Promise<void> = Promise.resolve()

export function runCapture(job: CaptureRun): Promise<void> {
  const run = captureTail.then(() => finishCapture(job))
  captureTail = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

async function finishCapture(job: CaptureRun): Promise<void> {
  try {
    const done = await captureTerminalView(job)
    window.api.capture.reply({ id: job.id, paths: done.paths, note: done.note })
  } catch (error) {
    window.api.capture.reply({
      id: job.id,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

/** 等滚动停稳再拍，避免大缓冲还在重绘时调用 capturePage。 */
async function scrollSettled(termId: string, line: number): Promise<void> {
  terminalPool.scrollTo(termId, line)
  let previous = -1
  for (let i = 0; i < 6; i += 1) {
    await paint()
    const info = terminalPool.pageInfo(termId)
    if (!info || info.viewportY === previous) return
    previous = info.viewportY
  }
}

async function grab(termId: string): Promise<{ png: string; viewportY: number; rows: number }> {
  await paint()
  const rect = terminalPool.screenRect(termId)
  const info = terminalPool.pageInfo(termId)
  if (!rect || !info) throw new Error('终端不在画面上')
  return { png: await shoot(rect), viewportY: info.viewportY, rows: info.rows }
}

/** 窗口实拍会把盖在终端上的弹窗和菜单一起拍进去。拍的时候藏起来，拍完恢复。 */
async function shoot(rect: CaptureRect): Promise<string> {
  const hidden = hideFloaters()
  try {
    if (hidden.length > 0) await paint()
    return await window.api.capture.page(rect)
  } finally {
    showFloaters(hidden)
  }
}

const FLOATERS = [
  '[data-slot="dialog-overlay"]',
  '[data-slot="dialog-content"]',
  '[data-slot="context-menu-content"]'
].join(',')

function hideFloaters(): HTMLElement[] {
  const hidden: HTMLElement[] = []
  for (const node of document.querySelectorAll<HTMLElement>(FLOATERS)) {
    node.dataset.shotVisibility = node.style.visibility
    node.style.visibility = 'hidden'
    hidden.push(node)
  }
  return hidden
}

function showFloaters(nodes: HTMLElement[]): void {
  for (const node of nodes) {
    node.style.visibility = node.dataset.shotVisibility ?? ''
    delete node.dataset.shotVisibility
  }
}

function paint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 50)))
  })
}

async function waitVisible(termId: string): Promise<void> {
  const deadline = performance.now() + 2000
  while (performance.now() < deadline) {
    if (terminalPool.screenRect(termId)) return
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
  throw new Error('终端不在画面上')
}

async function stitch(shots: PageShot[]): Promise<string[]> {
  const images = await Promise.all(shots.map((shot) => loadImage(shot.png)))
  const slices = images.map((image, index) => crop(image, shots[index]!))
  const width = slices[0]?.image.naturalWidth ?? 0
  if (width < 2) throw new Error('截图是空的')
  const pages: Array<{ image: HTMLImageElement; sy: number; sh: number }[]> = []
  let batch: Array<{ image: HTMLImageElement; sy: number; sh: number }> = []
  let batchHeight = 0
  for (const slice of slices) {
    if (batch.length > 0 && batchHeight + slice.sh > MAX_STITCH_HEIGHT) {
      pages.push(batch)
      batch = []
      batchHeight = 0
    }
    batch.push(slice)
    batchHeight += slice.sh
  }
  if (batch.length > 0) pages.push(batch)

  return pages.map((group) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = group.reduce((sum, slice) => sum + slice.sh, 0)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法拼接截图')
    let y = 0
    for (const slice of group) {
      ctx.drawImage(
        slice.image,
        0,
        slice.sy,
        slice.image.naturalWidth,
        slice.sh,
        0,
        y,
        width,
        slice.sh
      )
      y += slice.sh
    }
    return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '')
  })
}

/** 整屏原样保留。不满一屏时只留底部新出现的行，按行高从实拍图上裁。 */
function crop(image: HTMLImageElement, shot: PageShot): { image: HTMLImageElement; sy: number; sh: number } {
  if (shot.skipRows === 0 && shot.keepRows === shot.rows) {
    return { image, sy: 0, sh: image.naturalHeight }
  }
  const rowPx = image.naturalHeight / shot.rows
  const sy = Math.min(image.naturalHeight - 1, Math.round(shot.skipRows * rowPx))
  const bottom = Math.min(image.naturalHeight, Math.round((shot.skipRows + shot.keepRows) * rowPx))
  return { image, sy, sh: Math.max(1, bottom - sy) }
}

function loadImage(pngBase64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('截图解码失败'))
    image.src = `data:image/png;base64,${pngBase64}`
  })
}

export type { CaptureRect }
