import { useEffect, useRef } from 'react'
import { terminalPool } from '../terminal/TerminalPool'

/**
 * 终端视图：只负责提供挂载容器，xterm 实例由 TerminalPool 持有。
 * 切换标签时组件卸载/重挂载，但终端本体只是 re-parent，缓冲不丢。
 */
export function TerminalView(props: { termId: string }) {
  const ref = useRef<HTMLDivElement>(null)

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

  return <div ref={ref} className="min-h-0 flex-1 p-1" style={{ background: 'var(--terminal-background)' }} />
}
