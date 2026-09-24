import type { CSSProperties } from 'react'
import { useState } from 'react'
import { Camera, GalleryVertical, TerminalSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppStore } from '../stores/useAppStore'
import { captureTerminalView, type CaptureDone } from '../terminal/captureView'
import { CaptureDialog } from './CaptureDialog'

const drag = { WebkitAppRegion: 'drag' } as CSSProperties

/** 终端上方留出的拖动条，和系统按钮同一行。宽度跟着右边内容走，不再单独对齐侧边栏。 */
export function DragStrip() {
  const win32 = window.api.platform === 'win32'
  return <div className={cn('h-10 shrink-0 border-b bg-background', win32 && 'pr-[138px]')} style={drag} />
}

/** 终端标签。窗口级标签，不用 Tabs 组件，避免切走时卸载终端。 */
export function TabBar() {
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const closeTab = useAppStore((s) => s.closeTab)
  const setNotice = useAppStore((s) => s.setNotice)
  const [shot, setShot] = useState<CaptureDone | null>(null)

  const shoot = (mode: 'viewport' | 'scrollback') => {
    if (!activeTabId) return
    void captureTerminalView({ termId: activeTabId, mode }).then(
      (done) => setShot(done),
      (error) => setNotice(error instanceof Error ? error.message : String(error))
    )
  }

  return (
    <>
    <div className="flex h-10 shrink-0 items-center gap-1 border-b bg-background px-2">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.id === activeTabId
          return (
            <Button
              key={t.id}
              variant={active ? 'secondary' : 'ghost'}
              size="sm"
              className="max-w-48"
              onClick={() => setActiveTab(t.id)}
            >
              <TerminalSquare />
              <span className="truncate">{t.title}</span>
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
          )
        })}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        title="截取当前终端画面"
        disabled={!activeTabId}
        onClick={() => shoot('viewport')}
      >
        <Camera />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="滚动终端并逐屏截图"
        disabled={!activeTabId}
        onClick={() => shoot('scrollback')}
      >
        <GalleryVertical />
      </Button>
    </div>
    <CaptureDialog shot={shot} onClose={() => setShot(null)} />
    </>
  )
}
