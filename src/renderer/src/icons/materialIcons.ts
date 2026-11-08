/**
 * VS Code Material Icon Theme：按文件名、扩展名、文件夹名选图标。
 * 图标清单和 SVG 地址都在 materialIconsData 里按需加载，不参与首屏。
 */
export type IconTheme = {
  iconDefinitions: Record<string, { iconPath: string }>
  file: string
  folder: string
  folderExpanded: string
  rootFolder?: string
  rootFolderExpanded?: string
  fileExtensions: Record<string, string>
  fileNames: Record<string, string>
  folderNames: Record<string, string>
  folderNamesExpanded: Record<string, string>
  rootFolderNames?: Record<string, string>
  rootFolderNamesExpanded?: Record<string, string>
  light?: {
    fileExtensions?: Record<string, string>
    fileNames?: Record<string, string>
    folderNames?: Record<string, string>
    folderNamesExpanded?: Record<string, string>
    rootFolderNames?: Record<string, string>
    rootFolderNamesExpanded?: Record<string, string>
  }
}

type NameMaps = {
  fileNames: Record<string, string>
  fileExtensions: Record<string, string>
  folderNames: Record<string, string>
  folderNamesExpanded: Record<string, string>
  rootFolderNames: Record<string, string>
  rootFolderNamesExpanded: Record<string, string>
}

let theme: IconTheme | null = null
let urls = new Map<string, string>()
let darkMaps: NameMaps | null = null
let lightMaps: NameMaps | null = null
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

function build(): void {
  if (!theme) return
  const light = theme.light
  darkMaps = {
    fileNames: theme.fileNames,
    fileExtensions: theme.fileExtensions,
    folderNames: theme.folderNames,
    folderNamesExpanded: theme.folderNamesExpanded,
    rootFolderNames: theme.rootFolderNames ?? {},
    rootFolderNamesExpanded: theme.rootFolderNamesExpanded ?? {}
  }
  lightMaps = {
    fileNames: { ...theme.fileNames, ...light?.fileNames },
    fileExtensions: { ...theme.fileExtensions, ...light?.fileExtensions },
    folderNames: { ...theme.folderNames, ...light?.folderNames },
    folderNamesExpanded: { ...theme.folderNamesExpanded, ...light?.folderNamesExpanded },
    rootFolderNames: { ...theme.rootFolderNames, ...light?.rootFolderNames },
    rootFolderNamesExpanded: { ...theme.rootFolderNamesExpanded, ...light?.rootFolderNamesExpanded }
  }
}

/** 加载并构建图标映射；重复调用只加载一次。 */
export function ensureMaterialIcons(): Promise<void> {
  if (loading) return loading
  loading = import('./materialIconsData')
    .then((mod) => mod.loadIconData())
    .then((data) => {
      theme = data.theme
      urls = data.urls
      build()
    })
    .catch(() => {
      /* 清单加载失败就退回无图标，不影响文件树 */
    })
    .finally(() => {
      for (const notify of listeners) notify()
      listeners.clear()
    })
  return loading
}

/** 图标就绪后重渲染一次。返回取消订阅函数。 */
export function subscribeMaterialIcons(notify: () => void): () => void {
  if (theme) return () => undefined
  listeners.add(notify)
  void ensureMaterialIcons()
  return () => {
    listeners.delete(notify)
  }
}

function srcOf(id: string | undefined): string {
  if (!theme) return ''
  const def = (id && theme.iconDefinitions[id]) || theme.iconDefinitions[theme.file]
  if (!def) return ''
  const file = def.iconPath.slice(def.iconPath.lastIndexOf('/') + 1)
  return urls.get(file) ?? urls.get('file.svg') ?? ''
}

export function materialIconSrc(
  name: string,
  kind: 'dir' | 'file' | 'link',
  open = false,
  root = false,
  lightMode = true
): string {
  if (!theme || !darkMaps || !lightMaps) return ''
  const maps = lightMode ? lightMaps : darkMaps
  const lower = name.toLowerCase()
  if (kind === 'dir') {
    if (root) {
      const id = open ? maps.rootFolderNamesExpanded[lower] : maps.rootFolderNames[lower]
      return srcOf(id ?? (open ? theme.rootFolderExpanded : theme.rootFolder) ?? (open ? theme.folderExpanded : theme.folder))
    }
    const id = open ? maps.folderNamesExpanded[lower] : maps.folderNames[lower]
    return srcOf(id ?? (open ? theme.folderExpanded : theme.folder))
  }
  const named = maps.fileNames[lower]
  if (named) return srcOf(named)
  const parts = lower.split('.')
  for (let i = 1; i < parts.length; i++) {
    const ext = parts.slice(i).join('.')
    const id = maps.fileExtensions[ext]
    if (id) return srcOf(id)
  }
  return srcOf(theme.file)
}
