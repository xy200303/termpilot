import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import type { WebContents } from 'electron'
import { IPC } from '../../../shared/ipc-channels'
import type { DesktopAgentInput, DesktopAgentReply, DesktopRegion } from '../../../shared/desktop-agent'
import type { DesktopService } from './DesktopService'
import { NativeAgentService } from './NativeAgentService'
import { cropPng, withGrid } from './pngGrid'

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

  async run(viewId: string, input: DesktopAgentInput): Promise<string> {
    const protocol = this.desktop.protocolOf(viewId)
    if (!protocol) throw new Error('桌面不存在或已关闭，请先 connection_open')
    const grid = gridSpacing(input)
    const region = input.action === 'screenshot' ? input.region : undefined
    if (protocol !== 'vnc' && protocol !== 'rdp') {
      const pid = this.desktop.nativePid(viewId)
      if (!pid) throw new Error('原生客户端进程不存在或已退出')
      const result = await this.nativeAgent.run(pid, input)
      if (!result.file) return result.note
      const done = decorate(result.file, grid, region)
      return `${result.note}${done.suffix}\n${result.file}`
    }

    const label = protocol.toUpperCase()
    const wc = this.sender()
    if (!wc || wc.isDestroyed()) throw new Error(`窗口不可用，无法操作 ${label}`)
    const id = randomUUID()
    const timeoutMs = input.action === 'wait'
      ? Math.max(input.ms ?? 500, (input.stableMs ?? 0) > 0 ? (input.timeoutMs ?? 10_000) : 0) + 5000
      : 15_000
    const reply = await new Promise<DesktopAgentReply>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`桌面操作超时，请确认 ${label} 标签仍在当前窗口中`))
      }, timeoutMs)
      this.pending.set(id, (result) => {
        clearTimeout(timer)
        resolve(result)
      })
      wc.send(IPC.desktopAgentRun, { id, viewId, input, protocol })
    })
    if (reply.error) throw new Error(reply.error)
    if (reply.pngBase64) {
      const dir = join(app.getPath('userData'), 'screenshots')
      mkdirSync(dir, { recursive: true })
      const file = join(dir, `desktop-${viewId}-${Date.now()}.png`)
      writeFileSync(file, Buffer.from(reply.pngBase64, 'base64'))
      const done = decorate(file, grid, region)
      const note = reply.note ?? `${label} 画面已截取`
      return `${note}${done.suffix}\n${file}`
    }
    return reply.note ?? '已完成'
  }

  async runMany(viewId: string, inputs: DesktopAgentInput[]): Promise<string> {
    const results: string[] = []
    for (const input of inputs) results.push(await this.run(viewId, input))
    return results.join('\n')
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

/** 在落盘的截图上裁区域、叠网格，返回要拼到回复里的说明。 */
function decorate(file: string, spacing: number, region?: DesktopRegion): { suffix: string } {
  const buffer = readFileSync(file)
  const cropped = region
    ? cropPng(buffer, region)
    : { png: buffer, x: 0, y: 0, width: 0, height: 0, fullWidth: 0, fullHeight: 0 }
  const gridded = spacing > 0 ? withGrid(cropped.png, spacing, cropped.x, cropped.y) : null
  const out = gridded ?? cropped.png
  if (out !== buffer) writeFileSync(file, out)
  const parts: string[] = []
  if (region) {
    parts.push(
      `区域 ${cropped.x},${cropped.y} ${cropped.width}×${cropped.height}，原画面 ${cropped.fullWidth}×${cropped.fullHeight}，刻度是整屏坐标`
    )
  }
  if (gridded) parts.push(`网格 ${spacing}px`)
  return { suffix: parts.length > 0 ? `，${parts.join('；')}` : '' }
}
