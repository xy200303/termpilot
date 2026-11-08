import { useEffect, useRef } from 'react'
import i18n from '../i18n'

const SPECIAL_KEYS: Record<string, string> = {
  Enter: 'enter',
  Escape: 'esc',
  Tab: 'tab',
  Backspace: 'backspace',
  Delete: 'delete',
  Insert: 'insert',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Home: 'home',
  End: 'end',
  PageUp: 'pageup',
  PageDown: 'pagedown',
  F1: 'f1',
  F2: 'f2',
  F3: 'f3',
  F4: 'f4',
  F5: 'f5',
  F6: 'f6',
  F7: 'f7',
  F8: 'f8',
  F9: 'f9',
  F10: 'f10',
  F11: 'f11',
  F12: 'f12'
}

type Props = {
  active: boolean
  onChar: (char: string) => void
  onKey: (name: string) => void
  onCombo: (combo: string) => void
  onExit: () => void
}

/**
 * 透明 textarea 接管键盘：本地输入法在这里合成，合成结束再把整段字符发到远端。
 * pointer-events 关掉，鼠标仍然直接落在画布上。
 */
export function ImeKeyboard(props: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const composing = useRef(false)

  useEffect(() => {
    if (props.active) ref.current?.focus()
  }, [props.active])

  if (!props.active) return null

  const focus = () => ref.current?.focus()

  return (
    <textarea
      ref={ref}
      aria-label={String(i18n.t('ime.label', { defaultValue: 'Chinese keyboard input' }))}
      className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
      onBlur={() => window.setTimeout(focus, 0)}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return
        if (event.key === 'Escape') {
          event.preventDefault()
          props.onExit()
          return
        }
        event.preventDefault()
        const mods: string[] = []
        if (event.ctrlKey) mods.push('ctrl')
        if (event.altKey) mods.push('alt')
        if (event.shiftKey) mods.push('shift')
        if (event.metaKey) mods.push('meta')
        if (event.key.length === 1) {
          if (mods.length > 0) props.onCombo([...mods, event.key.toLowerCase()].join('-'))
          else props.onChar(event.key)
          return
        }
        const special = SPECIAL_KEYS[event.key]
        if (!special) return
        if (mods.length > 0) props.onCombo([...mods, special].join('-'))
        else props.onKey(special)
      }}
      onCompositionStart={() => {
        composing.current = true
      }}
      onCompositionEnd={(event) => {
        composing.current = false
        if (ref.current) ref.current.value = ''
        for (const char of event.data) props.onChar(char)
      }}
      onChange={(event) => {
        // 合成中的中间态不处理，合成结束统一发
        if (!composing.current && ref.current) ref.current.value = ''
        void event
      }}
    />
  )
}
