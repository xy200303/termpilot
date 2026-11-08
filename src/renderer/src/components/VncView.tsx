import { useEffect, useRef, useState } from 'react'
import RFB from '@novnc/novnc'
import { Button } from '@/components/ui/button'
import { useAppStore } from '../stores/useAppStore'
import { useT } from '../i18n'
import type { SessionConfig } from '../../../shared/types'
import { registerVnc, sendVncChar, sendVncCombo, sendVncKey, unregisterVnc } from '../desktop/vncAgent'
import { DesktopPerfHud } from './DesktopPerfHud'
import { ImeKeyboard } from './ImeKeyboard'

const VNC_PROFILE = {
  quality: { quality: 8, compression: 1 },
  balanced: { quality: 6, compression: 3 },
  speed: { quality: 3, compression: 7 },
  background: { quality: 1, compression: 9 }
}

export function VncView(props: { viewId: string; session: SessionConfig; active: boolean }) {
  const t = useT()
  const host = useRef<HTMLDivElement>(null)
  const rfbRef = useRef<RFB | null>(null)
  const autoLevelRef = useRef<'quality' | 'balanced' | 'speed'>('balanced')
  const activeRef = useRef(props.active)
  const [attempt, setAttempt] = useState(0)
  const desktopIme = useAppStore((s) => s.desktopIme)
  const setDesktopIme = useAppStore((s) => s.setDesktopIme)
  const ime = desktopIme[props.viewId] === true
  const status = useAppStore((s) => s.desktopState[props.viewId])
  const desktopPerformance = useAppStore((s) => s.desktopPerformance)
  const onStatus = useAppStore((s) => s.onDesktopStatus)
  activeRef.current = props.active

  useEffect(() => {
    let rfb: RFB | null = null
    let disposed = false
    let connected = false
    let clipboardTimer: number | undefined
    let lastClipboard = ''
    let cleanupResize: (() => void) | null = null
    const shareClipboard = props.session.desktopOptions?.clipboard !== false
    const syncClipboard = async () => {
      if (disposed || !connected || !rfb || rfb.viewOnly || !activeRef.current) return
      const text = await window.api.desktop.clipboard.read()
      if (!text || text === lastClipboard || disposed || !connected || !rfb || rfb.viewOnly) return
      lastClipboard = text
      rfb.clipboardPasteFrom(text)
    }
    const stopClipboardSync = () => {
      connected = false
      if (clipboardTimer !== undefined) window.clearInterval(clipboardTimer)
      clipboardTimer = undefined
    }
    const connect = async () => {
      onStatus({ viewId: props.viewId, sessionId: props.session.id, status: 'connecting' })
      try {
        const result = await window.api.desktop.open(props.viewId, props.session.id)
        if (disposed || !host.current) return
        if (result.mode !== 'embedded') throw new Error(t('vnc.vnc_did_not_enter_embedded_mode'))
        rfb = new RFB(host.current, result.url, { credentials: { password: result.password ?? '' } })
        rfbRef.current = rfb
        const canvas = host.current.querySelector('canvas')
        if (canvas) registerVnc(props.viewId, rfb, canvas)
        rfb.scaleViewport = true
        rfb.resizeSession = false
        rfb.viewOnly = props.session.desktopOptions?.viewOnly === true
        applyVncProfile(rfb, props.session.desktopOptions?.performance, activeRef.current, autoLevelRef.current)
        let resizeTimer: number | undefined
        let restoreTimer: number | undefined
        const fixedSize = Boolean(props.session.desktopOptions?.width && props.session.desktopOptions?.height)
        const resizeObserver = new ResizeObserver(() => {
          if (fixedSize) return
          if (resizeTimer !== undefined) window.clearTimeout(resizeTimer)
          resizeTimer = window.setTimeout(() => {
            if (!rfb || !connected) return
            rfb.resizeSession = true
            restoreTimer = window.setTimeout(() => {
              if (rfb) rfb.resizeSession = false
            }, 300)
          }, 400)
        })
        resizeObserver.observe(host.current)
        cleanupResize = () => {
          resizeObserver.disconnect()
          if (resizeTimer !== undefined) window.clearTimeout(resizeTimer)
          if (restoreTimer !== undefined) window.clearTimeout(restoreTimer)
        }
        rfb.addEventListener('connect', () => {
          if (disposed) return
          connected = true
          onStatus({ viewId: props.viewId, sessionId: props.session.id, status: 'connected' })
          if (shareClipboard) {
            void syncClipboard().catch(() => undefined)
            clipboardTimer = window.setInterval(() => void syncClipboard().catch(() => undefined), 800)
          }
        })
        rfb.addEventListener('disconnect', (event) => {
          stopClipboardSync()
          if (disposed) return
          const clean = Boolean(event.detail?.clean)
          onStatus({
            viewId: props.viewId,
            sessionId: props.session.id,
            status: clean ? 'disconnected' : 'error',
            message: clean ? t('vnc.vnc_disconnected') : t('vnc.vnc_connection_lost')
          })
        })
        rfb.addEventListener('credentialsrequired', () => {
          rfb?.sendCredentials({ password: result.password ?? '' })
        })
        if (shareClipboard) {
          rfb.addEventListener('clipboard', (event: CustomEvent<{ text?: string }>) => {
            const text = String(event.detail?.text ?? '')
            if (!text || text === lastClipboard) return
            lastClipboard = text
            void window.api.desktop.clipboard.write(text)
          })
        }
      } catch (error) {
        if (!disposed) {
          onStatus({
            viewId: props.viewId,
            sessionId: props.session.id,
            status: 'error',
            message: error instanceof Error ? error.message : String(error)
          })
        }
      }
    }
    void connect()
    return () => {
      disposed = true
      cleanupResize?.()
      stopClipboardSync()
      unregisterVnc(props.viewId)
      rfbRef.current = null
      rfb?.disconnect()
    }
  }, [props.viewId, props.session.id, attempt])

  useEffect(() => {
    const rfb = rfbRef.current
    if (!rfb) return
    const performance = props.session.desktopOptions?.performance
    if (!props.active) {
      applyVncProfile(rfb, performance, false, autoLevelRef.current)
      return
    }
    if (performance !== 'auto') {
      applyVncProfile(rfb, performance, true, autoLevelRef.current)
      return
    }
    applyVncProfile(rfb, 'auto', true, autoLevelRef.current)
    let disposed = false
    let lowSamples = 0
    let highSamples = 0
    const adjust = async () => {
      const metrics = await window.api.desktop.metrics(props.viewId)
      if (disposed || !metrics) return
      if (metrics.kbpsIn >= 3000) {
        lowSamples += 1
        highSamples = 0
      } else if (metrics.kbpsIn <= 600) {
        highSamples += 1
        lowSamples = 0
      } else {
        lowSamples = 0
        highSamples = 0
      }
      const current = autoLevelRef.current
      if (lowSamples >= 1 && current !== 'speed') {
        autoLevelRef.current = current === 'quality' ? 'balanced' : 'speed'
        applyVncProfile(rfb, 'auto', true, autoLevelRef.current)
        lowSamples = 0
      } else if (highSamples >= 3 && current !== 'quality') {
        autoLevelRef.current = current === 'speed' ? 'balanced' : 'quality'
        applyVncProfile(rfb, 'auto', true, autoLevelRef.current)
        highSamples = 0
      }
    }
    const timer = window.setInterval(() => void adjust().catch(() => undefined), 2000)
    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [props.active, props.session.desktopOptions?.performance, props.viewId])

  const error = status?.status === 'error'
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
      <div ref={host} className="absolute inset-0" />
      <ImeKeyboard
        active={ime && props.active}
        onChar={(char) => sendVncChar(props.viewId, char)}
        onKey={(name) => sendVncKey(props.viewId, name)}
        onCombo={(combo) => sendVncCombo(props.viewId, combo)}
        onExit={() => {
          setDesktopIme(props.viewId, false)
          host.current?.querySelector('canvas')?.focus()
        }}
      />
      {desktopPerformance && (
        <DesktopPerfHud
          viewId={props.viewId}
          protocol="vnc"
          active={props.active}
          performance={props.session.desktopOptions?.performance}
          canvas={() => host.current?.querySelector('canvas') ?? null}
        />
      )}
      {status?.status !== 'connected' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/90 px-8 text-center">
          <div className="text-sm text-muted-foreground">
            {status?.status === 'connecting' ? t('vnc.connecting_to_vnc') : error ? t('vnc.vnc_connection_failed') : t('vnc.vnc_disconnected')}
          </div>
          {status?.error && <pre className="max-w-2xl whitespace-pre-wrap text-xs text-destructive">{status.error}</pre>}
          <Button variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>
            {t('common.reconnect')}
          </Button>
        </div>
      )}
    </div>
  )
}

function applyVncProfile(
  rfb: RFB,
  performance: 'auto' | 'quality' | 'balanced' | 'speed' | undefined,
  active: boolean,
  autoLevel: 'quality' | 'balanced' | 'speed'
): void {
  const level = !active ? 'background' : performance === 'auto' ? autoLevel : (performance ?? 'balanced')
  const selected = VNC_PROFILE[level]
  rfb.qualityLevel = selected.quality
  rfb.compressionLevel = selected.compression
}
