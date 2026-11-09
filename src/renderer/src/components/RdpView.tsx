import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '../stores/useAppStore'
import { useT } from '../i18n'
import type { SessionConfig } from '../../../shared/types'
import { connectRdp, registerRdp, unregisterRdp, runIronRdp, rdpErrorText, type RdpConnection } from '../desktop/rdpAgent'
import { DesktopPerfHud } from './DesktopPerfHud'

export function RdpView(props: { viewId: string; session: SessionConfig; active: boolean }) {
  const t = useT()
  const hostRef = useRef<HTMLDivElement>(null)
  const connectionRef = useRef<RdpConnection | null>(null)
  const retries = useRef(0)
  const [attempt, setAttempt] = useState(0)
  const status = useAppStore((s) => s.desktopState[props.viewId])
  const desktopPerformance = useAppStore((s) => s.desktopPerformance)
  const onStatus = useAppStore((s) => s.onDesktopStatus)

  useEffect(() => {
    let connection: RdpConnection | null = null
    let disposed = false
    let settleTimer: ReturnType<typeof setTimeout> | null = null
    // xrdp 在客户端突然断开后重新连入时，会有一段时间接不回旧会话（服务端 scp_process_msg failed），
    // 首个 fast-path 帧也可能解析失败；关掉旧桥接、退避重试两次，多数情况下能落到新会话。
    const retryDelays = [1500, 4000]
    const retryLater = (): boolean => {
      const index = retries.current
      if (index >= retryDelays.length) return false
      retries.current = index + 1
      onStatus({ viewId: props.viewId, sessionId: props.session.id, status: 'connecting' })
      void window.api.desktop.close(props.viewId).catch(() => undefined).then(() => {
        setTimeout(() => {
          if (!disposed) setAttempt((value) => value + 1)
        }, retryDelays[index])
      })
      return true
    }
    const connect = async () => {
      onStatus({ viewId: props.viewId, sessionId: props.session.id, status: 'connecting' })
      try {
        const result = await window.api.desktop.open(props.viewId, props.session.id)
        if (disposed || !hostRef.current) return
        if (result.mode !== 'embedded') throw new Error(t('rdp.rdp_did_not_enter_embedded_mode'))
        const size = rdpDesktopSize(props.session, hostRef.current)
        const opened = await connectRdp({
          url: result.url,
          host: props.session.host,
          port: props.session.port || 3389,
          username: props.session.username,
          password: result.password,
          width: size.width,
          height: size.height,
          container: hostRef.current,
          clipboard: props.session.desktopOptions?.clipboard !== false
        })
        if (disposed) {
          opened.shutdown()
          return
        }
        connection = opened
        connectionRef.current = opened
        registerRdp(props.viewId, opened)
        onStatus({ viewId: props.viewId, sessionId: props.session.id, status: 'connected' })
        settleTimer = setTimeout(() => {
          retries.current = 0
        }, 5000)
        void runIronRdp(opened).then((info) => {
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
          if (retryLater()) return
          onStatus({
            viewId: props.viewId,
            sessionId: props.session.id,
            status: 'error',
            message: withStaleHint(rdpErrorText(error), t)
          })
        })
      } catch (error) {
        if (disposed) return
        if (retryLater()) return
        onStatus({
          viewId: props.viewId,
          sessionId: props.session.id,
          status: 'error',
          message: withStaleHint(rdpErrorText(error), t)
        })
      }
    }
    void connect()
    return () => {
      disposed = true
      if (settleTimer) clearTimeout(settleTimer)
      unregisterRdp(props.viewId)
      connectionRef.current = null
      connection?.shutdown()
    }
  }, [props.viewId, props.session.id, attempt])

  const error = status?.status === 'error'
  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
      <div ref={hostRef} className="flex h-full w-full items-center justify-center" />
      {desktopPerformance && (
        <DesktopPerfHud
          viewId={props.viewId}
          protocol="rdp"
          active={props.active}
          performance={props.session.desktopOptions?.performance}
          canvas={() => connectionRef.current?.canvas() ?? null}
        />
      )}
      {status?.status !== 'connected' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/90 px-8 text-center">
          <div className="text-sm text-muted-foreground">
            {status?.status === 'connecting' ? t('rdp.connecting_to_rdp') : error ? t('rdp.rdp_connection_failed') : t('rdp.rdp_disconnected')}
          </div>
          {status?.error && <pre className="max-w-2xl whitespace-pre-wrap text-xs text-destructive">{status.error}</pre>}
          <Button variant="outline" size="sm" onClick={() => { retries.current = 0; setAttempt((value) => value + 1) }}>
            {t('common.reconnect')}
          </Button>
        </div>
      )}
    </div>
  )
}

function withStaleHint(message: string, t: (key: string) => string): string {
  return message.includes('fastPath') ? `${message}\n${t('rdp.rdp_stale_session_hint')}` : message
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
