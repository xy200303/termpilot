import { app, BrowserWindow, Menu, shell } from 'electron'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

// 固定到 %APPDATA%\TermPilot。必须在 ready 之前设置，
// 否则开发时叫 termpilot、打包后叫 TermPilot，配置会看起来“丢了”。
const userDataDir = join(app.getPath('appData'), 'TermPilot')
app.setPath('userData', userDataDir)
const legacySessions = join(app.getPath('appData'), 'termpilot', 'sessions.json')
const currentSessions = join(userDataDir, 'sessions.json')
const databaseFile = join(userDataDir, 'termpilot.db')
// 只在还没有数据库时把旧目录里的 JSON 拷过来，交给 StorageService 导入一次。
if (!existsSync(databaseFile) && !existsSync(currentSessions) && existsSync(legacySessions)) {
  mkdirSync(userDataDir, { recursive: true })
  copyFileSync(legacySessions, currentSessions)
}
import { StorageService } from './services/StorageService'
import { TerminalService } from './services/TerminalService'
import { ReverseListenerService } from './services/ReverseListenerService'
import { SftpService } from './services/SftpService'
import { McpService } from './services/McpService'
import { registerIpc } from './ipc'

let mainWindow: BrowserWindow | null = null
let storage: StorageService | null = null
let terminal: TerminalService | null = null
let reverse: ReverseListenerService | null = null
let sftp: SftpService | null = null
let mcp: McpService | null = null

function createWindow(storage: StorageService): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#f3f5f8',
    title: 'TermPilot',
    icon: join(app.getAppPath(), 'resources', 'icon.png'),
    autoHideMenuBar: true,
    ...(process.platform === 'win32'
      ? {
          // 系统按钮留在右上角，左边这一行由界面自己画，和它们齐平。
          titleBarStyle: 'hidden' as const,
          titleBarOverlay: {
            color: '#ffffff',
            symbolColor: '#3f3f46',
            height: 40
          }
        }
      : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // 安全基线：沙箱 + 上下文隔离，渲染进程无 Node 能力
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  mainWindow = win

  // 终端服务依赖窗口的 webContents 做数据推送，窗口创建后再初始化
  const sender = () =>
    mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents : null
  terminal = new TerminalService(storage, sender)
  reverse = new ReverseListenerService(sender)
  sftp = new SftpService(storage, sender)
  mcp = new McpService(storage, terminal, sftp, reverse, sender)
  registerIpc(storage, terminal, reverse, sftp, mcp)
  void mcp.apply(storage.getMcpSettings()).catch((error) => {
    console.error('[TermPilot] MCP start failed:', error)
  })

  win.on('ready-to-show', () => win.show())

  // 外部链接一律交给系统浏览器，不在应用内打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  const sessions = new StorageService()
  storage = sessions
  createWindow(sessions)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(sessions)
  })
})

app.on('window-all-closed', () => {
  terminal?.disposeAll()
  reverse?.disposeAll()
  sftp?.disposeAll()
  if (process.platform !== 'darwin') app.quit()
})

let quitting = false
app.on('before-quit', (event) => {
  if (quitting) return
  event.preventDefault()
  quitting = true
  terminal?.disposeAll()
  reverse?.disposeAll()
  sftp?.disposeAll()
  void (mcp?.stop() ?? Promise.resolve()).finally(() => {
    storage?.close()
    app.quit()
  })
})
