import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { readBuffer } from '../editor/editorBuffers'
import { useAppStore, type EditorTab } from '../stores/useAppStore'
import { FileIcon } from './FileIcon'

function unsaved(tab: EditorTab): boolean {
  if (tab.dirty) return true
  const buffer = readBuffer(tab.key)
  return !!buffer?.loaded && buffer.text !== buffer.saved
}

/** 连接标签下面的文件标签。点 × 关闭；没保存会先确认。 */
export function EditorTabBar(props: { tabs: EditorTab[]; activeKey: string | null }) {
  const closeEditorTab = useAppStore((s) => s.closeEditorTab)
  const activateEditorTab = useAppStore((s) => s.activateEditorTab)
  const setNotice = useAppStore((s) => s.setNotice)
  const [pending, setPending] = useState<EditorTab | null>(null)
  const [saving, setSaving] = useState(false)

  const close = (tab: EditorTab) => {
    if (unsaved(tab)) {
      setPending(tab)
      return
    }
    closeEditorTab(tab.key)
  }

  const discard = () => {
    if (!pending) return
    closeEditorTab(pending.key)
    setPending(null)
  }

  const saveAndClose = async () => {
    if (!pending) return
    const buffer = readBuffer(pending.key)
    if (!buffer?.loaded) {
      discard()
      return
    }
    setSaving(true)
    try {
      await window.api.sftp.write(pending.sessionId, pending.path, buffer.text)
      closeEditorTab(pending.key)
      setPending(null)
    } catch (e) {
      const message = e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, '') : String(e)
      setNotice(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <div className="flex h-8 shrink-0 items-center gap-0.5 overflow-x-auto border-b bg-muted/40 px-1">
      {props.tabs.map((tab) => {
        const active = tab.key === props.activeKey
        return (
          <div
            key={tab.key}
            title={tab.path}
            className={`flex h-6 max-w-52 min-w-0 items-center gap-1 rounded-sm pl-2 pr-1 text-[13px] ${
              active ? 'bg-background text-foreground' : 'text-muted-foreground hover:bg-background/70'
            }`}
          >
            <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5" onClick={() => activateEditorTab(tab.key)}>
              <FileIcon name={tab.name} kind="file" />
              <span className={`truncate ${tab.preview ? 'italic' : ''}`}>{tab.name}</span>
              {tab.dirty && <span className="size-2 shrink-0 rounded-full bg-foreground" />}
            </button>
            <button
              type="button"
              title="关闭"
              className="flex size-4 shrink-0 items-center justify-center rounded-sm opacity-60 hover:bg-foreground/10 hover:opacity-100"
              onClick={() => close(tab)}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <X className="size-3" />
            </button>
          </div>
        )
      })}
    </div>
    <Dialog open={pending !== null} onOpenChange={(open) => !open && !saving && setPending(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>文件尚未保存</DialogTitle>
          <DialogDescription>
            {pending?.name} 有未保存的修改。关闭后这些内容会丢失。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={() => setPending(null)}>
            取消
          </Button>
          <Button variant="destructive" disabled={saving} onClick={discard}>
            不保存
          </Button>
          <Button disabled={saving} onClick={() => void saveAndClose()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
