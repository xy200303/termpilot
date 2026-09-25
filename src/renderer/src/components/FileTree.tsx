import { Fragment, useCallback, useEffect, useState } from 'react'
import { Download, FolderInput, FolderPlus, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore } from '../stores/useAppStore'
import { FileIcon } from './FileIcon'
import { openAfterMenu, RemarkDialog } from './RemarkDialog'
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
  const [making, setMaking] = useState(false)
  const [folderError, setFolderError] = useState('')
  const [picking, setPicking] = useState(false)
  const [pathError, setPathError] = useState('')
  const [renaming, setRenaming] = useState<RemoteFile | null>(null)
  const [renameError, setRenameError] = useState('')
  const openRemoteEditor = useAppStore((s) => s.openRemoteEditor)

  const sessionId = forward?.id ?? null

  const showRoot = async (id: string, path: string) => {
    const requested = path.trim().replaceAll('\\', '/') || '.'
    const res = await window.api.sftp.list(id, requested)
    setRoot(res.path)
    setEntries(sortEntries(res.entries))
    setCache({})
    setOpen({ [res.path]: true })
    setSelected(res.path)
    setError('')
    writeRoot(id, res.path)
  }

  const loadRoot = useCallback(async (id: string, path: string, fallback = false) => {
    setBusy(true)
    setError('')
    try {
      await showRoot(id, path)
      setPicking(false)
      setPathError('')
    } catch (e) {
      if (fallback && path !== '.') {
        try {
          await showRoot(id, '.')
          setError('上次打开的目录打不开，已回到登录目录')
          setPicking(false)
          return
        } catch (again) {
          setEntries([])
          setError(sftpMessage(again))
          return
        }
      }
      setError(sftpMessage(e))
      setPathError(sftpMessage(e))
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    setRoot('.')
    setEntries([])
    setCache({})
    setOpen({})
    setSelected(null)
    setError('')
    setPicking(false)
    setMaking(false)
    setRenaming(null)
    if (!sessionId) return
    const saved = readRoot(sessionId)
    void loadRoot(sessionId, saved || '.', Boolean(saved))
  }, [sessionId, loadRoot])

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

  const commitRename = async (raw: string) => {
    if (!renaming) return
    const name = raw.trim()
    if (!name || name.includes('/') || name.includes('\\')) {
      setRenameError('名称不能为空，也不能包含斜杠')
      return
    }
    if (name === renaming.name) {
      setRenaming(null)
      setRenameError('')
      return
    }
    const slash = renaming.path.lastIndexOf('/')
    const to = slash < 0 ? name : slash === 0 ? `/${name}` : `${renaming.path.slice(0, slash)}/${name}`
    const parent = parentDir(renaming.path) ?? root
    try {
      await window.api.sftp.rename(forward.id, renaming.path, to)
      setRenaming(null)
      setRenameError('')
      await listInto(parent)
    } catch (e) {
      setRenameError(sftpMessage(e))
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

  const mkdir = async (raw: string) => {
    const name = raw.trim()
    if (!name || name.includes('/') || name.includes('\\')) {
      setFolderError('名称不能为空，也不能包含斜杠')
      return
    }
    const dest = directoryOf(selected)
    try {
      await window.api.sftp.mkdir(forward.id, dest, name)
      setMaking(false)
      setFolderError('')
      await ensureOpen(dest)
    } catch (e) {
      setFolderError(sftpMessage(e))
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
                  <Twistie
                    dir={isDir}
                    open={expanded}
                    onToggle={() => void toggle(item.path)}
                  />
                  <FileIcon name={item.name} kind={item.kind} open={expanded} />
                  <span className="min-w-0 flex-1 truncate pl-1">{item.name}</span>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                {item.kind === 'dir' && (
                  <ContextMenuItem onClick={() => void loadRoot(forward.id, item.path)}>
                    <FolderInput /> 打开此目录
                  </ContextMenuItem>
                )}
                {item.kind !== 'dir' && (
                  <ContextMenuItem
                    onClick={() => openRemoteEditor(forward.id, { path: item.path, name: item.name }, true)}
                  >
                    编辑
                  </ContextMenuItem>
                )}
                <ContextMenuItem
                  onClick={() =>
                    openAfterMenu(() => {
                      setRenameError('')
                      setRenaming(item)
                    })
                  }
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
        <Button
          variant="ghost"
          size="icon-sm"
          title="打开目录"
          aria-expanded={picking}
          onClick={() => {
            setPathError('')
            setPicking(true)
          }}
        >
          <FolderInput />
        </Button>
        <Button variant="ghost" size="icon-sm" title="刷新" disabled={busy} onClick={() => void refresh()}>
          <RefreshCw />
        </Button>
        {!unsupported && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              title="新建文件夹"
              onClick={() => {
                setFolderError('')
                setMaking(true)
              }}
            >
              <FolderPlus />
            </Button>
            <Button variant="ghost" size="icon-sm" title="上传" disabled={busy} onClick={() => void upload()}>
              <Upload />
            </Button>
          </>
        )}
      </div>
      {unsupported ? (
        <Hint text="内置 SFTP 没有用起来，机器上原来的文件通道也打不开。改 sshd 需要 root 或免密 sudo。" />
      ) : (
        <>
          {busy && entries.length === 0 && !error && (
            <Hint text="正在通过当前 SSH 连接准备 SFTP，不会另开端口。" />
          )}
          {error && <p className="px-3 pb-1 text-[11px] text-destructive">{error}</p>}
          {!(error && entries.length === 0 && root === '.') && (
          <ScrollArea className="min-h-0 flex-1">
            <div role="tree" className="pb-2">
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div
                    role="treeitem"
                    aria-expanded={rootOpen}
                    aria-selected={selected === root}
                    title={root}
                    className={`flex h-[22px] w-full cursor-pointer items-center pr-2 text-[13px] select-none hover:bg-foreground/5 ${
                      selected === root ? 'bg-foreground/10' : ''
                    }`}
                    style={{ paddingLeft: 0 }}
                    onContextMenu={() => setSelected(root)}
                    onClick={() => {
                      setSelected(root)
                      if (!rootOpen) void toggle(root)
                    }}
                  >
                    <Twistie dir open={rootOpen} onToggle={() => void toggle(root)} />
                    <FileIcon name={rootName} kind="dir" open={rootOpen} />
                    <span className="min-w-0 flex-1 truncate pl-1">{rootName}</span>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {parentDir(root) && (
                    <ContextMenuItem onClick={() => void loadRoot(forward.id, parentDir(root)!)}>
                      打开上级目录
                    </ContextMenuItem>
                  )}
                  <ContextMenuItem
                    onClick={() =>
                      openAfterMenu(() => {
                        setPathError('')
                        setPicking(true)
                      })
                    }
                  >
                    <FolderInput /> 打开其他目录
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
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
          )}
        </>
      )}
      <RemarkDialog
        open={renaming !== null}
        title="重命名"
        description={renaming ? `给「${renaming.name}」换个名字。` : ''}
        initial={renaming?.name ?? ''}
        placeholder="新的名称"
        error={renameError}
        onOpenChange={(open) => {
          if (!open) {
            setRenaming(null)
            setRenameError('')
          }
        }}
        onSave={(value) => void commitRename(value)}
      />
      <RemarkDialog
        open={making}
        title="新建文件夹"
        description="在当前目录新建一个文件夹。"
        initial=""
        placeholder="文件夹名"
        error={folderError}
        onOpenChange={(open) => {
          if (!open) {
            setMaking(false)
            setFolderError('')
          }
        }}
        onSave={(value) => void mkdir(value)}
      />
      <RemarkDialog
        open={picking}
        title="打开目录"
        description="填写这台机器上的目录。"
        initial={root === '.' ? '/' : root}
        placeholder="/root 或 /home"
        error={pathError}
        onOpenChange={(open) => {
          if (!open) {
            setPicking(false)
            setPathError('')
          }
        }}
        onSave={(value) => {
          const path = value.trim()
          if (!path) {
            setPathError('目录不能为空')
            return
          }
          setPathError('')
          void loadRoot(forward.id, path)
        }}
      />
    </div>
  )
}

/** 与 VS Code 资源管理器相同：每级缩进 8px，箭头槽和图标都是 16px，图标自成一列。 */
const TREE_INDENT = 8
const TREE_TWISTIE = 16

function Twistie(props: { dir: boolean; open?: boolean; onToggle?: () => void }) {
  if (!props.dir) return <span className="size-4 shrink-0" />
  return (
    <button
      type="button"
      className="flex size-4 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-muted-foreground"
      onClick={(e) => {
        e.stopPropagation()
        props.onToggle?.()
      }}
    >
      <svg
        viewBox="0 0 16 16"
        className={`size-4 origin-center ${props.open ? 'rotate-90' : ''}`}
        aria-hidden
      >
        <path
          d="M6 3.5 11 8 6 12.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

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

const ROOTS_KEY = 'termpilot.fileRoots'

function readRoot(sessionId: string): string {
  try {
    const raw = localStorage.getItem(ROOTS_KEY)
    if (!raw) return ''
    const saved = JSON.parse(raw) as Record<string, unknown>
    return typeof saved[sessionId] === 'string' ? saved[sessionId] : ''
  } catch {
    return ''
  }
}

function writeRoot(sessionId: string, path: string): void {
  const saved = (() => {
    try {
      const raw = localStorage.getItem(ROOTS_KEY)
      const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  })()
  saved[sessionId] = path
  localStorage.setItem(ROOTS_KEY, JSON.stringify(saved))
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
