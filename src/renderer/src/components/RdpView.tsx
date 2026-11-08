import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '../stores/useAppStore'
import { useT } from '../i18n'
import type { SessionConfig } from '../../../shared/types'
import { connectRdp, registerRdp, unregisterRdp, attachRdpInput, type RdpConnection } from '../desktop/rdpAgent'
import { DesktopPerfHud } from './DesktopPerfHud'

export function RdpView(props: { viewId: string; session: SessionConfig; active: boolean }) {
  const t = useT()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [attempt, setAttempt] = useState(0)
  const status = useAppStore((s) => s.desktopState[props.viewId])
  const desktopPerformance = useAppStore((s) => s.desktopPerformance)
  const onStatus = useAppStore((s) => s.onDesktopStatus)

  useEffect(() => {
    let connection: RdpConnection | null = null
    let detachInput: (() => void) | null = null
    let disposed = false
    const connect = async () => {
      onStatus({ viewId: props.viewId, sessionId: props.session.id, status: 'connecting' })
      try {
        const result = await window.api.desktop.open(props.viewId, props.session.id)
        if (disposed || !canvasRef.current) return
        if (result.mode !== 'embedded') throw new Error(t('rdp.rdp_did_not_enter_embedded_mode'))
        const size = rdpDesktopSize(props.session, canvasRef.current.parentElement)
        const opened = await connectRdp({
          url: result.url,
          host: props.session.host,
          port: props.session.port || 3389,
          username: props.session.username,
          password: result.password,
          width: size.width,
          height: size.height,
          canvas: canvasRef.current,
          clipboard: props.session.desktopOptions?.clipboard === false
            ? undefined
            : {
                read: () => window.api.desktop.clipboard.read(),
                write: (text) => window.api.desktop.clipboard.write(text)
              }
        })
        if (disposed) {
          opened.session.shutdown()
          return
        }
        connection = opened
        registerRdp(props.viewId, connection)
        detachInput = attachRdpInput(canvasRef.current, connection.session)
        onStatus({ viewId: props.viewId, sessionId: props.session.id, status: 'connected' })
        void connection.session.run().then((info) => {
          if (disposed) return
          const reason = info.reason()
          onStatus({
            viewId: props.viewId,
            sessionId: props.session.id,
            status: 'disconnected',
            message: reason || t('rdp.rdp_session_ended')
          })
        }).catch((error) => {
          if (disposed) return
          onStatus({
            viewId: props.viewId,
            sessionId: props.session.id,
            status: 'error',
            message: rdpErrorText(error)
          })
        })
      } catch (error) {
        if (!disposed) {
          onStatus({
            viewId: props.viewId,
            sessionId: props.session.id,
            status: 'error',
            message: rdpErrorText(error)
          })
        }
      }
    }
    void connect()
    return () => {
      disposed = true
      unregisterRdp(props.viewId)
      detachInput?.()
      connection?.session.shutdown()
    }
  }, [props.viewId, props.session.id, attempt])

  const error = status?.status === 'error'
  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
      <canvas ref={canvasRef} tabIndex={0} className="max-h-full max-w-full outline-none" />
      {desktopPerformance && (
        <DesktopPerfHud
          viewId={props.viewId}
          protocol="rdp"
          active={props.active}
          performance={props.session.desktopOptions?.performance}
          canvas={() => canvasRef.current}
        />
      )}
      {status?.status !== 'connected' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/90 px-8 text-center">
          <div className="text-sm text-muted-foreground">
            {status?.status === 'connecting' ? t('rdp.connecting_to_rdp') : error ? t('rdp.rdp_connection_failed') : t('rdp.rdp_disconnected')}
          </div>
          {status?.error && <pre className="max-w-2xl whitespace-pre-wrap text-xs text-destructive">{status.error}</pre>}
          <Button variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>
            重新连接
          </Button>
        </div>
      )}
    </div>
  )
}

function rdpDesktopSize(session: SessionConfig, host: HTMLElement | null): { width: number; height: number } {
  const options = session.desktopOptions
  const cap =
    options?.performance === 'speed'
      ? { width: 1280, height: 720 }
      : options?.performance === 'quality'
        ? { width: 1920, height: 1080 }
        : { width: 1600, height: 900 }
  const fallback = { width: 1280, height: 720 }
  const width = options?.width ?? Math.min(cap.width, Math.max(800, Math.floor(host?.clientWidth || fallback.width)))
  const height = options?.height ?? Math.min(cap.height, Math.max(600, Math.floor(host?.clientHeight || fallback.height)))
  return { width: width - (width % 2), height: height - (height % 2) }
}

function rdpErrorText(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const candidate = error as { backtrace?: () => string; reason?: () => string; kind?: () => number }
    const backtrace = typeof candidate.backtrace === 'function' ? candidate.backtrace() : ''
    if (typeof candidate.kind === 'function') return `RDP 错误（类别 ${candidate.kind()}）${backtrace ? `：${backtrace}` : ''}`
    if (backtrace) return backtrace
    if (typeof candidate.reason === 'function') return candidate.reason()
    return JSON.stringify(error)
  }
  return String(error)
}
