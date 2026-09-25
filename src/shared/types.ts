import type { SshConnectOptions } from './ssh-options'

/** 认证方式（仅正向 SSH） */
export type AuthType = 'password' | 'key'

/**
 * 连接方向：
 * - forward：本机作为 SSH 客户端，主动连到服务器
 * - reverse：本机在 127.0.0.1 监听 shell。公网暴露交给外部穿透（如 cpolar），
 *   无公网 IP 的服务器主动连回来
 */
export type ConnectMode = 'forward' | 'reverse'

/** 会话配置（secret 不落盘在本结构里，单独加密存储） */
export interface SessionConfig {
  id: string
  /** 助手用来查找的编号，conn- 开头。改名不换。 */
  publicId: string
  name: string
  /** 分组名（侧边栏文件夹），空字符串表示未分组 */
  group: string
  mode: ConnectMode
  /** 正向 SSH */
  host: string
  port: number
  username: string
  authType: AuthType
  /** 私钥路径（authType = key 时） */
  keyPath?: string
  /** 反向监听：本机端口。只监听 127.0.0.1，由 cpolar 映射到公网 */
  listenPort?: number
  /** 备注，例如 cpolar 分配的公网地址 */
  remark?: string
  /** 是否已保存加密凭据（密码 / 私钥口令） */
  hasSecret: boolean
  /** ssh -J 跳板。空表示直接连接。 */
  jumpHost?: string
  jumpPort?: number
  jumpUsername?: string
  hasJumpSecret: boolean
  /** 命令里带的超时、算法、多跳、ProxyCommand。 */
  sshOptions?: SshConnectOptions
  createdAt: number
  updatedAt: number
}

/** 创建/更新会话时的输入，secret 为明文，仅在 IPC 调用内存中短暂存在 */
export interface SessionInput {
  name: string
  group: string
  mode: ConnectMode
  host: string
  port: number
  username: string
  authType: AuthType
  keyPath?: string
  listenPort?: number
  remark?: string
  /** 明文密码或私钥口令；undefined 表示不修改 */
  secret?: string
  /** 跳板。空字符串表示不经过跳板。 */
  jumpHost?: string
  jumpPort?: number
  jumpUsername?: string
  /** 跳板口令。undefined 表示不修改，空字符串表示清掉。 */
  jumpSecret?: string
  /** 连接选项。undefined 表示不修改，null 表示清掉。 */
  sshOptions?: SshConnectOptions | null
}

export type SessionStatus = 'disconnected' | 'connecting' | 'connected'

export type TabKind = 'ssh' | 'local' | 'reverse'

export interface Tab {
  id: string
  /** ssh 标签对应会话 id；本地终端为 null */
  sessionId: string | null
  kind: TabKind
  /** 这扇窗口自己的短标题，例如「窗口 1」。标签上再拼连接名。 */
  title: string
  /** 助手写的备注，帮助以后认出这扇窗口在做什么。 */
  remark?: string
}

/** 创建终端的请求（renderer → main） */
export interface TermCreateOptions {
  /** 终端 id，与标签页 id 一致 */
  termId: string
  kind: TabKind
  /** kind = ssh 时必填 */
  sessionId?: string
  /** 窗口短标题，例如「窗口 1」 */
  title?: string
  cols: number
  rows: number
}

/** 重启后要恢复的终端。编号、备注和上次输出都留着。 */
export interface SavedTerm {
  id: string
  sessionId: string | null
  kind: 'ssh' | 'local'
  title: string
  remark: string
}

/** 终端标题或备注变了（main → renderer） */
export interface TermMetaEvent {
  termId: string
  title: string
  remark: string
}

/** 终端状态推送（main → renderer） */
export interface TermStatusEvent {
  termId: string
  sessionId: string | null
  status: SessionStatus | 'error'
  error?: string
}

/** 终端数据推送（main → renderer） */
export interface TermDataEvent {
  termId: string
  data: Uint8Array
}

/** SFTP 目录项 */
export interface RemoteFile {
  name: string
  path: string
  kind: 'dir' | 'file' | 'link'
  size: number
  mtime: number
}

/** 远程安装 SFTP 时推给界面的进度 */
export interface SftpInstallEvent {
  sessionId: string
  phase: 'start' | 'log' | 'done' | 'error'
  text: string
}

/** 反向监听状态（main → renderer） */
export interface ReverseListenState {
  sessionId: string
  listening: boolean
  port: number
  /** 当前已连入的反弹会话数 */
  peers: number
  error?: string
}

/** 远端连入反向监听（main → renderer），渲染进程据此打开终端标签 */
export interface ReverseIncoming {
  sessionId: string
  termId: string
  peer: string
}

/** MCP 只监听本机回环，不允许改成其他地址 */
export const MCP_HOST = '127.0.0.1'
export const MCP_DEFAULT_PORT = 3927

/** 已保存的 MCP 服务端配置。token 要给用户复制到 Codex / Kimi Code，所以设置页能读到明文。 */
export interface McpSettings {
  enabled: boolean
  host: typeof MCP_HOST
  port: number
  token: string
  /** 危险操作先弹窗，等人确认后再执行 */
  confirmDangerous: boolean
}

/** 监听进程的当前状态，不写入数据库 */
export interface McpRuntime {
  running: boolean
  port: number
  clients: number
  error?: string
}

/** Agent 打开终端标签。本地终端没有 sessionId */
export interface McpOpenTab {
  termId: string
  sessionId: string | null
  title: string
  kind: 'ssh' | 'local'
}

export interface McpAuditEntry {
  at: number
  tool: string
  ok: boolean
  detail: string
}

export type AgentId = 'claude' | 'kimi' | 'codex' | 'cursor' | 'workbuddy' | 'codebuddy'

/** 一键写入时能改到的本机 Agent 配置 */
export interface AgentTarget {
  id: AgentId
  name: string
  file: string
  /** 配置文件已经存在 */
  present: boolean
  /** 里面已经有 termpilot 这一条 */
  configured: boolean
}

/** 对照 GitHub 最新发布得到的结果 */
export interface UpdateCheck {
  current: string
  latest: string | null
  url: string | null
  newer: boolean
}

/** 危险命令确认 */
export interface McpConfirmRequest {
  id: string
  command: string
}

/** 页面里终端视图的矩形，单位是 CSS 像素 */
export interface CaptureRect {
  x: number
  y: number
  width: number
  height: number
}

export interface CaptureRun {
  id: string
  termId: string
  mode: 'viewport' | 'scrollback'
  /** 缓冲行号，含首含尾。0 是最旧的一行。 */
  startLine?: number
  endLine?: number
  /** 只要裁好的那一段，不附带整屏原图 */
  cropOnly?: boolean
}

export interface TermLinesRun {
  id: string
  termId: string
  startLine?: number
  endLine?: number
}

export interface TermLinesReply {
  id: string
  error?: string
  length?: number
  viewportY?: number
  rows?: number
  lines?: { n: number; text: string }[]
}

export interface TermModeRun {
  id: string
  termId: string
}

export interface TermModeReply {
  id: string
  applicationCursor?: boolean
  error?: string
}

export interface CaptureReply {
  id: string
  paths?: string[]
  note?: string
  error?: string
}

export interface McpSettingsInput {
  enabled: boolean
  port: number
  token: string
  confirmDangerous: boolean
}

/** 应用界面：浅色、深色，或跟着系统。 */
export const APP_THEMES = ['light', 'dark', 'system'] as const
export type AppTheme = (typeof APP_THEMES)[number]

/** 终端配色，和上面的应用主题互不影响。 */
export const TERMINAL_THEMES = [
  'light',
  'dark',
  'solarized-light',
  'solarized-dark',
  'one-dark',
  'dracula',
  'nord',
  'monokai'
] as const
export type TerminalThemeId = (typeof TERMINAL_THEMES)[number]

export interface Appearance {
  app: AppTheme
  terminal: TerminalThemeId
  /** 打开后所有截图都按缓冲拼图。默认关闭，沿用逐屏拍摄。 */
  experimentalScreenshot: boolean
}

export const DEFAULT_APPEARANCE: Appearance = {
  app: 'light',
  terminal: 'light',
  experimentalScreenshot: false
}

export function parseAppearance(input: unknown): Appearance {
  const row = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const app = APP_THEMES.find((id) => id === row.app) ?? DEFAULT_APPEARANCE.app
  const terminal = TERMINAL_THEMES.find((id) => id === row.terminal) ?? DEFAULT_APPEARANCE.terminal
  return { app, terminal, experimentalScreenshot: row.experimentalScreenshot === true }
}
