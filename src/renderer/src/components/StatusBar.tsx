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

  let statusText = t('status.ready')
  if (tab?.kind === 'reverse' && session) {
    const listen = listeners[session.id]
    statusText = listen?.listening
      ? `${t('status.reverse_shell_connected')} · 127.0.0.1:${session.listenPort}`
      : t('status.reverse_connection_closed')
  } else if (tab?.kind === 'local') {
    statusText = state?.status === 'connected' ? t('sidebar.local_terminal') : t('status.local_terminal_not_connected')
  } else if (tab) {
    switch (state?.status) {
      case 'connected':
        statusText = `${t('form.ssh')} ${session ? `${session.username}@${session.host}:${session.port}` : ''}`
        break
      case 'connecting':
        statusText = `${t('status.connecting_to')} ${session?.host ?? ''}…`
        break
      case 'error':
        statusText = state.error ?? t('status.connection_failed')
        break
      default:
        statusText = t('status.not_connected')
    }
  }

  let mcpText = t('status.mcp_disabled')
  if (mcp?.enabled) {
    if (mcpRuntime.running && mcpRuntime.clients > 0) mcpText = `${t('status.mcp_clients')} ${mcpRuntime.clients}`
    else if (mcpRuntime.running) mcpText = t('status.mcp_listening')
    else if (mcpRuntime.error) mcpText = t('status.mcp_failed_to_start')
    else mcpText = t('status.mcp_not_running')
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
