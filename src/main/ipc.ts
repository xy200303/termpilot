import { app, BrowserWindow, clipboard, ClipboardItem, ipcMain, shell } from 'electron'
import { randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { IPC } from '../shared/ipc-channels'
import {
  MCP_HOST,
  type AgentId,
  type CaptureRect,
  type CaptureReply,
  type Appearance,
  type McpSettingsInput,
  type RemoteFile,
  type SessionInput,
  type TermCreateOptions
} from '../shared/types'
import type { StorageService } from './services/StorageService'
import type { TerminalService } from './services/TerminalService'
import type { ReverseListenerService } from './services/ReverseListenerService'
import type { McpService } from './services/McpService'
import type { SftpService } from './services/SftpService'
import { listAgentTargets, writeAgentTarget } from './services/AgentConfigService'
import { paintFromContents } from './window-chrome'

/** 注册主进程 IPC handler（白名单，渲染进程只能调这些） */
export function registerIpc(
  storage: StorageService,
  terminal: TerminalService,
  reverse: ReverseListenerService,
  sftp: SftpService,
  mcp: McpService
): void {
  // ------------------------------------------------------------ 会话 CRUD
  ipcMain.handle(IPC.sessionList, () => storage.list())

  ipcMain.handle(IPC.sessionCreate, (_e, input: SessionInput) => storage.create(input))

  ipcMain.handle(IPC.sessionUpdate, (_e, id: string, patch: SessionInput) =>
    storage.update(id, patch)
  )

  ipcMain.handle(IPC.sessionDelete, (_e, id: string) => {
    reverse.stop(id)
    sftp.close(id)
    return storage.delete(id)
  })

  ipcMain.handle(IPC.sessionDuplicate, (_e, id: string) => storage.duplicate(id))

  // -------------------------------------------------------------- 终端
  ipcMain.handle(IPC.termCreate, (_e, opts: TermCreateOptions) => terminal.create(opts))

  ipcMain.on(IPC.termInput, (_e, termId: string, data: string) => {
    if (reverse.input(termId, data)) return
    terminal.input(termId, data)
  })

  ipcMain.on(IPC.termResize, (_e, termId: string, cols: number, rows: number) =>
    terminal.resize(termId, cols, rows)
  )

  ipcMain.on(IPC.termClose, (_e, termId: string) => {
    if (reverse.close(termId)) return
    terminal.close(termId)
  })

  // --------------------------------------------------------------- SFTP
  ipcMain.handle(IPC.sftpList, (_e, sessionId: string, dir: string) => sftp.list(sessionId, dir))

  ipcMain.handle(IPC.sftpMkdir, (_e, sessionId: string, dir: string, name: string) =>
    sftp.mkdir(sessionId, dir, name)
  )

  ipcMain.handle(IPC.sftpRemove, (_e, sessionId: string, path: string, kind: RemoteFile['kind']) =>
    sftp.remove(sessionId, path, kind)
  )

  ipcMain.handle(IPC.sftpUpload, (_e, sessionId: string, dir: string) => sftp.upload(sessionId, dir))

  ipcMain.handle(IPC.sftpRename, (_e, sessionId: string, from: string, to: string) =>
    sftp.rename(sessionId, from, to)
  )

  ipcMain.handle(IPC.sftpDownload, (_e, sessionId: string, file: RemoteFile) =>
    sftp.download(sessionId, file)
  )

  ipcMain.handle(IPC.sftpRead, (_e, sessionId: string, path: string) => sftp.readText(sessionId, path))

  ipcMain.handle(IPC.sftpWrite, (_e, sessionId: string, path: string, text: string) =>
    sftp.writeText(sessionId, path, text)
  )

  // --------------------------------------------------------------- MCP
  ipcMain.handle(IPC.appearanceGet, () => storage.getAppearance())

  ipcMain.handle(IPC.appearanceSave, (event, input: Appearance) => {
    const saved = storage.saveAppearance(input)
    paintFromContents(event.sender, saved.app)
    return saved
  })

  ipcMain.handle(IPC.mcpGet, () => storage.getMcpSettings())

  ipcMain.handle(IPC.mcpAudit, () => storage.listAudit())

  ipcMain.handle(IPC.mcpAgents, () => {
    const settings = storage.getMcpSettings()
    return listAgentTargets(`http://${MCP_HOST}:${settings.port}/mcp`)
  })

  ipcMain.handle(IPC.mcpApplyAgent, (_e, id: AgentId) => {
    const settings = storage.getMcpSettings()
    return writeAgentTarget(id, `http://${MCP_HOST}:${settings.port}/mcp`, settings.token)
  })

  ipcMain.handle(IPC.mcpSave, async (_e, input: McpSettingsInput) => {
    const settings = storage.saveMcpSettings(input)
    await mcp.apply(settings)
    return settings
  })

  ipcMain.handle(IPC.mcpState, () => mcp.state())

  ipcMain.on(IPC.mcpBound, (_e, termId: string) => terminal.markBound(termId))

  ipcMain.on(IPC.mcpConfirmReply, (_e, id: string, ok: boolean) => mcp.resolveConfirm(id, Boolean(ok)))

  ipcMain.handle(IPC.capturePage, async (event, rect: CaptureRect) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('窗口不可用，无法截图')
    assertRect(rect, win.getContentSize())
    const image = await event.sender.capturePage(rect)
    return image.toPNG().toString('base64')
  })

  ipcMain.handle(IPC.captureSave, (_event, pngs: string[]) => {
    if (!Array.isArray(pngs) || pngs.length === 0 || pngs.length > 40) {
      throw new Error('没有可保存的截图')
    }
    const dir = screenshotsDir()
    mkdirSync(dir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '').replace('T', '-')
    const batch = randomBytes(3).toString('hex')
    return pngs.map((png, index) => {
      const file = join(dir, `${stamp}-${batch}-${String(index + 1).padStart(2, '0')}.png`)
      writeFileSync(file, Buffer.from(png, 'base64'))
      return file
    })
  })

  ipcMain.handle(IPC.captureReveal, (_event, file: string) => {
    shell.showItemInFolder(assertScreenshot(file))
  })

  ipcMain.handle(IPC.captureCopy, async (_event, file: string) => {
    const bytes = readFileSync(assertScreenshot(file))
    await clipboard.write([
      new ClipboardItem({
        'image/png': new Blob([bytes], { type: 'image/png' })
      })
    ])
  })

  ipcMain.handle(IPC.captureRead, (_event, file: string) => {
    return readFileSync(assertScreenshot(file)).toString('base64')
  })

  ipcMain.on(IPC.captureReply, (_event, result: CaptureReply) => mcp.resolveCapture(result))

  // ---------------------------------------------------------- 反向监听
  ipcMain.handle(IPC.reverseStart, (_e, sessionId: string) => {
    const session = storage.list().find((s) => s.id === sessionId)
    if (!session || session.mode !== 'reverse' || !session.listenPort) {
      throw new Error('这不是反向监听，或未设置本机端口')
    }
    reverse.start(sessionId, session.listenPort)
  })

  ipcMain.handle(IPC.reverseStop, (_e, sessionId: string) => reverse.stop(sessionId))

  ipcMain.on(IPC.reverseBind, (_e, termId: string) => reverse.bind(termId))
}

function screenshotsDir(): string {
  return join(app.getPath('userData'), 'screenshots')
}

function assertScreenshot(file: string): string {
  const dir = resolve(screenshotsDir())
  const target = resolve(file)
  const rel = relative(dir, target)
  if (!rel || rel.startsWith('..')) throw new Error('不是已保存的截图')
  return target
}

function assertRect(rect: CaptureRect, contentSize: number[]): void {
  const width = contentSize[0] ?? 0
  const height = contentSize[1] ?? 0
  const ok =
    Number.isFinite(rect.x) &&
    Number.isFinite(rect.y) &&
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.width >= 2 &&
    rect.height >= 2 &&
    rect.width <= 4000 &&
    rect.height <= 4000 &&
    rect.x + rect.width <= width + 1 &&
    rect.y + rect.height <= height + 1
  if (!ok) throw new Error('截图区域超出窗口')
}