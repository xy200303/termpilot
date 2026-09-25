import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

/** 右键菜单关掉之后再打开，避免弹窗立刻被收掉。 */
export function openAfterMenu(open: () => void): void {
  window.setTimeout(open, 0)
}

/** 备注和重命名都走弹窗，不在树或标签上原地改。 */
export function RemarkDialog(props: {
  open: boolean
  title: string
  description: string
  initial: string
  placeholder: string
  error?: string
  onOpenChange: (open: boolean) => void
  onSave: (value: string) => void
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? (
        <RemarkForm
          key={props.initial}
          title={props.title}
          description={props.description}
          initial={props.initial}
          placeholder={props.placeholder}
          error={props.error}
          onCancel={() => props.onOpenChange(false)}
          onSave={props.onSave}
        />
      ) : null}
    </Dialog>
  )
}

function RemarkForm(props: {
  title: string
  description: string
  initial: string
  placeholder: string
  error?: string
  onCancel: () => void
  onSave: (value: string) => void
}) {
  const [value, setValue] = useState(props.initial)

  const save = () => props.onSave(value)

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{props.title}</DialogTitle>
        <DialogDescription>{props.description}</DialogDescription>
      </DialogHeader>
      <Input
        autoFocus
        value={value}
        placeholder={props.placeholder}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            save()
          }
        }}
      />
      {props.error ? <p className="text-sm text-destructive">{props.error}</p> : null}
      <DialogFooter>
        <Button variant="outline" onClick={props.onCancel}>
          取消
        </Button>
        <Button onClick={save}>保存</Button>
      </DialogFooter>
    </DialogContent>
  )
}
