import { create } from 'zustand'
import {
  MCP_DEFAULT_PORT,
  type Appearance,
  type ConnectMode,
  type McpOpenTab,
  type McpRuntime,
  type McpSettings,
  type McpSettingsInput,
  type ReverseIncoming,
  type ReverseListenState,
  type SessionConfig,
  type SessionInput,
  type SessionStatus,
  type Tab,
  type TermStatusEvent
} from '../../../shared/types'
import { dropBuffer, editorKey } from '../editor/editorBuffers'
import { terminalPool } from '../terminal/TerminalPool'
import { applyAppearance, readCachedAppearance, resolveAppTheme, type ResolvedAppTheme } from '../theme/applyAppearance'

export interface EditorTab {
  key: string
  sessionId: string
  path: string
  name: string
  /** 斜体预览：再单击别的文件会替换它 */
  preview: boolean
  dirty: boolean
}

interface TermState {
  status: SessionStatus | 'error'
  error?: string
}

interface AppState {
  sessions: SessionConfig[]
  sessionStatus: Record<string, SessionStatus>
  /** 每个终端（标签）的连接状态 */
  termState: Record<string, TermState>
  tabs: Tab[]
  activeTabId: string | null

  /** 侧边栏整体收纳（收成图标栏） */
  sidebarCollapsed: boolean
  /** 侧边栏页：连接树 / 远程文件树 */
  sidebarPane: 'connect' | 'files'
  /** 树节点折叠，key 为 forward / reverse / 分组名 */
  collapsedGroups: Record<string, boolean>
  search: string
  /** 文件树跟随的会话 */
  selectedSessionId: string | null
  /** 当前连接下打开的远程文件。和会话标签分开，按机器保留。 */
  editorTabs: EditorTab[]
  /** 正在看的文件。null 表示回到这台机器的终端。 */
  activeEditorKey: string | null
  /** 反向监听运行状态 */
  listeners: Record<string, ReverseListenState>

  /** 会话编辑弹窗。host 表示在这台机器下再加一条连接 */
  editing:
    | null
    | { action: 'create'; mode: ConnectMode; host?: string; port?: number }
    | { action: 'edit'; session: SessionConfig }
  settingsOpen: boolean
  appearance: Appearance
  /** 跟随系统时，这里是当前真正用上的浅色或深色。 */
  resolvedApp: ResolvedAppTheme
  mcp: McpSettings | null
  mcpRuntime: McpRuntime
  notice: string | null

  loadSessions: () => Promise<void>
  loadAppearance: () => Promise<void>
  setAppearance: (patch: Partial<Appearance>) => Promise<void>
  syncSystemTheme: () => void
  loadMcp: () => Promise<void>
  onMcpState: (state: McpRuntime) => void
  onMcpOpenTab: (tab: McpOpenTab) => void
  onMcpCloseTab: (termId: string) => void
  onSessionsChanged: (sessions: SessionConfig[]) => void
  saveMcp: (input: McpSettingsInput) => Promise<void>
  setSettingsOpen: (open: boolean) => void
  setNotice: (notice: string | null) => void
  saveSession: (id: string | null, input: SessionInput) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  duplicateSessions: (ids: string[]) => Promise<void>

  openSessionTab: (session: SessionConfig, fresh?: boolean) => void
  openLocalTab: () => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  toggleListen: (session: SessionConfig) => Promise<void>
  /** 主进程终端状态事件入口（App 中订阅一次） */
  onTermStatus: (e: TermStatusEvent) => void
  onReverseState: (e: ReverseListenState) => void
  onReverseIncoming: (e: ReverseIncoming) => void

  toggleSidebar: () => void
  setSidebarPane: (pane: 'connect' | 'files') => void
  toggleGroup: (group: string) => void
  selectSession: (id: string) => void
  openRemoteEditor: (sessionId: string, file: { path: string; name: string }, pin?: boolean) => void
  closeEditorTab: (key: string) => void
  activateEditorTab: (key: string) => void
  setEditorDirty: (key: string, dirty: boolean) => void
  pinEditorTab: (key: string) => void
  setSearch: (v: string) => void
  setEditing: (
    v: null | { action: 'create'; mode: ConnectMode; host?: string; port?: number } | { action: 'edit'; session: SessionConfig }
  ) => void
}

let tabSeq = 0
let noticeTimer: ReturnType<typeof setTimeout> | undefined
const bootAppearance = readCachedAppearance()

export const useAppStore = create<AppState>((set, get) => ({
  sessions: [],
  sessionStatus: {},
  termState: {},
  tabs: [],
  activeTabId: null,
  sidebarCollapsed: false,
  sidebarPane: 'connect',
  collapsedGroups: {},
  search: '',
  selectedSessionId: null,
  editorTabs: [],
  activeEditorKey: null,
  listeners: {},
  editing: null,
  settingsOpen: false,
  appearance: bootAppearance,
  resolvedApp: resolveAppTheme(bootAppearance.app),
  mcp: null,
  mcpRuntime: { running: false, port: MCP_DEFAULT_PORT, clients: 0 },
  notice: null,

  loadSessions: async () => {
    const sessions = await window.api.sessions.list()
    set({ sessions })
  },

  loadAppearance: async () => {
    const appearance = await window.api.appearance.get()
    set({ appearance, resolvedApp: applyAppearance(appearance) })
  },

  setAppearance: async (patch) => {
    const prev = get().appearance
    const next = { ...prev, ...patch }
    set({ appearance: next, resolvedApp: applyAppearance(next, false) })
    try {
      const saved = await window.api.appearance.save(next)
      set({ appearance: saved, resolvedApp: applyAppearance(saved) })
    } catch (error) {
      set({ appearance: prev, resolvedApp: applyAppearance(prev) })
      throw error
    }
  },

  syncSystemTheme: () => {
    if (get().appearance.app !== 'system') return
    set({ resolvedApp: applyAppearance(get().appearance, false) })
  },

  loadMcp: async () => {
    const [mcp, mcpRuntime] = await Promise.all([window.api.mcp.get(), window.api.mcp.state()])
    set({ mcp, mcpRuntime })
  },

  saveMcp: async (input) => {
    const mcp = await window.api.mcp.save(input)
    const mcpRuntime = await window.api.mcp.state()
    set({ mcp, mcpRuntime, settingsOpen: false })
  },

  onMcpState: (mcpRuntime) => set({ mcpRuntime }),

  onMcpOpenTab: (tab) => {
    terminalPool.ensure(tab.termId)
    window.api.mcp.bound(tab.termId)
    if (get().tabs.some((item) => item.id === tab.termId)) {
      set({ activeTabId: tab.termId, selectedSessionId: tab.sessionId })
      return
    }
    set({
      tabs: [
        ...get().tabs,
        { id: tab.termId, sessionId: tab.sessionId, kind: tab.kind, title: tab.title }
      ],
      activeTabId: tab.termId,
      selectedSessionId: tab.sessionId ?? get().selectedSessionId
    })
  },

  onMcpCloseTab: (termId) => {
    if (get().tabs.some((tab) => tab.id === termId)) get().closeTab(termId)
    else terminalPool.dispose(termId)
  },

  onSessionsChanged: (sessions) => {
    const ids = new Set(sessions.map((session) => session.id))
    const selected = get().selectedSessionId
    set({
      sessions,
      selectedSessionId: selected && ids.has(selected) ? selected : null
    })
    for (const tab of get().tabs) {
      if (tab.sessionId && !ids.has(tab.sessionId)) get().closeTab(tab.id)
    }
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),

  setNotice: (notice) => {
    if (noticeTimer) clearTimeout(noticeTimer)
    set({ notice })
    if (notice) noticeTimer = setTimeout(() => set({ notice: null }), 12000)
  },

  saveSession: async (id, input) => {
    if (id) {
      await window.api.sessions.update(id, input)
    } else {
      await window.api.sessions.create(input)
    }
    await get().loadSessions()
    set({ editing: null })
  },

  deleteSession: async (id) => {
    await window.api.sessions.delete(id)
    // 关掉该会话已打开的标签
    for (const t of get().tabs.filter((t) => t.sessionId === id)) {
      get().closeTab(t.id)
    }
    await get().loadSessions()
  },

  duplicateSessions: async (ids) => {
    for (const id of ids) await window.api.sessions.duplicate(id)
    await get().loadSessions()
  },

  openSessionTab: (session, fresh = false) => {
    set({ selectedSessionId: session.id })
    if ((session.mode ?? 'forward') === 'reverse') {
      void get().toggleListen(session)
      return
    }
    if (!fresh) {
      const existing = get().tabs.find((t) => t.sessionId === session.id && t.kind === 'ssh')
      if (existing) {
        set({ activeTabId: existing.id })
        return
      }
    }
    const count = get().tabs.filter((t) => t.sessionId === session.id && t.kind === 'ssh').length
    const tab: Tab = {
      id: `tab-${++tabSeq}`,
      sessionId: session.id,
      kind: 'ssh',
      title: count === 0 ? session.name : `${session.name} ${count + 1}`
    }
    set({ tabs: [...get().tabs, tab], activeTabId: tab.id })
    // 通知主进程建立 SSH 连接（初始 80x24，挂载后 fit 会同步真实尺寸）
    window.api.term.create({
      termId: tab.id,
      kind: 'ssh',
      sessionId: session.id,
      cols: 80,
      rows: 24
    })
  },

  openLocalTab: () => {
    const tab: Tab = {
      id: `tab-${++tabSeq}`,
      sessionId: null,
      kind: 'local',
      title: `本地终端 ${tabSeq}`
    }
    set({ tabs: [...get().tabs, tab], activeTabId: tab.id })
    window.api.term.create({ termId: tab.id, kind: 'local', cols: 80, rows: 24 })
  },

  closeTab: (tabId) => {
    const tabs = get().tabs.filter((t) => t.id !== tabId)
    const activeTabId =
      get().activeTabId === tabId ? (tabs[tabs.length - 1]?.id ?? null) : get().activeTabId
    const termState = { ...get().termState }
    delete termState[tabId]
    set({ tabs, activeTabId, termState })
    // 先断主进程连接，再销毁 xterm 实例
    window.api.term.close(tabId)
    terminalPool.dispose(tabId)
  },

  setActiveTab: (tabId) => {
    const tab = get().tabs.find((t) => t.id === tabId)
    set({
      activeTabId: tabId,
      selectedSessionId: tab?.sessionId ?? get().selectedSessionId,
      activeEditorKey: null
    })
  },

  toggleListen: async (session) => {
    const cur = get().listeners[session.id]
    try {
      if (cur?.listening) await window.api.reverse.stop(session.id)
      else await window.api.reverse.start(session.id)
    } catch (e) {
      set({
        listeners: {
          ...get().listeners,
          [session.id]: {
            sessionId: session.id,
            listening: false,
            port: session.listenPort ?? 0,
            peers: 0,
            error: e instanceof Error ? e.message : String(e)
          }
        }
      })
    }
  },

  onTermStatus: (e) => {
    const termState = { ...get().termState, [e.termId]: { status: e.status, error: e.error } }
    const patch: Partial<AppState> = { termState }
    // 正向 SSH 才用终端状态点亮会话；反向监听的状态由 listeners 单独维护
    if (e.sessionId && e.termId.startsWith('rev-') === false && get().tabs.some((t) => t.id === e.termId && t.kind === 'ssh')) {
      const st: SessionStatus = e.status === 'error' ? 'disconnected' : (e.status as SessionStatus)
      patch.sessionStatus = { ...get().sessionStatus, [e.sessionId]: st }
    }
    set(patch)
    // 连接失败时把错误写进终端，用户能直接看到
    if (e.status === 'error' && e.error) {
      terminalPool.write(e.termId, `\r\n\x1b[1;31m✗ ${e.error}\x1b[0m\r\n`)
    }
  },

  onReverseState: (e) => set({ listeners: { ...get().listeners, [e.sessionId]: e } }),

  onReverseIncoming: (e) => {
    // 先挂上 xterm 的数据订阅，再通知主进程放行缓存
    terminalPool.ensure(e.termId)
    window.api.reverse.bind(e.termId)
    if (get().tabs.some((t) => t.id === e.termId)) {
      set({ activeTabId: e.termId, selectedSessionId: e.sessionId })
      return
    }
    const session = get().sessions.find((s) => s.id === e.sessionId)
    const tab: Tab = {
      id: e.termId,
      sessionId: e.sessionId,
      kind: 'reverse',
      title: `${session?.name ?? '反弹'} · ${e.peer}`
    }
    set({
      tabs: [...get().tabs, tab],
      activeTabId: tab.id,
      selectedSessionId: e.sessionId
    })
  },

  toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
  setSidebarPane: (pane) => set({ sidebarPane: pane }),
  toggleGroup: (group) =>
    set({ collapsedGroups: { ...get().collapsedGroups, [group]: !get().collapsedGroups[group] } }),
  selectSession: (id) => set({ selectedSessionId: id }),
  openRemoteEditor: (sessionId, file, pin = false) => {
    const key = editorKey(sessionId, file.path)
    const tabs = get().editorTabs
    const existing = tabs.find((t) => t.key === key)
    if (existing) {
      set({
        editorTabs: tabs.map((t) => (t.key === key && pin ? { ...t, preview: false } : t)),
        activeEditorKey: key
      })
      return
    }
    let next = tabs
    if (!pin) {
      const preview = next.find((t) => t.sessionId === sessionId && t.preview && !t.dirty)
      if (preview) {
        dropBuffer(preview.key)
        next = next.filter((t) => t.key !== preview.key)
      }
    }
    set({
      editorTabs: [
        ...next,
        { key, sessionId, path: file.path, name: file.name, preview: !pin, dirty: false }
      ],
      activeEditorKey: key
    })
  },
  closeEditorTab: (key) => {
    dropBuffer(key)
    const current = get().editorTabs.find((t) => t.key === key)
    const tabs = get().editorTabs.filter((t) => t.key !== key)
    const sibling = tabs.filter((t) => t.sessionId === current?.sessionId)
    set({
      editorTabs: tabs,
      activeEditorKey: get().activeEditorKey === key ? (sibling.at(-1)?.key ?? null) : get().activeEditorKey
    })
  },
  activateEditorTab: (key) => set({ activeEditorKey: key }),
  setEditorDirty: (key, dirty) =>
    set({
      editorTabs: get().editorTabs.map((t) => (t.key === key && t.dirty !== dirty ? { ...t, dirty } : t))
    }),
  pinEditorTab: (key) =>
    set({
      editorTabs: get().editorTabs.map((t) => (t.key === key && t.preview ? { ...t, preview: false } : t))
    }),
  setSearch: (v) => set({ search: v }),
  setEditing: (v) => set({ editing: v })
}))
