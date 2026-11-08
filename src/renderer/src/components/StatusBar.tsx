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

  let statusText = t('Ready')
  if (tab?.kind === 'reverse' && session) {
    const listen = listeners[session.id]
    statusText = listen?.listening
      ? `${t('Reverse shell connected')} · 127.0.0.1:${session.listenPort}`
      : t('Reverse connection closed')
  } else if (tab?.kind === 'local') {
    statusText = state?.status === 'connected' ? t('Local terminal') : t('Local terminal not connected')
  } else if (tab) {
    switch (state?.status) {
      case 'connected':
        statusText = `${t('SSH')} ${session ? `${session.username}@${session.host}:${session.port}` : ''}`
        break
      case 'connecting':
        statusText = `${t('Connecting to')} ${session?.host ?? ''}…`
        break
      case 'error':
        statusText = state.error ?? t('Connection failed')
        break
      default:
        statusText = t('Not connected')
    }
  }

  let mcpText = t('MCP disabled')
  if (mcp?.enabled) {
    if (mcpRuntime.running && mcpRuntime.clients > 0) mcpText = `${t('MCP clients')} ${mcpRuntime.clients}`
    else if (mcpRuntime.running) mcpText = t('MCP listening')
    else if (mcpRuntime.error) mcpText = t('MCP failed to start')
    else mcpText = t('MCP not running')
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
