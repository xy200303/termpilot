import { useEffect, useState } from 'react'
import type { DesktopMetrics } from '../../../shared/types'
import { useT } from '../i18n'

const PROFILE_LABEL: Record<string, string> = {
  auto: '自动',
  quality: '画质',
  balanced: '平衡',
  speed: '流畅'
}

export function DesktopPerfHud(props: {
  viewId: string
  protocol: 'vnc' | 'rdp'
  active: boolean
  performance?: 'auto' | 'quality' | 'balanced' | 'speed'
  canvas: () => HTMLCanvasElement | null
}) {
  const t = useT()
  const [metrics, setMetrics] = useState<DesktopMetrics | null>(null)
  const [size, setSize] = useState('')

  useEffect(() => {
    if (!props.active) return
    let disposed = false
    const update = () => {
      void window.api.desktop.metrics(props.viewId).then((value) => {
        if (!disposed) setMetrics(value)
      })
      const canvas = props.canvas()
      if (canvas) setSize(`${canvas.width}×${canvas.height}`)
    }
    update()
    const timer = window.setInterval(update, 1000)
    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [props.active, props.viewId])

  if (!props.active || !metrics) return null
  const received = (metrics.bytesIn / 1024 / 1024).toFixed(1)
  return (
    <div className="pointer-events-none absolute left-2 top-2 z-20 rounded-md bg-black/65 px-2 py-1 font-mono text-[10px] leading-4 text-white/85">
      <div>
        {props.protocol.toUpperCase()} · {t(PROFILE_LABEL[props.performance ?? 'balanced'])} · {size || '—'}
      </div>
      <div>
        ↓ {metrics.kbpsIn.toFixed(0)} kbps ↑ {metrics.kbpsOut.toFixed(0)} kbps · {received} MB
      </div>
      <div>
        {metrics.packetsIn.toFixed(0)} pkt/s ↓ · {metrics.packetsOut.toFixed(0)} pkt/s ↑
      </div>
    </div>
  )
}
