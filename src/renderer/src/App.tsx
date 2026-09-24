import { useEffect } from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppSidebar } from './components/Sidebar'
import { DragStrip, TabBar } from './components/TabBar'
import { EditorTabBar } from './components/EditorTabBar'
import { StatusBar } from './components/StatusBar'
import { SessionForm } from './components/SessionForm'
import { SettingsDialog } from './components/SettingsDialog'
import { McpConfirmDialog } from './components/McpConfirmDialog'
import { SftpInstallDialog } from './components/SftpInstallDialog'
import { TerminalView } from './components/TerminalView'
import { RemoteEditor } from './components/RemoteEditor'
import { EmptyState } from './components/EmptyState'
import { useAppStore } from './stores/useAppStore'
import { runCapture } from './terminal/captureView'

export default function App() {
  const loadSessions = useAppStore((s) => s.loadSessions)
  const loadMcp = useAppStore((s) => s.loadMcp)
  const onTermStatus = useAppStore((s) => s.onTermStatus)
  const onReverseState = useAppStore((s) => s.onReverseState)
  const onReverseIncoming = useAppStore((s) => s.onReverseIncoming)
  const onMcpState = useAppStore((s) => s.onMcpState)
  const onMcpOpenTab = useAppStore((s) => s.onMcpOpenTab)
  const onMcpCloseTab = useAppStore((s) => s.onMcpCloseTab)
  const onSessionsChanged = useAppStore((s) => s.onSessionsChanged)
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const remoteEditor = useAppStore((s) => s.activeEditorKey)
  const editorTabs = useAppStore((s) => s.editorTabs)

  useEffect(() => window.api.capture.onRun((job) => void runCapture(job)), [])

  useEffect(() => {
    loadSessions()
    loadMcp()
    const offStatus = window.api.term.onStatus(onTermStatus)
    const offListen = window.api.reverse.onState(onReverseState)
    const offIncoming = window.api.reverse.onIncoming(onReverseIncoming)
    const offMcpState = window.api.mcp.onState(onMcpState)
    const offMcpOpen = window.api.mcp.onOpenTab(onMcpOpenTab)
    const offMcpClose = window.api.mcp.onCloseTab(onMcpCloseTab)
    const offSessions = window.api.sessions.onChanged(onSessionsChanged)
    return () => {
      offStatus()
      offListen()
      offIncoming()
      offMcpState()
      offMcpOpen()
      offMcpClose()
      offSessions()
    }
  }, [
    loadSessions,
    loadMcp,
    onTermStatus,
    onReverseState,
    onReverseIncoming,
    onMcpState,
    onMcpOpenTab,
    onMcpCloseTab,
    onSessionsChanged
  ])

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const fileTabs = activeTab?.sessionId
    ? editorTabs.filter((t) => t.sessionId === activeTab.sessionId)
    : []
  const currentFile = fileTabs.find((t) => t.key === remoteEditor) ?? null

  return (
    <TooltipProvider>
      <SidebarProvider className="h-svh min-h-0">
        <AppSidebar />
        <SidebarInset className="min-h-0 overflow-hidden">
          <DragStrip />
          <TabBar />
          {fileTabs.length > 0 && <EditorTabBar tabs={fileTabs} activeKey={currentFile?.key ?? null} />}
          <div className="flex min-h-0 flex-1 flex-col">
            {currentFile ? (
              <RemoteEditor key={currentFile.key} tab={currentFile} />
            ) : activeTab ? (
              <TerminalView key={activeTab.id} termId={activeTab.id} />
            ) : (
              <EmptyState />
            )}
          </div>
          <StatusBar />
        </SidebarInset>
        <SessionForm />
        <SettingsDialog />
        <McpConfirmDialog />
        <SftpInstallDialog />
      </SidebarProvider>
    </TooltipProvider>
  )
}
