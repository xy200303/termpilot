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
 * 截终端画面。设置里的「合成算法」打开时，当前画面、滚动缓冲、选中范围和助手调用都按缓冲拼图。
 * 关闭时，当前这一屏用 capturePage。更长的范围滚到那一行再逐屏拍。
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
    if (composeOn()) {
      const info = terminalPool.pageInfo(opts.termId)
      if (!info) throw new Error('终端不在画面上')
      const start = info.viewportY
      const end = Math.min(info.length, start + Math.max(1, info.rows))
      if (end <= start) throw new Error('没有可截的画面')
      const done = await captureReplay(opts.termId, start, end, info.length, start, end)
      const last = end - 1
      return { paths: done.paths, note: `当前画面是第 ${start}–${Math.max(start, last)} 行` }
    }
    const shot = await grab(opts.termId)
    const paths = await window.api.capture.save([shot.png])
    const last = shot.viewportY + shot.rows - 1
    return { paths, note: `当前画面是第 ${shot.viewportY}–${Math.max(shot.viewportY, last)} 行` }
  }

  const info = terminalPool.pageInfo(opts.termId)
  if (!info) throw new Error('终端不在画面上')
  const rows = Math.max(1, info.rows)
  const total = info.length
  const wantStart = opts.startLine ?? 0
  let wantEnd = opts.endLine ?? total
  let start = wantStart
  let end = wantEnd
  if (opts.cropOnly) {
    if (start >= total) throw new Error(`行号超出缓冲，一共 ${total} 行`)
    end = Math.min(end, total)
    wantEnd = end
    if (end <= start) throw new Error('范围内没有行')
  } else if (end <= start) {
    end = start + rows
    wantEnd = end
  }
  const maxRows = rows * MAX_PAGES
  const explicit = opts.startLine !== undefined || opts.endLine !== undefined
  if (!explicit && end - start > maxRows) start = end - maxRows
  const capped = Math.min(end, start + maxRows)
  if (composeOn()) return captureReplay(opts.termId, start, capped, total, wantStart, wantEnd)
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
  const rangeNote = bufferNote(total, start, covered, wantStart, wantEnd)
  if (opts.cropOnly) return { paths: longPaths, note: rangeNote }
  const framePaths = await window.api.capture.save(shots.map((shot) => shot.png))
  if (shots.length === 1 && shots[0]?.skipRows === 0 && shots[0].keepRows === shots[0].rows) {
    return { paths: framePaths, note: rangeNote }
  }
  const note = `前 ${framePaths.length} 张是逐屏实拍，后面 ${longPaths.length} 张是按行连续接成的长图。${rangeNote}`
  return { paths: [...framePaths, ...longPaths], note }
}

const COMPOSE_FAILED = '合成没有画出来。请到设置里关掉「合成算法」。'

function composeOn(): boolean {
  return useAppStore.getState().appearance.experimentalScreenshot
}

async function captureReplay(
  termId: string,
  start: number,
  capped: number,
  total: number,
  wantStart: number,
  wantEnd: number
): Promise<CaptureDone> {
  const drawn = await replayCanvases(termId, start, capped)
  return deliverReplay(drawn.pngs, total, start, drawn.covered, wantStart, wantEnd)
}

async function replayCanvases(
  termId: string,
  start: number,
  capped: number
): Promise<{ pngs: string[]; covered: number }> {
  const look = terminalPool.look(termId)
  const rect = terminalPool.screenRect(termId)
  if (!look || !rect) throw new Error('终端不在画面上')
  const pageRows = Math.max(1, look.rows)
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
  _look: TermLook,
  termId: string,
  start: number,
  end: number,
  cellWidth: number,
  cellHeight: number
): Promise<string> {
  try {
    const png = terminalPool.composeRange(termId, start, end, cellWidth, cellHeight)
    if (!png) throw new Error('终端不在画面上')
    return png
  } catch (error) {
    if (error instanceof Error && error.message === '终端不在画面上') throw error
    throw new Error(COMPOSE_FAILED)
  }
}

async function deliverReplay(
  pngs: string[],
  total: number,
  start: number,
  covered: number,
  wantStart: number,
  wantEnd: number
): Promise<CaptureDone> {
  const images =
    pngs.length === 1 ? pngs : await stitch(pngs.map((png) => ({ png, skipRows: 0, keepRows: 1, rows: 1 })))
  const paths = await window.api.capture.save(images)
  return { paths, note: bufferNote(total, start, covered, wantStart, wantEnd) }
}

/** 没截全时必须写出来。以前先把起点收到末尾，截完又刚好盖住这段，提示就不会出现。 */
function bufferNote(total: number, from: number, covered: number, wantStart: number, wantEnd: number): string {
  const to = Math.max(from, covered - 1)
  const text = `缓冲共 ${total} 行，已截取第 ${from}–${to} 行`
  if (from > wantStart || covered < wantEnd) return `${text}（超出上限）`
  return text
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
    ctx.imageSmoothingEnabled = false
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
