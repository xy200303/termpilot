import { useEffect, useRef, useState } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { useAppStore } from '../stores/useAppStore'
import { captureTerminalView, type CaptureDone } from '../terminal/captureView'
import { terminalPool } from '../terminal/TerminalPool'
import { CaptureDialog } from './CaptureDialog'

/**
 * 终端视图：只负责提供挂载容器，xterm 实例由 TerminalPool 持有。
 * 切换标签时组件卸载/重挂载，但终端本体只是 re-parent，缓冲不丢。
 */
export function TerminalView(props: { termId: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const setNotice = useAppStore((s) => s.setNotice)
  const [selection, setSelection] = useState<{ text: string; startLine: number; endLine: number } | null>(null)
  const [shot, setShot] = useState<CaptureDone | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    terminalPool.attach(props.termId, el)

    // 侧边栏收起时宽度会连续变化。等停稳再 fit，避免每一帧都重排终端。
    let timer = 0
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => terminalPool.fit(props.termId), 120)
    })
    ro.observe(el)

    return () => {
      window.clearTimeout(timer)
      ro.disconnect()
      terminalPool.detach(props.termId)
    }
  }, [props.termId])

  const copy = async () => {
    const text = selection?.text
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    }
  }

  const shoot = () => {
    if (!selection) return
    void captureTerminalView({
      termId: props.termId,
      mode: 'scrollback',
      startLine: selection.startLine,
      endLine: selection.endLine,
      cropOnly: true
    }).then(
      (done) => setShot(done),
      (error) => setNotice(error instanceof Error ? error.message : String(error))
    )
  }

  const paste = async () => {
    try {
      terminalPool.paste(props.termId, await navigator.clipboard.readText())
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={ref}
            className="min-h-0 flex-1 p-1"
            style={{ background: 'var(--terminal-background)' }}
            onContextMenu={() => setSelection(terminalPool.selectionRange(props.termId))}
          />
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem disabled={!selection?.text} onClick={() => void copy()}>
            复制
            <ContextMenuShortcut>{window.api.platform === 'darwin' ? '⌘C' : 'Ctrl+C'}</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem disabled={!selection} onClick={shoot}>
            截图
          </ContextMenuItem>
          <ContextMenuItem onClick={() => void paste()}>
            粘贴
            <ContextMenuShortcut>{window.api.platform === 'darwin' ? '⌘V' : 'Ctrl+V'}</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <CaptureDialog shot={shot} onClose={() => setShot(null)} />
    </>
  )
}
