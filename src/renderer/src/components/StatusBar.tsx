import { Badge } from '@/components/ui/badge'
import { useAppStore } from '../stores/useAppStore'
import { useT } from '../i18n'

/** 底部状态栏 */
export function StatusBar() {
  const t = useT()
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

  let statusText = t('就绪')
  if (tab?.kind === 'reverse' && session) {
    const listen = listeners[session.id]
    statusText = listen?.listening
      ? `${t('反向 shell 已接入')} · 127.0.0.1:${session.listenPort}`
      : t('反向连接已断开')
  } else if (tab?.kind === 'local') {
    statusText = state?.status === 'connected' ? t('本地终端') : t('本地终端未连接')
  } else if (tab) {
    switch (state?.status) {
      case 'connected':
        statusText = `${t('正向 SSH')} ${session ? `${session.username}@${session.host}:${session.port}` : ''}`
        break
      case 'connecting':
        statusText = `${t('正在连接')} ${session?.host ?? ''}…`
        break
      case 'error':
        statusText = state.error ?? t('连接失败')
        break
      default:
        statusText = t('未连接')
    }
  }

  let mcpText = t('MCP 未启用')
  if (mcp?.enabled) {
    if (mcpRuntime.running && mcpRuntime.clients > 0) mcpText = `${t('MCP 已连接')} ${mcpRuntime.clients}`
    else if (mcpRuntime.running) mcpText = t('MCP 监听中')
    else if (mcpRuntime.error) mcpText = t('MCP 启动失败')
    else mcpText = t('MCP 未启动')
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
