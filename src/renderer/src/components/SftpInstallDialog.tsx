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

type InstallView = {
  open: boolean
  status: 'running' | 'ok' | 'error'
  lines: string[]
}

/** 远程安装 SFTP 时弹出，把远端输出原样滚出来。 */
export function SftpInstallDialog() {
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
              ? '先看这台机器有没有 SFTP。已经有就不会安装。'
              : status === 'ok'
                ? '检查结束，正在重新连接。'
                : '文件通道没有打开，下面是这台机器的输出。'}
          </DialogDescription>
        </DialogHeader>
        <pre
          ref={box}
          className="max-h-80 min-h-40 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-5 whitespace-pre-wrap"
        >
          {view?.lines.join('\n') || '等待远程输出…'}
        </pre>
        <DialogFooter>
          <Button variant="outline" onClick={() => setView((current) => current && { ...current, open: false })}>
            {status === 'running' ? '隐藏' : '关闭'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
