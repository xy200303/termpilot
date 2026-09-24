import type { CaptureRect, CaptureRun } from '../../../shared/types'
import { useAppStore } from '../stores/useAppStore'
import { terminalPool } from './TerminalPool'

const MAX_PAGES = 20
const MAX_STITCH_HEIGHT = 16000

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
 * 截终端视图上已经画出来的画面。
 * 当前画面用 capturePage 抓字符网格。
 * 长图按缓冲区行号逐屏下滚。整屏直接接上；最后不满一屏时，
 * 只保留这一屏底部新出现的行，裁掉和上一屏重复的上半部分。
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
  const saved = info.viewportY
  const shots: PageShot[] = []
  let covered = start
  try {
    while (covered < capped && shots.length < MAX_PAGES) {
      terminalPool.scrollTo(opts.termId, covered)
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
  const rangeNote = `第 ${start}–${Math.max(start, capped - 1)} 行`
  if (opts.cropOnly) {
    return {
      paths: longPaths,
      note: [rangeNote, capped < end ? `范围较长，只截了 ${MAX_PAGES} 屏` : ''].filter(Boolean).join('。')
    }
  }
  const framePaths = await window.api.capture.save(shots.map((shot) => shot.png))
  if (shots.length === 1 && shots[0]?.skipRows === 0 && shots[0].keepRows === shots[0].rows) {
    return { paths: framePaths, note: capped < end ? `范围较长，只截了前 ${MAX_PAGES} 屏` : undefined }
  }
  const note = [
    `前 ${framePaths.length} 张是逐屏实拍，后面 ${longPaths.length} 张是按行连续接成的长图`,
    capped < end ? `范围较长，只截了 ${MAX_PAGES} 屏` : ''
  ]
    .filter(Boolean)
    .join('。')
  return { paths: [...framePaths, ...longPaths], note }
}

export async function runCapture(job: CaptureRun): Promise<void> {
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

async function grab(termId: string): Promise<{ png: string; viewportY: number; rows: number }> {
  await paint()
  const rect = terminalPool.screenRect(termId)
  const info = terminalPool.pageInfo(termId)
  if (!rect || !info) throw new Error('终端不在画面上')
  return { png: await window.api.capture.page(rect), viewportY: info.viewportY, rows: info.rows }
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
