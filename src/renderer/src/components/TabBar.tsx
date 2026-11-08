import type { CSSProperties } from 'react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Camera, ChevronLeft, ChevronRight, GalleryVertical, Gauge, Keyboard, MonitorUp, ScreenShare, TerminalSquare, Type, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import { copyAgentPrompt, termAgentPrompt, windowLabel } from '../agentPrompt'
import { openAfterMenu, RemarkDialog } from './RemarkDialog'
import { useAppStore } from '../stores/useAppStore'
import { captureTerminalView, type CaptureDone } from '../terminal/captureView'
import { CaptureDialog } from './CaptureDialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { sendTextToVnc } from '../desktop/vncAgent'
import { sendTextToRdp } from '../desktop/rdpAgent'
import { useT } from '../i18n'

const drag = { WebkitAppRegion: 'drag' } as CSSProperties

/** 终端上方留出的拖动条，和系统按钮同一行。宽度跟着右边内容走，不再单独对齐侧边栏。 */
export function DragStrip() {
  const win32 = window.api.platform === 'win32'
  return <div className={cn('h-10 shrink-0 border-b bg-background', win32 && 'pr-[138px]')} style={drag} />
}

/** 终端标签。窗口级标签，不用 Tabs 组件，避免切走时卸载终端。 */
export function TabBar() {
  const tr = useT()
  const tabs = useAppStore((s) => s.tabs)
  const sessions = useAppStore((s) => s.sessions)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const closeTab = useAppStore((s) => s.closeTab)
  const reconnectTab = useAppStore((s) => s.reconnectTab)
  const termState = useAppStore((s) => s.termState)
  const renameTab = useAppStore((s) => s.renameTab)
  const setTabRemark = useAppStore((s) => s.setTabRemark)
  const setNotice = useAppStore((s) => s.setNotice)
  const activeTab = tabs.find((tab) => tab.id === activeTabId)
  const isDesktop = activeTab?.kind === 'rdp' || activeTab?.kind === 'vnc'
  const desktopPerformance = useAppStore((s) => s.desktopPerformance)
  const toggleDesktopPerformance = useAppStore((s) => s.toggleDesktopPerformance)
  const desktopIme = useAppStore((s) => s.desktopIme)
  const setDesktopIme = useAppStore((s) => s.setDesktopIme)
  const [sayOpen, setSayOpen] = useState(false)
  const [sayText, setSayText] = useState('')
  const [sayBusy, setSayBusy] = useState(false)
  const [shot, setShot] = useState<CaptureDone | null>(null)
  const [shotError, setShotError] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [remarkingId, setRemarkingId] = useState<string | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const updateArrows = () => {
    const el = stripRef.current
    if (!el) return
    setOverflowing(el.scrollWidth > el.clientWidth + 1)
    setCanLeft(el.scrollLeft > 1)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  useEffect(() => {
    updateArrows()
    const el = stripRef.current
    if (!el) return
    const observer = new ResizeObserver(updateArrows)
    observer.observe(el)
    return () => observer.disconnect()
  }, [tabs.length])

  // 切标签时把它滚进视野
  useEffect(() => {
    stripRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [activeTabId])

  const scrollStrip = (dir: -1 | 1) => {
    stripRef.current?.scrollBy({ left: dir * 240, behavior: 'smooth' })
  }

  const sendSay = async (pasteKeys: string) => {
    if (!activeTab) return
    setSayBusy(true)
    try {
      if (activeTab.kind === 'vnc') await sendTextToVnc(activeTab.id, sayText, pasteKeys)
      else await sendTextToRdp(activeTab.id, sayText, pasteKeys)
      setSayOpen(false)
      setSayText('')
      setNotice(pasteKeys === 'ctrl-shift-v' ? tr('Pasted as terminal input') : tr('Pasted to desktop'))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    } finally {
      setSayBusy(false)
    }
  }

  const shoot = (mode: 'viewport' | 'scrollback') => {
    if (!activeTabId) return
    const termId = activeTabId
    setShotError(null)
    setNotice('正在截图…')
    void (async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve))
      try {
        let done: CaptureDone
        if (isDesktop) {
          const result = await window.api.desktop.agent.run(termId, { action: 'screenshot' })
          const split = result.lastIndexOf('\n')
          const file = result.slice(split + 1).trim()
          if (split < 0 || !file) throw new Error(tr('Screenshot returned no image'))
          done = { note: result.slice(0, split), paths: [file] }
        } else {
          done = await captureTerminalView({ termId, mode })
        }
        setNotice(null)
        setShot(done)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        setNotice(message)
        setShotError(message)
      }
    })()
  }

  return (
    <>
    <div className="flex h-10 shrink-0 items-center gap-1 border-b bg-background px-2">
      {overflowing && (
        <Button variant="ghost" size="icon-sm" disabled={!canLeft} onClick={() => scrollStrip(-1)}>
          <ChevronLeft />
        </Button>
      )}
      <div
        ref={stripRef}
        onScroll={updateArrows}
        onWheel={(e) => {
          const el = stripRef.current
          if (!el) return
          el.scrollLeft += e.deltaY + e.deltaX
        }}
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t, i) => {
          const active = t.id === activeTabId
          const session = sessions.find((item) => item.id === t.sessionId) ?? null
          return (
            <Fragment key={t.id}>
              {i > 0 && (
                <div
                  className={cn(
                    'h-4 w-px shrink-0 bg-border',
                    (active || tabs[i - 1].id === activeTabId) && 'opacity-0'
                  )}
                />
              )}
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <Button
                  variant={active ? 'secondary' : 'ghost'}
                  size="sm"
                  data-active={active || undefined}
                  className="max-w-48 min-w-0 shrink-0 overflow-hidden"
                  title={t.remark?.trim() || undefined}
                  onClick={() => setActiveTab(t.id)}
                  onDoubleClick={(event) => {
                    event.preventDefault()
                    setRenamingId(t.id)
                  }}
                >
                  {t.kind === 'rdp' ? <MonitorUp /> : t.kind === 'vnc' ? <ScreenShare /> : <TerminalSquare />}
                  <span className="min-w-0 truncate">{windowLabel(t.title, session?.name)}</span>
                  <span
                    role="button"
                    className="rounded-sm opacity-60 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      closeTab(t.id)
                    }}
                  >
                    <X />
                  </span>
                </Button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  onClick={() => void copyAgentPrompt(termAgentPrompt(t, session), setNotice)}
                >
                  复制为 Agent 提示词
                </ContextMenuItem>
                <ContextMenuItem onClick={() => openAfterMenu(() => setRenamingId(t.id))}>{tr('Rename')}</ContextMenuItem>
                <ContextMenuItem onClick={() => openAfterMenu(() => setRemarkingId(t.id))}>{tr('Note')}</ContextMenuItem>
                {t.kind !== 'reverse' &&
                (termState[t.id]?.status === 'disconnected' || termState[t.id]?.status === 'error') ? (
                  <ContextMenuItem onClick={() => reconnectTab(t.id)}>{tr('Reconnect')}</ContextMenuItem>
                ) : null}
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => closeTab(t.id)}>{tr('Close')}</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            </Fragment>
          )
        })}
      </div>
      {overflowing && (
        <Button variant="ghost" size="icon-sm" disabled={!canRight} onClick={() => scrollStrip(1)}>
          <ChevronRight />
        </Button>
      )}
      {isDesktop && (
        <Button
          variant={desktopPerformance ? 'secondary' : 'ghost'}
          size="icon-sm"
          title={desktopPerformance ? tr('Hide desktop performance overlay') : tr('Show desktop performance overlay')}
          onClick={toggleDesktopPerformance}
        >
          <Gauge />
        </Button>
      )}
      {activeTab?.kind === 'vnc' && (
        <Button
          variant={desktopIme[activeTab.id] ? 'secondary' : 'ghost'}
          size="icon-sm"
          title={desktopIme[activeTab.id] ? tr('Exit Chinese keyboard mode') : tr('Chinese keyboard (type with local IME)')}
          onClick={() => setDesktopIme(activeTab.id, !desktopIme[activeTab.id])}
        >
          <Keyboard />
        </Button>
      )}
      {isDesktop && (
        <Button variant="ghost" size="icon-sm" title={tr('Send text (via remote clipboard)')} onClick={() => setSayOpen(true)}>
          <Type />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        title={tr('Capture current screen')}
        disabled={!activeTabId}
        onClick={() => shoot('viewport')}
      >
        <Camera />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title={isDesktop ? tr('Desktop tabs have no scrollback') : tr('Capture scrollback')}
        disabled={!activeTabId || isDesktop}
        onClick={() => shoot('scrollback')}
      >
        <GalleryVertical />
      </Button>
    </div>
    <RemarkDialog
      open={renamingId !== null}
      title={tr('Rename')}
      description={`给「${tabs.find((tab) => tab.id === renamingId)?.title ?? ''}」换个名字。`}
      initial={tabs.find((tab) => tab.id === renamingId)?.title ?? ''}
      placeholder={tr('Window name')}
      onOpenChange={(open) => !open && setRenamingId(null)}
      onSave={(value) => {
        if (renamingId) renameTab(renamingId, value)
        setRenamingId(null)
      }}
    />
    <RemarkDialog
      open={remarkingId !== null}
      title={tr('Note')}
      description={`给「${tabs.find((tab) => tab.id === remarkingId)?.title ?? ''}」写一句，方便以后认出它。留空就是清掉。`}
      initial={tabs.find((tab) => tab.id === remarkingId)?.remark ?? ''}
      placeholder={tr('What is this window doing')}
      onOpenChange={(open) => !open && setRemarkingId(null)}
      onSave={(value) => {
        if (remarkingId) setTabRemark(remarkingId, value)
        setRemarkingId(null)
      }}
    />
    <Dialog open={sayOpen} onOpenChange={(open) => !open && setSayOpen(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tr('Send text')}</DialogTitle>
          <DialogDescription>
            {tr('Type locally, then the whole text is written to the remote clipboard and pasted. Use "Paste to terminal" for terminal apps.')}
          </DialogDescription>
        </DialogHeader>
        <textarea
          autoFocus
          value={sayText}
          onChange={(event) => setSayText(event.target.value)}
          placeholder={tr('Text to send')}
          className="h-24 w-full resize-none rounded-md border bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:ring-1"
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={sayBusy || !sayText || !activeTab}
            onClick={() => void sendSay('ctrl-shift-v')}
          >
            {tr('Paste to terminal')}
          </Button>
          <Button disabled={sayBusy || !sayText || !activeTab} onClick={() => void sendSay('ctrl-v')}>
            {tr('Paste')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <CaptureDialog
      shot={shot}
      error={shotError}
      onClose={() => {
        setShot(null)
        setShotError(null)
      }}
    />
    </>
  )
}
