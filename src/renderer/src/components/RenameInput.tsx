import { useRef, useState } from 'react'
import { Input } from '@/components/ui/input'

/** 回车或点到别处就提交，Esc 取消。提交和取消只会发生一次。 */
export function RenameInput(props: {
  initial: string
  placeholder?: string
  className?: string
  onCommit: (value: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(props.initial)
  const done = useRef(false)

  const finish = (commit: boolean) => {
    if (done.current) return
    done.current = true
    if (commit) props.onCommit(value)
    else props.onCancel()
  }

  return (
    <Input
      autoFocus
      value={value}
      placeholder={props.placeholder ?? '回车确认'}
      className={props.className ?? 'h-7 text-xs'}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') {
          event.preventDefault()
          finish(true)
        } else if (event.key === 'Escape') {
          event.preventDefault()
          finish(false)
        }
      }}
    />
  )
}
