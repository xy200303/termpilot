/**
 * VS Code Material Icon Theme：按文件名、扩展名、文件夹名选图标。
 * 声明模块类型，避免把整份清单推断成巨大的字面量类型。
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

import rawTheme from 'material-icon-theme/dist/material-icons.json'

const theme = rawTheme as unknown as IconTheme

const iconUrls = import.meta.glob('../../../../node_modules/material-icon-theme/icons/*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>

const urls = new Map<string, string>()
for (const [path, url] of Object.entries(iconUrls)) {
  urls.set(path.slice(path.lastIndexOf('/') + 1), url)
}

const light = theme.light
const fileNames = { ...theme.fileNames, ...light?.fileNames }
const fileExtensions = { ...theme.fileExtensions, ...light?.fileExtensions }
const folderNames = { ...theme.folderNames, ...light?.folderNames }
const folderNamesExpanded = { ...theme.folderNamesExpanded, ...light?.folderNamesExpanded }
const rootFolderNames = { ...theme.rootFolderNames, ...light?.rootFolderNames }
const rootFolderNamesExpanded = { ...theme.rootFolderNamesExpanded, ...light?.rootFolderNamesExpanded }

function srcOf(id: string | undefined): string {
  const def = (id && theme.iconDefinitions[id]) || theme.iconDefinitions[theme.file]
  if (!def) return ''
  const file = def.iconPath.slice(def.iconPath.lastIndexOf('/') + 1)
  return urls.get(file) ?? urls.get('file.svg') ?? ''
}

export function materialIconSrc(
  name: string,
  kind: 'dir' | 'file' | 'link',
  open = false,
  root = false
): string {
  const lower = name.toLowerCase()
  if (kind === 'dir') {
    if (root) {
      const id = open ? rootFolderNamesExpanded[lower] : rootFolderNames[lower]
      return srcOf(id ?? (open ? theme.rootFolderExpanded : theme.rootFolder) ?? (open ? theme.folderExpanded : theme.folder))
    }
    const id = open ? folderNamesExpanded[lower] : folderNames[lower]
    return srcOf(id ?? (open ? theme.folderExpanded : theme.folder))
  }
  const named = fileNames[lower]
  if (named) return srcOf(named)
  const parts = lower.split('.')
  for (let i = 1; i < parts.length; i++) {
    const ext = parts.slice(i).join('.')
    const id = fileExtensions[ext]
    if (id) return srcOf(id)
  }
  return srcOf(theme.file)
}
