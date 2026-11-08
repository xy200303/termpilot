import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { sendTextToVnc } from '../desktop/vncAgent'
import { sendTextToRdp } from '../desktop/rdpAgent'

type Props = {
  viewId: string
  mode: 'vnc' | 'rdp'
  disabled?: boolean
}

/** 图形桌面里的「发送文字」：本机输入法打完，再整段走剪贴板送进远端。 */
export function DesktopTextInput(props: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const send = async (pasteKeys: string) => {
    if (!text || busy) return
    setBusy(true)
    setMessage('')
    try {
      if (props.mode === 'vnc') await sendTextToVnc(props.viewId, text, pasteKeys)
      else await sendTextToRdp(props.viewId, text, pasteKeys)
      setText('')
      setMessage(pasteKeys === 'ctrl-shift-v' ? '已按终端方式粘贴' : '已粘贴')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <Button
        size="sm"
        variant="secondary"
        className="absolute bottom-3 right-3 z-20"
        disabled={props.disabled}
        onClick={() => setOpen(true)}
      >
        发送文字
      </Button>
    )
  }

  return (
    <div className="absolute bottom-3 right-3 z-20 w-72 rounded-lg border bg-background/95 p-3 shadow-lg">
      <textarea
        autoFocus
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="在这里用本机输入法打字，再选粘贴方式"
        className="h-20 w-full resize-none rounded-md border bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:ring-1"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void send('ctrl-v')
          if (event.key === 'Escape') setOpen(false)
        }}
      />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Button size="sm" disabled={busy || !text} onClick={() => void send('ctrl-v')}>
          粘贴
        </Button>
        <Button size="sm" variant="outline" disabled={busy || !text} onClick={() => void send('ctrl-shift-v')}>
          粘贴到终端
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          关闭
        </Button>
      </div>
      {message && <div className="mt-1 text-xs text-muted-foreground">{message}</div>}
    </div>
  )
}
