import { randomUUID } from 'node:crypto'
import { t as mt } from '../../i18n'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, nativeImage } from 'electron'
import type { WebContents } from 'electron'
import { IPC } from '../../../shared/ipc-channels'
import { pruneScreenshots } from '../screenshotFiles'
import type { DesktopAgentInput, DesktopAgentReply, DesktopRegion } from '../../../shared/desktop-agent'
import type { DesktopService } from './DesktopService'
import { NativeAgentService } from './NativeAgentService'
import { renderGrid } from './gridRender'
import { cropPng } from './pngCrop'

/** GUI 面板和 MCP 共用的桌面操作入口。 */
export class DesktopAgentService {
  private pending = new Map<string, (reply: DesktopAgentReply) => void>()
  private nativeAgent = new NativeAgentService()

  constructor(
    private desktop: DesktopService,
    private sender: () => WebContents | null
  ) {}

  list(): Array<{ viewId: string; sessionId: string; protocol: string; mode: string }> {
    return this.desktop.list()
  }

  private lastShot = new Map<string, { width: number; height: number }>()
  private shots = new Map<string, { viewId: string; width: number; height: number }>()

  async run(viewId: string, input: DesktopAgentInput): Promise<string> {
    const protocol = this.desktop.protocolOf(viewId)
    if (!protocol) throw new Error(mt('desktop.missing'))
    const action = withScaleSource(input, this.baseline(viewId, input))
    const grid = gridSpacing(action)
    const region = action.action === 'screenshot' ? action.region : undefined
    if (protocol !== 'vnc' && protocol !== 'rdp') {
      const pid = this.desktop.nativePid(viewId)
      if (!pid) throw new Error(mt('desktop.native_gone'))
      const result = await this.nativeAgent.run(pid, action)
      if (!result.file) return result.note
      const done = await decorate(this.sender(), result.file, grid, region)
      if (done.width > 0 && done.height > 0) this.lastShot.set(viewId, { width: done.width, height: done.height })
      return `${result.note}${done.suffix}\n${result.file}`
    }

    const label = protocol.toUpperCase()
    const wc = this.sender()
    if (!wc || wc.isDestroyed()) throw new Error(mt('desktop.window_unavailable', { label }))
    const id = randomUUID()
    const timeoutMs = action.action === 'wait'
      ? Math.max(action.ms ?? 500, (action.stableMs ?? 0) > 0 ? (action.timeoutMs ?? 10_000) : 0) + 5000
      : 15_000
    const reply = await new Promise<DesktopAgentReply>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(mt('desktop.timeout', { label })))
      }, timeoutMs)
      this.pending.set(id, (result) => {
        clearTimeout(timer)
        resolve(result)
      })
      wc.send(IPC.desktopAgentRun, { id, viewId, input: action, protocol })
    })
    if (reply.error) throw new Error(reply.error)
    if (reply.png) {
      const dir = join(app.getPath('userData'), 'screenshots')
      mkdirSync(dir, { recursive: true })
      const file = join(dir, `desktop-${viewId}-${Date.now()}.png`)
      writeFileSync(file, Buffer.from(reply.png))
      pruneScreenshots()
      const done = await decorate(this.sender(), file, grid, region)
      if (done.width > 0 && done.height > 0) this.lastShot.set(viewId, { width: done.width, height: done.height })
      const note = reply.note ?? mt('desktop.captured', { label })
      return `${note}${done.suffix}\n${file}`
    }
    return reply.note ?? mt('desktop.done')
  }

  async runMany(viewId: string, inputs: DesktopAgentInput[]): Promise<string> {
    const results: string[] = []
    for (const input of inputs) results.push(await this.run(viewId, input))
    return results.join('\n')
  }

  private rememberShot(viewId: string, width: number, height: number): string | undefined {
    if (width <= 0 || height <= 0) return undefined
    this.lastShot.set(viewId, { width, height })
    const id = `shot-${randomUUID().slice(0, 12)}`
    this.shots.set(id, { viewId, width, height })
    if (this.shots.size > 100) {
      const oldest = this.shots.keys().next().value
      if (oldest) this.shots.delete(oldest)
    }
    return id
  }

  /** 点击/滚动的坐标基准：显式图片尺寸 > 指定截图编号 > 该桌面最近一张截图。 */
  private baseline(viewId: string, input: DesktopAgentInput): { width: number; height: number } | undefined {
    if (input.action === 'click' || input.action === 'scroll') {
      if (input.fromWidth || input.fromHeight) return undefined
      if (input.shotId) {
        const shot = this.shots.get(input.shotId)
        if (!shot) throw new Error(mt('desktop.shot_expired', { id: input.shotId }))
        if (shot.viewId !== viewId) throw new Error(mt('desktop.shot_other'))
        return { width: shot.width, height: shot.height }
      }
    }
    return this.lastShot.get(viewId)
  }

  resolve(reply: DesktopAgentReply): void {
    const settle = this.pending.get(reply.id)
    if (!settle) return
    this.pending.delete(reply.id)
    settle(reply)
  }
}

function gridSpacing(input: DesktopAgentInput): number {
  if (input.action !== 'screenshot') return 0
  if (input.grid === true) return 100
  if (typeof input.grid === 'number' && Number.isInteger(input.grid) && input.grid >= 20 && input.grid <= 500) {
    return input.grid
  }
  return 0
}

/** 点击/滚动没显式给截图尺寸时，用这个桌面最近一张截图的尺寸做换算基准。 */
function withScaleSource(input: DesktopAgentInput, last?: { width: number; height: number }): DesktopAgentInput {
  if (!last) return input
  if (input.action !== 'click' && input.action !== 'scroll') return input
  if (input.fromWidth || input.fromHeight) return input
  return { ...input, fromWidth: last.width, fromHeight: last.height }
}

/** 在落盘的截图上裁区域、叠网格，返回说明和整幅画面的尺寸。 */
async function decorate(
  wc: WebContents | null,
  file: string,
  spacing: number,
  region?: DesktopRegion
): Promise<{ suffix: string; width: number; height: number }> {
  const buffer = readFileSync(file)
  const full = nativeImage.createFromBuffer(buffer).getSize()
  const cropped = region ? cropPng(buffer, region) : null
  let out = cropped?.png ?? buffer
  let gridded = false
  if (spacing > 0 && wc && !wc.isDestroyed()) {
    const image = nativeImage.createFromBuffer(out)
    const size = image.getSize()
    const rendered = await renderGrid(wc, image, {
      step: spacing,
      originX: cropped?.x ?? 0,
      originY: cropped?.y ?? 0,
      showOrigin: Boolean(cropped),
      spanWidth: size.width,
      spanHeight: size.height
    })
    if (rendered !== image) {
      out = rendered.toPNG()
      gridded = true
    }
  }
  if (out !== buffer) writeFileSync(file, out)
  const parts: string[] = []
  if (cropped) {
    parts.push(
      mt('desktop.region_note', { x: cropped.x, y: cropped.y, w: cropped.width, h: cropped.height, fw: cropped.fullWidth, fh: cropped.fullHeight })
    )
  }
  if (gridded) parts.push(mt('desktop.grid_note', { spacing }))
  return { suffix: parts.length > 0 ? `，${parts.join('；')}` : '', width: full.width, height: full.height }
}
