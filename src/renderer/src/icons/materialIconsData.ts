import type { IconTheme } from './materialIcons'

/* 图标清单和 1000 个 SVG 的 URL 都放在这个动态块里：
   只有第一次渲染文件图标时才加载，不参与首屏。 */
const iconUrls = import.meta.glob('../../../../node_modules/material-icon-theme/icons/*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>

export async function loadIconData(): Promise<{ theme: IconTheme; urls: Map<string, string> }> {
  const mod = await import('material-icon-theme/dist/material-icons.json')
  const theme = (mod.default ?? (mod as unknown)) as IconTheme
  const urls = new Map<string, string>()
  for (const [path, url] of Object.entries(iconUrls)) {
    urls.set(path.slice(path.lastIndexOf('/') + 1), url)
  }
  return { theme, urls }
}
