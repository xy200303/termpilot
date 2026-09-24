import { materialIconSrc } from '../icons/materialIcons'
import { useAppStore } from '../stores/useAppStore'

/** 与 VS Code Material Icon Theme 相同的文件 / 文件夹图标。 */
export function FileIcon(props: {
  name: string
  kind: 'dir' | 'file' | 'link'
  open?: boolean
  root?: boolean
}) {
  const light = useAppStore((s) => s.resolvedApp) === 'light'
  const src = materialIconSrc(props.name, props.kind, props.open, props.root, light)
  if (!src) return <span className="size-4 shrink-0" />
  return <img src={src} alt="" draggable={false} className="block size-4 shrink-0 object-contain" />
}
