import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import type { CaptureDone } from '../terminal/captureView'

/** 截图完成后的确认。失败时直接说明原因。可以打开文件所在目录，或把图片复制到剪贴板。 */
export function CaptureDialog(props: { shot: CaptureDone | null; error?: string | null; onClose: () => void }) {
  const file = props.shot?.paths.at(-1) ?? ''
  const [preview, setPreview] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setCopied(false)
    setError('')
    setPreview('')
    if (!file) return
    let cancelled = false
    void window.api.capture.read(file).then(
      (png) => {
        if (!cancelled) setPreview(`data:image/png;base64,${png}`)
      },
      (e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    )
    return () => {
      cancelled = true
    }
  }, [file])

  const reveal = async () => {
    setError('')
    try {
      await window.api.capture.reveal(file)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const copy = async () => {
    setError('')
    try {
      await window.api.capture.copy(file)
      setCopied(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const count = props.shot?.paths.length ?? 0
  const name = file.split(/[/\\]/).pop() ?? file

  if (props.error) {
    return (
      <Dialog open onOpenChange={(open) => !open && props.onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>截图没有完成</DialogTitle>
            <DialogDescription>{props.error}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={props.onClose}>知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={props.shot !== null} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>截图已保存</DialogTitle>
          <DialogDescription>
            {count > 1 ? `共 ${count} 张，下面是最后一张。` : '已经保存到截图目录。'}
            {props.shot?.note ? ` ${props.shot.note}` : ''}
          </DialogDescription>
        </DialogHeader>
        {preview && (
          <img src={preview} alt="" className="max-h-56 w-full rounded-md border bg-muted object-contain" />
        )}
        <p className="truncate font-mono text-[11px] text-muted-foreground" title={file}>
          {name}
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => void reveal()}>
            打开所在目录
          </Button>
          <Button onClick={() => void copy()}>{copied ? '已复制' : '复制图片'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
