import { app, BrowserWindow, Menu, shell } from 'electron'
import { followAppTheme, titleBarOverlay, watchSystemChrome, windowBackground } from './window-chrome'
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
import { SshPool } from './services/SshPool'
import { McpService } from './services/McpService'
import { registerIpc } from './ipc'
import { installCli } from './install-cli'

let mainWindow: BrowserWindow | null = null
let storage: StorageService | null = null
let terminal: TerminalService | null = null
let reverse: ReverseListenerService | null = null
let sftp: SftpService | null = null
let mcp: McpService | null = null

function appIcon(): string {
  const packaged = join(process.resourcesPath, 'icon.png')
  if (app.isPackaged && existsSync(packaged)) return packaged
  return join(app.getAppPath(), 'resources', 'icon.png')
}

/** Windows 上标题栏覆盖层偶发把第一帧停在白底。显示后改一次尺寸让系统重画；画面仍是空的就重新加载。 */
function recoverBlankWindow(win: BrowserWindow): void {
  let shown = false
  let loaded = false
  let nudged = false
  let reloads = 0

  const reload = (why: string) => {
    if (win.isDestroyed() || reloads >= 2) return
    reloads += 1
    console.error(`[TermPilot] 窗口没有画出来（${why}），重新加载`)
    setTimeout(() => {
      if (!win.isDestroyed()) win.webContents.reload()
    }, 200)
  }

  const show = () => {
    if (win.isDestroyed()) return
    shown = true
    if (!win.isVisible()) win.show()
    if (nudged || !loaded || process.platform !== 'win32') return
    nudged = true
    setTimeout(() => {
      if (win.isDestroyed()) return
      const [width, height] = win.getContentSize()
      win.setContentSize(width, height + 1)
      win.setContentSize(width, height)
    }, 50)
  }

  win.once('ready-to-show', show)

  win.webContents.on('did-finish-load', () => {
    loaded = true
    show()
    setTimeout(() => {
      if (win.isDestroyed()) return
      void win.webContents
        .executeJavaScript(
          'Boolean(document.getElementById("root") && document.getElementById("root").childElementCount > 0)',
          true
        )
        .then((painted) => {
          if (!painted) reload('画面是空的')
        })
        .catch(() => reload('画面检查失败'))
    }, 400)
  })

  win.webContents.on('preload-error', (_event, _path, error) => {
    reload(error instanceof Error ? error.message : 'preload')
  })

  win.webContents.on('did-fail-load', (_event, code, description, _url, isMainFrame) => {
    if (!isMainFrame || code === -3) return
    reload(`${code} ${description}`)
  })

  win.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason === 'clean-exit') return
    reload(details.reason)
  })
}

function createWindow(storage: StorageService): void {
  const dark = followAppTheme(storage.getAppearance().app)
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: windowBackground(dark),
    title: 'TermPilot',
    icon: appIcon(),
    autoHideMenuBar: true,
    ...(process.platform === 'win32'
      ? {
          // 系统按钮留在右上角，左边这一行由界面自己画，和它们齐平。
          titleBarStyle: 'hidden' as const,
          titleBarOverlay: titleBarOverlay(dark)
        }
      : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // 安全基线：沙箱 + 上下文隔离，渲染进程无 Node 能力
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      // 隐藏期间也要画出第一帧，否则显示时会停在白底。
      backgroundThrottling: false
    }
  })
  mainWindow = win

  // 终端服务依赖窗口的 webContents 做数据推送，窗口创建后再初始化
  const sender = () =>
    mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents : null
  const sshPool = new SshPool()
  terminal = new TerminalService(storage, sender, sshPool)
  reverse = new ReverseListenerService(sender)
  sftp = new SftpService(storage, sender, sshPool)
  mcp = new McpService(storage, terminal, sftp, reverse, sender)
  registerIpc(storage, terminal, reverse, sftp, mcp)
  void mcp.apply(storage.getMcpSettings()).catch((error) => {
    console.error('[TermPilot] MCP start failed:', error)
  })

  recoverBlankWindow(win)

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

const single = app.requestSingleInstanceLock()
if (!single) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = mainWindow
    if (!win || win.isDestroyed()) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  })

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    watchSystemChrome()
    const sessions = new StorageService()
    storage = sessions
    sessions.setLaunch(process.execPath, app.isPackaged ? [] : [app.getAppPath()])
    installCli({ app: process.execPath, args: app.isPackaged ? [] : [app.getAppPath()] })
    createWindow(sessions)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(sessions)
    })
  })
}

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
