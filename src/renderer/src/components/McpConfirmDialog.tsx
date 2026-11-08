import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import type { McpConfirmRequest } from '../../../shared/types'

/** Agent 要执行危险命令时弹出。关掉窗口等于拒绝。 */
export function McpConfirmDialog() {
  const t = useT()
  const [queue, setQueue] = useState<McpConfirmRequest[]>([])
  const current = queue[0]

  useEffect(() => {
    return window.api.mcp.onConfirm((request) => setQueue((items) => [...items, request]))
  }, [])

  const reply = (ok: boolean) => {
    if (!current) return
    window.api.mcp.confirm(current.id, ok)
    setQueue((items) => items.slice(1))
  }

  return (
    <Dialog open={current !== undefined} onOpenChange={(open) => !open && reply(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('confirm.title')}</DialogTitle>
          <DialogDescription>{t('confirm.description')}</DialogDescription>
        </DialogHeader>
        <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 font-mono text-xs text-foreground">
          {current?.command}
        </pre>
        <DialogFooter>
          <Button variant="outline" onClick={() => reply(false)}>
            {t('confirm.deny')}
          </Button>
          <Button variant="destructive" onClick={() => reply(true)}>
            {t('confirm.allow')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
