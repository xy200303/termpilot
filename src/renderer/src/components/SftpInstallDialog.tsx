import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import type { SftpInstallEvent } from '../../../shared/types'
import { useT } from '../i18n'

type InstallView = {
  open: boolean
  status: 'running' | 'ok' | 'error'
  lines: string[]
}

/** 文件通道打不开时弹出，把远端改子系统的输出原样滚出来。 */
export function SftpInstallDialog() {
  const t = useT()
  const [view, setView] = useState<InstallView | null>(null)
  const box = useRef<HTMLPreElement>(null)

  useEffect(() => {
    return window.api.sftp.onInstall((event: SftpInstallEvent) => {
      setView((current) => {
        if (event.phase === 'start') {
          return { open: true, status: 'running', lines: [event.text] }
        }
        const lines = [...(current?.lines ?? []), event.text].slice(-400)
        if (event.phase === 'done') return { open: true, status: 'ok', lines }
        if (event.phase === 'error') return { open: true, status: 'error', lines }
        return { open: true, status: current?.status === 'error' ? 'error' : 'running', lines }
      })
    })
  }, [])

  useEffect(() => {
    const el = box.current
    if (el) el.scrollTop = el.scrollHeight
  }, [view])

  const status = view?.status ?? 'running'

  return (
    <Dialog open={view?.open ?? false} onOpenChange={(open) => setView((current) => current && { ...current, open })}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>文件通道</DialogTitle>
          <DialogDescription>
            {status === 'running'
              ? t('sftp.switching_to_the_built_in_sftp_subsystem')
              : status === 'ok'
                ? t('sftp.switched_to_the_built_in_sftp_connecting')
                : t('sftp.the_file_channel_did_not_open_output_from_the_ma')}
          </DialogDescription>
        </DialogHeader>
        <pre
          ref={box}
          className="max-h-80 min-h-40 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-5 whitespace-pre-wrap"
        >
          {view?.lines.join('\n') || t('sftp.waiting_for_remote_output')}
        </pre>
        <DialogFooter>
          <Button variant="outline" onClick={() => setView((current) => current && { ...current, open: false })}>
            {status === 'running' ? t('sftp.hide') : t('editor.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
