import { Fragment, useCallback, useEffect, useState } from 'react'
import { ChevronRight, Download, FolderPlus, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore } from '../stores/useAppStore'
import { FileIcon } from './FileIcon'
import type { RemoteFile } from '../../../shared/types'

type DirListing = { entries: RemoteFile[]; error?: string }

/** 当前正向 SSH 的远程目录，按 VS Code 资源管理器的方式就地展开。 */
export function FileTree() {
  const sessions = useAppStore((s) => s.sessions)
  const selectedId = useAppStore((s) => s.selectedSessionId)
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)

  const active = tabs.find((t) => t.id === activeTabId)
  const session =
    sessions.find((s) => s.id === selectedId) ??
    sessions.find((s) => s.id === active?.sessionId) ??
    null
  const forward = session && (session.mode ?? 'forward') === 'forward' ? session : null

  const [root, setRoot] = useState('.')
  const [entries, setEntries] = useState<RemoteFile[]>([])
  const [cache, setCache] = useState<Record<string, DirListing>>({})
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [folderName, setFolderName] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<RemoteFile | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const openRemoteEditor = useAppStore((s) => s.openRemoteEditor)

  const loadRoot = useCallback(
    async (path: string) => {
      if (!forward) return
      setBusy(true)
      setError('')
      try {
        const res = await window.api.sftp.list(forward.id, path)
        setRoot(res.path)
        setEntries(sortEntries(res.entries))
        setCache({})
        setOpen({ [res.path]: true })
        setSelected(res.path)
        setError('')
      } catch (e) {
        setEntries([])
        setError(sftpMessage(e))
      } finally {
        setBusy(false)
      }
    },
    [forward]
  )

  useEffect(() => {
    setRoot('.')
    setEntries([])
    setCache({})
    setOpen({})
    setSelected(null)
    setError('')
    if (forward) void loadRoot('.')
  }, [forward, loadRoot])

  const listInto = useCallback(
    async (path: string) => {
      if (!forward) return
      setLoading((s) => ({ ...s, [path]: true }))
      try {
        const res = await window.api.sftp.list(forward.id, path)
        const sorted = sortEntries(res.entries)
        if (path === root) {
          setRoot(res.path)
          setEntries(sorted)
        } else {
          setCache((s) => ({ ...s, [path]: { entries: sorted } }))
        }
      } catch (e) {
        const message = sftpMessage(e)
        if (path === root) setError(message)
        else setCache((s) => ({ ...s, [path]: { entries: [], error: message } }))
      } finally {
        setLoading((s) => ({ ...s, [path]: false }))
      }
    },
    [forward, root]
  )

  const toggle = async (path: string) => {
    if (open[path]) {
      setOpen((s) => ({ ...s, [path]: false }))
      return
    }
    setOpen((s) => ({ ...s, [path]: true }))
    if (path !== root && !cache[path]) await listInto(path)
  }

  const ensureOpen = async (path: string) => {
    setOpen((s) => ({ ...s, [path]: true }))
    if (path === root) await listInto(path)
    else await listInto(path)
  }

  if (!session) {
    return <Hint text="在「连接」里选一条正向 SSH，这里显示那台机器的文件。" />
  }
  if (!forward) {
    return <Hint text="文件树跟随正向 SSH。反向监听进来的是 shell。" />
  }

  const unsupported = error === NO_SFTP

  const directoryOf = (path: string | null) => {
    if (!path || path === root) return root
    const found = findFile(path, root, entries, cache)
    if (found?.kind === 'dir') return found.path
    return parentDir(path) ?? root
  }

  const commitRename = async () => {
    if (!renaming) return
    const name = renameValue.trim()
    if (!name || name.includes('/') || name.includes('\\')) {
      setError('名称不能为空，也不能包含斜杠')
      return
    }
    if (name === renaming.name) {
      setRenaming(null)
      return
    }
    const slash = renaming.path.lastIndexOf('/')
    const to =
      slash < 0 ? name : slash === 0 ? `/${name}` : `${renaming.path.slice(0, slash)}/${name}`
    try {
      await window.api.sftp.rename(forward.id, renaming.path, to)
      setRenaming(null)
      await listInto(parentDir(renaming.path) ?? root)
    } catch (e) {
      setError(sftpMessage(e))
    }
  }

  const remove = async (item: RemoteFile) => {
    const message =
      item.kind === 'dir' ? `删除目录 ${item.name} 及其中的文件？` : `删除 ${item.name}？`
    if (!confirm(message)) return
    try {
      await window.api.sftp.remove(forward.id, item.path, item.kind)
      await listInto(parentDir(item.path) ?? root)
    } catch (e) {
      setError(sftpMessage(e))
    }
  }

  const upload = async () => {
    const dest = directoryOf(selected)
    setBusy(true)
    try {
      await window.api.sftp.upload(forward.id, dest)
      await ensureOpen(dest)
    } catch (e) {
      setError(sftpMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const download = async (item: RemoteFile) => {
    try {
      await window.api.sftp.download(forward.id, item)
    } catch (e) {
      setError(sftpMessage(e))
    }
  }

  const mkdir = async () => {
    const name = folderName?.trim()
    if (!name) return
    const dest = directoryOf(selected)
    try {
      await window.api.sftp.mkdir(forward.id, dest, name)
      setFolderName(null)
      await ensureOpen(dest)
    } catch (e) {
      setError(sftpMessage(e))
    }
  }

  const refresh = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await window.api.sftp.list(forward.id, root)
      setRoot(res.path)
      setEntries(sortEntries(res.entries))
      const paths = Object.keys(open).filter((p) => open[p] && p !== root && p !== res.path)
      const next: Record<string, DirListing> = {}
      await Promise.all(
        paths.map(async (p) => {
          try {
            const child = await window.api.sftp.list(forward.id, p)
            next[p] = { entries: sortEntries(child.entries) }
          } catch (e) {
            next[p] = { entries: [], error: sftpMessage(e) }
          }
        })
      )
      setCache(next)
    } catch (e) {
      setError(sftpMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const renderNodes = (items: RemoteFile[], depth: number) =>
    items.map((item) => {
      const isDir = item.kind === 'dir'
      const expanded = isDir && !!open[item.path]
      const listing = cache[item.path]
      return (
        <Fragment key={item.path}>
          {renaming?.path === item.path ? (
            <form
              className="px-2 py-0.5"
              style={{ paddingLeft: depth * TREE_INDENT }}
              onSubmit={(e) => {
                e.preventDefault()
                void commitRename()
              }}
            >
              <Input
                autoFocus
                value={renameValue}
                className="h-6 text-xs"
                placeholder="回车确认"
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setRenaming(null)
                }}
              />
            </form>
          ) : (
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div
                  role="treeitem"
                  aria-expanded={isDir ? expanded : undefined}
                  aria-selected={selected === item.path}
                  title={item.kind === 'dir' ? item.path : `${item.name}  ${formatSize(item.size)}`}
                  className={`flex h-[22px] w-full cursor-pointer items-center pr-2 text-left text-[13px] select-none hover:bg-foreground/5 ${
                    selected === item.path ? 'bg-foreground/10' : ''
                  }`}
                  style={{ paddingLeft: depth * TREE_INDENT }}
                  onContextMenu={() => setSelected(item.path)}
                  onClick={() => {
                    setSelected(item.path)
                    if (isDir) {
                      if (!open[item.path]) void toggle(item.path)
                    } else {
                      openRemoteEditor(forward.id, { path: item.path, name: item.name }, false)
                    }
                  }}
                  onDoubleClick={() => {
                    if (isDir) {
                      if (!open[item.path]) void toggle(item.path)
                    } else {
                      openRemoteEditor(forward.id, { path: item.path, name: item.name }, true)
                    }
                  }}
                >
                  {isDir && (
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      <button
                        type="button"
                        className="flex size-4 items-center justify-center text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          void toggle(item.path)
                        }}
                      >
                        <ChevronRight className={`size-3.5 ${expanded ? 'rotate-90' : ''}`} />
                      </button>
                    </span>
                  )}
                  <FileIcon name={item.name} kind={item.kind} open={expanded} />
                  <span className="min-w-0 flex-1 truncate pl-1">{item.name}</span>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                {item.kind !== 'dir' && (
                  <ContextMenuItem
                    onClick={() => openRemoteEditor(forward.id, { path: item.path, name: item.name }, true)}
                  >
                    编辑
                  </ContextMenuItem>
                )}
                <ContextMenuItem
                  onClick={() => {
                    setRenaming(item)
                    setRenameValue(item.name)
                  }}
                >
                  <Pencil /> 重命名
                </ContextMenuItem>
                {item.kind !== 'dir' && (
                  <ContextMenuItem onClick={() => download(item)}>
                    <Download /> 下载
                  </ContextMenuItem>
                )}
                <ContextMenuItem variant="destructive" onClick={() => remove(item)}>
                  <Trash2 /> 删除
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          )}
          {expanded && (
            <div>
              {loading[item.path] && !listing && (
                <p className="flex h-[22px] items-center text-[12px] text-muted-foreground" style={{ paddingLeft: (depth + 1) * TREE_INDENT + TREE_TWISTIE }}>
                  正在加载
                </p>
              )}
              {listing?.error && (
                <p className="text-[11px] text-destructive" style={{ paddingLeft: (depth + 1) * TREE_INDENT + TREE_TWISTIE }}>
                  {listing.error}
                </p>
              )}
              {listing && listing.entries.length === 0 && !listing.error && (
                <p className="flex h-[22px] items-center text-[12px] text-muted-foreground" style={{ paddingLeft: (depth + 1) * TREE_INDENT + TREE_TWISTIE }}>
                  空目录
                </p>
              )}
              {listing && renderNodes(listing.entries, depth + 1)}
            </div>
          )}
        </Fragment>
      )
    })

  const rootOpen = !!open[root]
  const rootName = baseName(root)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 px-2 py-1">
        <p className="min-w-0 flex-1 truncate text-xs font-medium">{forward.name}</p>
        <Button variant="ghost" size="icon-sm" title="刷新" disabled={busy} onClick={() => void refresh()}>
          <RefreshCw />
        </Button>
        {!unsupported && (
          <>
            <Button variant="ghost" size="icon-sm" title="新建文件夹" onClick={() => setFolderName('')}>
              <FolderPlus />
            </Button>
            <Button variant="ghost" size="icon-sm" title="上传" disabled={busy} onClick={() => void upload()}>
              <Upload />
            </Button>
          </>
        )}
      </div>
      {unsupported ? (
        <Hint text="这台机器没有 SFTP。已经试过在当前 SSH 连接里安装。需要 root 或免密 sudo，并且机器能访问软件源。不需要另开端口。" />
      ) : (
        <>
          {folderName !== null && (
            <form
              className="flex gap-1 px-2 pb-1"
              onSubmit={(e) => {
                e.preventDefault()
                void mkdir()
              }}
            >
              <Input
                autoFocus
                value={folderName}
                placeholder="文件夹名"
                onChange={(e) => setFolderName(e.target.value)}
                className="h-7"
              />
              <Button type="submit" size="sm">
                创建
              </Button>
            </form>
          )}
          {busy && entries.length === 0 && !error && (
            <Hint text="正在通过当前 SSH 连接准备 SFTP，不会另开端口。" />
          )}
          {error && <p className="px-3 pb-1 text-[11px] text-destructive">{error}</p>}
          <ScrollArea className="min-h-0 flex-1">
            <div role="tree" className="pb-2">
              <div
                role="treeitem"
                aria-expanded={rootOpen}
                aria-selected={selected === root}
                title={root}
                className={`flex h-[22px] w-full cursor-pointer items-center pr-2 text-[13px] select-none hover:bg-foreground/5 ${
                  selected === root ? 'bg-foreground/10' : ''
                }`}
                style={{ paddingLeft: 0 }}
                onClick={() => {
                  setSelected(root)
                  if (!rootOpen) void toggle(root)
                }}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  <button
                    type="button"
                    className="flex size-4 items-center justify-center text-muted-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      void toggle(root)
                    }}
                  >
                    <ChevronRight className={`size-3.5 ${rootOpen ? 'rotate-90' : ''}`} />
                  </button>
                </span>
                <FileIcon name={rootName} kind="dir" open={rootOpen} />
                <span className="min-w-0 flex-1 truncate pl-1">{rootName}</span>
              </div>
              {rootOpen && (
                <>
                  {entries.length === 0 && !busy && !error && (
                    <p className="flex h-[22px] items-center text-[12px] text-muted-foreground" style={{ paddingLeft: TREE_INDENT + TREE_TWISTIE }}>
                      空目录
                    </p>
                  )}
                  {renderNodes(entries, 1)}
                </>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  )
}

/** 与 VS Code 资源管理器相同：每级缩进 8px。文件图标和同级目录的箭头对齐。 */
const TREE_INDENT = 8
const TREE_TWISTIE = 16

function findFile(
  path: string,
  root: string,
  entries: RemoteFile[],
  cache: Record<string, DirListing>
): RemoteFile | null {
  if (path === root) return { name: baseName(root), path: root, kind: 'dir', size: 0, mtime: 0 }
  const scan = (items: RemoteFile[]): RemoteFile | null => {
    for (const item of items) {
      if (item.path === path) return item
      const nested = cache[item.path]
      if (nested) {
        const hit = scan(nested.entries)
        if (hit) return hit
      }
    }
    return null
  }
  return scan(entries)
}

function sortEntries(items: RemoteFile[]): RemoteFile[] {
  return [...items].sort((a, b) => {
    const ad = a.kind === 'dir' ? 0 : 1
    const bd = b.kind === 'dir' ? 0 : 1
    if (ad !== bd) return ad - bd
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
  })
}

function baseName(path: string): string {
  if (path === '/' || path === '.') return path
  const trimmed = path.replace(/\/+$/, '')
  const slash = trimmed.lastIndexOf('/')
  return slash < 0 ? trimmed : trimmed.slice(slash + 1) || '/'
}

function parentDir(path: string): string | null {
  if (!path.startsWith('/')) return null
  const trimmed = path.replace(/\/+$/, '')
  if (!trimmed) return null
  const slash = trimmed.lastIndexOf('/')
  if (slash < 0) return null
  return slash === 0 ? '/' : trimmed.slice(0, slash)
}

function Hint(props: { text: string }) {
  return <p className="px-3 py-6 text-center text-xs leading-5 text-muted-foreground">{props.text}</p>
}

const NO_SFTP = '这台机器没有 SFTP'

function sftpMessage(error: unknown): string {
  const raw = (error instanceof Error ? error.message : String(error)).replace(
    /^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/,
    ''
  )
  if (/Received exit code 127|establishing SFTP/i.test(raw)) return NO_SFTP
  return raw
}

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`
}
