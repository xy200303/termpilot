import { TerminalSquare } from 'lucide-react'
import { useT } from '../i18n'

/** 无标签页时的空状态 */
export function EmptyState() {
  const t = useT()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
      <TerminalSquare className="size-10" strokeWidth={1.25} />
      <p className="text-sm">{t('Open a local terminal, an SSH connection, or start a reverse listener from the sidebar')}</p>
    </div>
  )
}
