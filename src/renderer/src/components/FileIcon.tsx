import { materialIconSrc } from '../icons/materialIcons'

/** 与 VS Code Material Icon Theme 相同的文件 / 文件夹图标。 */
export function FileIcon(props: {
  name: string
  kind: 'dir' | 'file' | 'link'
  open?: boolean
  root?: boolean
}) {
  const src = materialIconSrc(props.name, props.kind, props.open, props.root)
  if (!src) return <span className="size-4 shrink-0" />
  return <img src={src} alt="" draggable={false} className="size-4 shrink-0" />
}
