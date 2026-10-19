declare const __APP_VERSION__: string

export const VERSION = __APP_VERSION__
export const SITE_URL = 'https://term.xyun.dev'
export const SITE_NAME = 'TermPilot'
export const SITE_TITLE = 'TermPilot — Agent 可操控的 SSH 终端'
export const SITE_DESC =
  '本机 SSH 终端：SSH / Telnet / 串口三协议，多标签终端与 SFTP 文件传输，凭据加密存本机。内置 MCP Server，AI 助手接着你登录好的会话继续操作。'

export const REPO = 'https://github.com/xy200303/termpilot'
export const RELEASE = `${REPO}/releases/latest`
export const RELEASE_TAG = `${REPO}/releases/tag/v${VERSION}`
export const DOWNLOAD_BASE = `${REPO}/releases/download/v${VERSION}`

export const DOWNLOADS = {
  win: {
    label: 'Windows x64',
    setup: `${DOWNLOAD_BASE}/TermPilot.Setup.${VERSION}.exe`,
    portable: `${DOWNLOAD_BASE}/TermPilot-${VERSION}-win.zip`
  },
  mac: {
    label: 'macOS（Apple Silicon）',
    dmg: `${DOWNLOAD_BASE}/TermPilot-${VERSION}-arm64.dmg`,
    zip: `${DOWNLOAD_BASE}/TermPilot-${VERSION}-arm64-mac.zip`
  },
  linux: {
    label: 'Linux x64',
    appimage: `${DOWNLOAD_BASE}/TermPilot-${VERSION}.AppImage`,
    deb: `${DOWNLOAD_BASE}/termpilot_${VERSION}_amd64.deb`
  }
} as const
