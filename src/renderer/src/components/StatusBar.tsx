import { Badge } from '@/components/ui/badge'
import { useAppStore } from '../stores/useAppStore'

/** 底部状态栏 */
export function StatusBar() {
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const sessions = useAppStore((s) => s.sessions)
  const termState = useAppStore((s) => s.termState)
  const listeners = useAppStore((s) => s.listeners)
  const mcp = useAppStore((s) => s.mcp)
  const mcpRuntime = useAppStore((s) => s.mcpRuntime)
  const notice = useAppStore((s) => s.notice)

  const tab = tabs.find((t) => t.id === activeTabId)
  const session = tab?.sessionId ? sessions.find((s) => s.id === tab.sessionId) : null
  const state = tab ? termState[tab.id] : undefined

  let statusText = '就绪'
  if (tab?.kind === 'reverse' && session) {
    const listen = listeners[session.id]
    statusText = listen?.listening
      ? `反向 shell 已接入 · 127.0.0.1:${session.listenPort}`
      : '反向连接已断开'
  } else if (tab?.kind === 'local') {
    statusText = state?.status === 'connected' ? '本地终端' : '本地终端未连接'
  } else if (tab) {
    switch (state?.status) {
      case 'connected':
        statusText = `正向 SSH ${session ? `${session.username}@${session.host}:${session.port}` : ''}`
        break
      case 'connecting':
        statusText = `正在连接 ${session?.host ?? ''}…`
        break
      case 'error':
        statusText = state.error ?? '连接失败'
        break
      default:
        statusText = '未连接'
    }
  }

  let mcpText = 'MCP 未启用'
  if (mcp?.enabled) {
    if (mcpRuntime.running && mcpRuntime.clients > 0) mcpText = `MCP 已连接 ${mcpRuntime.clients}`
    else if (mcpRuntime.running) mcpText = 'MCP 监听中'
    else if (mcpRuntime.error) mcpText = 'MCP 启动失败'
    else mcpText = 'MCP 未启动'
  }

  return (
    <footer className="flex h-7 items-center gap-2 border-t bg-muted/40 px-3 text-xs text-muted-foreground">
      <span className="truncate" title={notice ?? undefined}>
        {notice ?? statusText}
      </span>
      <Badge variant={mcpRuntime.running ? 'secondary' : 'outline'} className="ml-auto" title={mcpRuntime.error}>
        {mcpText}
      </Badge>
    </footer>
  )
}
