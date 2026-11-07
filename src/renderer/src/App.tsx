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
import { VncView } from './components/VncView'
import { RdpView } from './components/RdpView'
import { ExternalDesktopView } from './components/ExternalDesktopView'
import { RemoteEditor } from './components/RemoteEditor'
import { EmptyState } from './components/EmptyState'
import { useAppStore } from './stores/useAppStore'
import { runCapture } from './terminal/captureView'
import { terminalPool } from './terminal/TerminalPool'
import { startRecording, stopRecording } from './terminal/windowRecorder'
import { runVncAgent } from './desktop/vncAgent'
import { runRdpAgentById } from './desktop/rdpAgent'

export default function App() {
  const loadSessions = useAppStore((s) => s.loadSessions)
  const loadWindows = useAppStore((s) => s.loadWindows)
  const loadAppearance = useAppStore((s) => s.loadAppearance)
  const syncSystemTheme = useAppStore((s) => s.syncSystemTheme)
  const loadMcp = useAppStore((s) => s.loadMcp)
  const onTermStatus = useAppStore((s) => s.onTermStatus)
  const onDesktopStatus = useAppStore((s) => s.onDesktopStatus)
  const onTermMeta = useAppStore((s) => s.onTermMeta)
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

  useEffect(() => {
    document.documentElement.dataset.appReady = 'true'
  }, [])

  useEffect(() => window.api.capture.onRun((job) => void runCapture(job)), [])

  useEffect(() => {
    const offStart = window.api.record.onStart((job) => {
      void startRecording(job).catch((error) => {
        window.api.record.reply({
          id: job.id,
          phase: 'error',
          error: error instanceof Error ? error.message : String(error)
        })
      })
    })
    const offStop = window.api.record.onStop(() => stopRecording())
    return () => {
      offStart()
      offStop()
    }
  }, [])

  useEffect(
    () =>
      window.api.desktop.agent.onRun((job) => {
        void (async () => {
          try {
            const result = job.protocol === 'rdp' ? await runRdpAgentById(job.viewId, job.input) : await runVncAgent(job.viewId, job.input)
            window.api.desktop.agent.reply({ id: job.id, ...result })
          } catch (error) {
            window.api.desktop.agent.reply({
              id: job.id,
              error: error instanceof Error ? error.message : String(error)
            })
          }
        })()
      }),
    []
  )

  useEffect(
    () =>
      window.api.term.onLines((job) => {
        const listed = terminalPool.bufferLines(job.termId, job.startLine, job.endLine)
        window.api.term.linesReply(
          listed
            ? { id: job.id, ...listed }
            : { id: job.id, error: '终端不在画面上' }
        )
      }),
    []
  )

  useEffect(
    () =>
      window.api.term.onMode((job) => {
        window.api.term.modeReply({
          id: job.id,
          applicationCursor: terminalPool.applicationCursor(job.termId)
        })
      }),
    []
  )

  useEffect(() => {
    void loadSessions().then(() => loadWindows())
    loadAppearance()
    loadMcp()
    const themeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const onTheme = () => syncSystemTheme()
    themeQuery.addEventListener('change', onTheme)
    const offStatus = window.api.term.onStatus(onTermStatus)
    const offDesktop = window.api.desktop.onStatus(onDesktopStatus)
    const offMeta = window.api.term.onMeta(onTermMeta)
    const offListen = window.api.reverse.onState(onReverseState)
    const offIncoming = window.api.reverse.onIncoming(onReverseIncoming)
    const offMcpState = window.api.mcp.onState(onMcpState)
    const offMcpOpen = window.api.mcp.onOpenTab(onMcpOpenTab)
    const offMcpClose = window.api.mcp.onCloseTab(onMcpCloseTab)
    const offSessions = window.api.sessions.onChanged(onSessionsChanged)
    return () => {
      themeQuery.removeEventListener('change', onTheme)
      offStatus()
      offDesktop()
      offMeta()
      offListen()
      offIncoming()
      offMcpState()
      offMcpOpen()
      offMcpClose()
      offSessions()
    }
  }, [
    loadSessions,
    loadWindows,
    loadAppearance,
    syncSystemTheme,
    loadMcp,
    onTermStatus,
    onDesktopStatus,
    onTermMeta,
    onReverseState,
    onReverseIncoming,
    onMcpState,
    onMcpOpenTab,
    onMcpCloseTab,
    onSessionsChanged
  ])

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const sessions = useAppStore((s) => s.sessions)
  const activeSession = sessions.find((item) => item.id === activeTab?.sessionId)
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
            {tabs
              .filter((tab) => {
                if (tab.kind === 'vnc') return true
                if (tab.kind !== 'rdp') return false
                const session = sessions.find((item) => item.id === tab.sessionId)
                return !session?.desktopOptions?.nativeClient
              })
              .map((tab) => {
                const session = sessions.find((item) => item.id === tab.sessionId)
                if (!session) return null
                return (
                  <div key={tab.id} className={activeTabId === tab.id ? 'contents' : 'hidden'}>
                    {tab.kind === 'rdp' ? (
                      <RdpView viewId={tab.id} session={session} active={activeTabId === tab.id} />
                    ) : (
                      <VncView viewId={tab.id} session={session} active={activeTabId === tab.id} />
                    )}
                  </div>
                )
              })}
            {currentFile ? (
              <RemoteEditor key={currentFile.key} tab={currentFile} />
            ) : activeTab?.kind === 'vnc' || (activeTab?.kind === 'rdp' && !activeSession?.desktopOptions?.nativeClient) ? null : activeTab?.kind === 'rdp' && activeSession ? (
              <ExternalDesktopView key={activeTab.id} viewId={activeTab.id} session={activeSession} />
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
