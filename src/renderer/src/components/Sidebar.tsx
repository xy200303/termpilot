import { useState, type ComponentProps, CSSProperties, ReactNode } from 'react'
import { ChevronRight, Folder, Monitor, PanelLeft, Plus, Radio, Search, Server, Settings, TerminalSquare } from 'lucide-react'
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  useSidebar
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useAppStore } from '../stores/useAppStore'
import { connectionAgentPrompt, copyAgentPrompt, termAgentPrompt } from '../agentPrompt'
import { hostKeyOf } from '../../../shared/host-key'
import { openAfterMenu, RemarkDialog } from './RemarkDialog'

const REPO_URL = 'https://github.com/xy200303/termpilot'

function openRepo() {
  window.open(REPO_URL, '_blank')
}

function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"
      />
    </svg>
  )
}
const drag = { WebkitAppRegion: 'drag' } as CSSProperties
const noDrag = { WebkitAppRegion: 'no-drag' } as CSSProperties
import type { ConnectMode, SessionConfig, Tab } from '../../../shared/types'
import { FileTree } from './FileTree'

/**
 * 应用侧边栏。不用 shadcn Sidebar 的 fixed 布局：
 * 那一层会和文档流占位各画一次，在 Electron 里左边会露出重影。
 * 收纳状态仍走 SidebarProvider。
 */
export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar()
  const collapsed = state === 'collapsed'
  const pane = useAppStore((s) => s.sidebarPane)
  const setPane = useAppStore((s) => s.setSidebarPane)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)

  return (
    <div
      className={cn(
        'flex h-full shrink-0 flex-col overflow-hidden border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200',
        collapsed ? 'w-12' : 'w-64'
      )}
    >
      <div
        className={cn('flex h-10 shrink-0 items-center border-b', collapsed ? 'justify-center' : 'px-2')}
        style={drag}
      >
        <Button variant="ghost" size="icon-sm" title="收纳侧边栏" style={noDrag} onClick={toggleSidebar}>
          <PanelLeft />
        </Button>
      </div>
      <SidebarHeader>
        {!collapsed && (
          <Tabs value={pane} onValueChange={(v) => setPane(v as 'connect' | 'files')}>
            <TabsList className="w-full">
              <TabsTrigger value="connect">连接</TabsTrigger>
              <TabsTrigger value="files">文件</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </SidebarHeader>
      {collapsed ? (
        <div className="flex min-h-0 flex-1 flex-col items-center gap-1 py-1">
          <Button
            variant={pane === 'connect' ? 'secondary' : 'ghost'}
            size="icon-sm"
            title="连接"
            onClick={() => setPane('connect')}
          >
            <Monitor />
          </Button>
          <Button
            variant={pane === 'files' ? 'secondary' : 'ghost'}
            size="icon-sm"
            title="文件"
            onClick={() => setPane('files')}
          >
            <Folder />
          </Button>
          <div className="mt-auto flex flex-col items-center gap-1">
            <Button variant="ghost" size="icon-sm" title="GitHub" onClick={openRepo}>
              <GithubMark />
            </Button>
            <Button variant="ghost" size="icon-sm" title="设置" onClick={() => setSettingsOpen(true)}>
              <Settings />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <SidebarContent>{pane === 'connect' ? <ConnectTree /> : <FileTree />}</SidebarContent>
          <div className="flex items-center gap-1 border-t px-2 py-2">
            <button
              type="button"
              className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="size-4" />
              设置
            </button>
            <button
              type="button"
              title="GitHub"
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={openRepo}
            >
              <GithubMark />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function ConnectTree() {
  const sessions = useAppStore((s) => s.sessions)
  const hostNotes = useAppStore((s) => s.hostNotes)
  const search = useAppStore((s) => s.search)
  const setSearch = useAppStore((s) => s.setSearch)
  const kw = search.trim().toLowerCase()
  const filtered = kw
    ? sessions.filter(
        (s) =>
          s.name.toLowerCase().includes(kw) ||
          s.host.toLowerCase().includes(kw) ||
          (s.remark ?? '').toLowerCase().includes(kw) ||
          (hostNotes[hostKeyOf(s.host)] ?? '').toLowerCase().includes(kw)
      )
    : sessions

  return (
    <>
      <div className="px-2 pb-1">
        <label className="flex h-7 items-center gap-1.5 rounded-md bg-sidebar-accent px-2 text-muted-foreground">
          <Search className="size-3.5 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索连接"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-sidebar-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>
      <ModeRoot
        mode="forward"
        title="正向 SSH"
        sessions={filtered.filter((s) => (s.mode ?? 'forward') === 'forward')}
      />
      <ModeRoot
        mode="reverse"
        title="反向监听"
        sessions={filtered.filter((s) => s.mode === 'reverse')}
      />
      <LocalRoot />
    </>
  )
}

function ModeRoot(props: { mode: ConnectMode; title: string; sessions: SessionConfig[] }) {
  const key = `root:${props.mode}`
  const open = useAppStore((s) => !(s.collapsedGroups[key] ?? false))
  const toggleGroup = useAppStore((s) => s.toggleGroup)
  const setEditing = useAppStore((s) => s.setEditing)

  return (
    <Collapsible open={open} onOpenChange={() => toggleGroup(key)}>
      <SidebarGroup className="px-2 py-0.5">
        <SectionHead
          icon={props.mode === 'forward' ? <Monitor /> : <Radio />}
          title={props.title}
          actionTitle={props.mode === 'forward' ? '新建正向 SSH' : '新建反向监听'}
          onAdd={() => setEditing({ action: 'create', mode: props.mode })}
        />
        <CollapsibleContent>
          <SidebarGroupContent className="grid gap-0.5">
            {props.mode === 'forward'
              ? machinesOf(props.sessions).map((machine) => (
                  <HostNode
                    key={machine.key}
                    hostKey={machine.key}
                    host={machine.host}
                    sessions={machine.sessions}
                    depth={1}
                  />
                ))
              : props.sessions.map((session) => (
                  <SessionNode key={session.id} session={session} depth={1} />
                ))}
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

function LocalRoot() {
  const key = 'root:local'
  const open = useAppStore((s) => !(s.collapsedGroups[key] ?? false))
  const toggleGroup = useAppStore((s) => s.toggleGroup)
  const openLocalTab = useAppStore((s) => s.openLocalTab)
  const tabs = useAppStore((s) => s.tabs)
  const locals = tabs.filter((tab) => tab.kind === 'local')

  return (
    <Collapsible open={open} onOpenChange={() => toggleGroup(key)}>
      <SidebarGroup className="px-2 py-0.5">
        <SectionHead icon={<TerminalSquare />} title="本机终端" actionTitle="新建本机终端" onAdd={openLocalTab} />
        <CollapsibleContent>
          <SidebarGroupContent className="grid gap-0.5">
            {locals.map((tab) => (
              <TermRow key={tab.id} tab={tab} session={null} depth={1} />
            ))}
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

function machinesOf(sessions: SessionConfig[]): { key: string; host: string; sessions: SessionConfig[] }[] {
  const map = new Map<string, { host: string; sessions: SessionConfig[] }>()
  for (const session of sessions) {
    const host = session.host.trim()
    const key = hostKeyOf(host)
    const bucket = map.get(key)
    if (bucket) bucket.sessions.push(session)
    else map.set(key, { host: host || '未填写主机', sessions: [session] })
  }
  return [...map.entries()]
    .sort((a, b) => a[1].host.localeCompare(b[1].host, 'zh'))
    .map(([key, machine]) => ({ key, ...machine }))
}

function HostNode(props: { hostKey: string; host: string; sessions: SessionConfig[]; depth: number }) {
  const key = `host:${props.hostKey}`
  const open = useAppStore((s) => !(s.collapsedGroups[key] ?? false))
  const toggleGroup = useAppStore((s) => s.toggleGroup)
  const deleteSession = useAppStore((s) => s.deleteSession)
  const note = useAppStore((s) => s.hostNotes[props.hostKey] ?? '')
  const setHostNote = useAppStore((s) => s.setHostNote)
  const [editingNote, setEditingNote] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={() => toggleGroup(key)}>
      <div className="group/host flex items-center" style={{ paddingLeft: props.depth * TREE_STEP }}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <CollapsibleTrigger
              title={note || undefined}
              className="flex h-7 min-w-0 flex-1 items-center gap-1 rounded-md pr-1 text-[13px] text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <ChevronRight className={cn('size-3 shrink-0 transition-transform', open && 'rotate-90')} />
              <Server className="size-3.5 shrink-0" />
              <span className="truncate">{note || props.host}</span>
              {note ? (
                <span className="max-w-28 shrink-0 truncate text-[11px] text-muted-foreground">{props.host}</span>
              ) : null}
            </CollapsibleTrigger>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => openAfterMenu(() => setEditingNote(true))}>备注</ContextMenuItem>
            <ContextMenuItem
              variant="destructive"
              onClick={() => {
                for (const session of props.sessions) void deleteSession(session.id)
              }}
            >
              删除
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
      <RemarkDialog
        open={editingNote}
        title="备注"
        description={`给「${props.host}」写一句，方便以后认出它。留空就是清掉。`}
        initial={note}
        placeholder="这台机器是干什么的"
        onOpenChange={setEditingNote}
        onSave={(value) => {
          setEditingNote(false)
          const next = value.trim()
          if (next !== note) void setHostNote(props.hostKey, next)
        }}
      />
      <CollapsibleContent className="grid gap-0.5">
        {props.sessions.map((session) => (
          <SessionNode key={session.id} session={session} depth={props.depth + 1} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

function SessionNode(props: { session: SessionConfig; depth: number }) {
  const session = props.session
  const isReverse = session.mode === 'reverse'
  const status = useAppStore((s) => s.sessionStatus[session.id] ?? 'disconnected')
  const listener = useAppStore((s) => s.listeners[session.id])
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const selectedId = useAppStore((s) => s.selectedSessionId)
  const openSessionTab = useAppStore((s) => s.openSessionTab)
  const setEditing = useAppStore((s) => s.setEditing)
  const deleteSession = useAppStore((s) => s.deleteSession)
  const duplicateSessions = useAppStore((s) => s.duplicateSessions)
  const toggleListen = useAppStore((s) => s.toggleListen)
  const selectSession = useAppStore((s) => s.selectSession)
  const setSessionRemark = useAppStore((s) => s.setSessionRemark)
  const setNotice = useAppStore((s) => s.setNotice)
  const [editingRemark, setEditingRemark] = useState(false)
  const key = `session:${session.id}`
  const open = useAppStore((s) => !(s.collapsedGroups[key] ?? false))
  const toggleGroup = useAppStore((s) => s.toggleGroup)

  const nested = tabs.filter((tab) => tab.sessionId === session.id && tab.kind !== 'local')
  const live = isReverse ? Boolean(listener?.listening) : status === 'connected'
  const account = isReverse
    ? session.listenPort
      ? `:${session.listenPort}`
      : ''
    : session.port === 22
      ? session.username
      : `${session.username}:${session.port}`
  const remark = session.remark?.trim() ?? ''
  const jump = !isReverse && session.jumpHost ? '经跳板' : ''
  const meta = [account, jump].filter(Boolean).join(' ')
  const active =
    tabs.some((tab) => tab.id === activeTabId && tab.sessionId === session.id && tab.kind === 'ssh') ||
    (selectedId === session.id && nested.every((tab) => tab.id !== activeTabId))

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <TreeRow
            depth={props.depth}
            label={session.name}
            hint={remark}
            meta={meta}
            active={active}
            live={live}
            open={open}
            onToggle={nested.length > 0 ? () => toggleGroup(key) : undefined}
            onClick={() => {
              selectSession(session.id)
              if (!isReverse) openSessionTab(session)
            }}
          />
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => void copyAgentPrompt(connectionAgentPrompt(session), setNotice)}>
            复制为 Agent 提示词
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => (isReverse ? void toggleListen(session) : openSessionTab(session))}>
            {isReverse ? (listener?.listening ? '停止监听' : '开始监听') : '打开'}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() =>
              isReverse ? void duplicateSessions([session.id]) : openSessionTab(session, true)
            }
          >
            {isReverse ? '复制这条连接' : '新开一扇终端'}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => openAfterMenu(() => setEditingRemark(true))}>备注</ContextMenuItem>
          <ContextMenuItem onClick={() => setEditing({ action: 'edit', session })}>编辑</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onClick={() => deleteSession(session.id)}>
            删除
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <RemarkDialog
        open={editingRemark}
        title="备注"
        description={`给「${session.name}」写一句，方便以后认出它。留空就是清掉。`}
        initial={remark}
        placeholder="这条连接是干什么的"
        onOpenChange={setEditingRemark}
        onSave={(value) => {
          setEditingRemark(false)
          void setSessionRemark(session, value)
        }}
      />
      {open && nested.map((tab) => <TermRow key={tab.id} tab={tab} session={session} depth={props.depth + 1} />)}
    </div>
  )
}

function TermRow(props: { tab: Tab; session: SessionConfig | null; depth: number }) {
  const tab = props.tab
  const activeTabId = useAppStore((s) => s.activeTabId)
  const termState = useAppStore((s) => s.termState)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const closeTab = useAppStore((s) => s.closeTab)
  const renameTab = useAppStore((s) => s.renameTab)
  const setTabRemark = useAppStore((s) => s.setTabRemark)
  const setNotice = useAppStore((s) => s.setNotice)
  const [renaming, setRenaming] = useState(false)
  const [editingRemark, setEditingRemark] = useState(false)
  const remark = tab.remark?.trim() ?? ''

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <TreeRow
            depth={props.depth}
            label={tab.title}
            hint={remark}
            active={tab.id === activeTabId}
            live={termState[tab.id]?.status === 'connected' || tab.kind === 'reverse'}
            onClick={() => setActiveTab(tab.id)}
          />
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => void copyAgentPrompt(termAgentPrompt(tab, props.session), setNotice)}>
            复制为 Agent 提示词
          </ContextMenuItem>
          <ContextMenuItem onClick={() => openAfterMenu(() => setRenaming(true))}>重命名</ContextMenuItem>
          <ContextMenuItem onClick={() => openAfterMenu(() => setEditingRemark(true))}>备注</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => closeTab(tab.id)}>关闭</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <RemarkDialog
        open={renaming}
        title="重命名"
        description={`给「${tab.title}」换个名字。`}
        initial={tab.title}
        placeholder="窗口名称"
        onOpenChange={setRenaming}
        onSave={(value) => {
          setRenaming(false)
          renameTab(tab.id, value)
        }}
      />
      <RemarkDialog
        open={editingRemark}
        title="备注"
        description={`给「${tab.title}」写一句，方便以后认出它。留空就是清掉。`}
        initial={remark}
        placeholder="这扇窗口在做什么"
        onOpenChange={setEditingRemark}
        onSave={(value) => {
          setEditingRemark(false)
          setTabRemark(tab.id, value)
        }}
      />
    </>
  )
}

/** 每一级往右一截。箭头占位始终留着，没有箭头的子行才不会缩回父级左边。 */
const TREE_STEP = 16

function SectionHead(props: { icon: ReactNode; title: string; actionTitle: string; onAdd: () => void }) {
  return (
    <div className="group/section flex items-center">
      <CollapsibleTrigger className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-md pr-1 text-[13px] text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
        <span className="[&_svg]:size-4">{props.icon}</span>
        <span className="truncate">{props.title}</span>
      </CollapsibleTrigger>
      <button
        type="button"
        title={props.actionTitle}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        onClick={props.onAdd}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  )
}

function TreeRow({
  label,
  hint,
  meta,
  active,
  live,
  depth = 0,
  open,
  onToggle,
  onClick,
  className,
  style,
  ...rest
}: {
  label: string
  hint?: string
  meta?: string
  active?: boolean
  live?: boolean
  depth?: number
  open?: boolean
  onToggle?: () => void
  onClick: () => void
} & Omit<ComponentProps<'div'>, 'onClick'>) {
  return (
    <div
      {...rest}
      title={hint || undefined}
      className={cn(
        'flex w-full items-center gap-1 rounded-md pr-2 text-[13px] hover:bg-sidebar-accent',
        hint ? 'min-h-7 py-0.5' : 'h-7',
        active && 'bg-sidebar-accent',
        className
      )}
      style={{ paddingLeft: depth * TREE_STEP, ...style }}
    >
      {onToggle ? (
        <button
          type="button"
          className="flex size-4 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-muted-foreground"
          onClick={(event) => {
            event.stopPropagation()
            onToggle()
          }}
        >
          <ChevronRight className={cn('size-3 transition-transform', open && 'rotate-90')} />
        </button>
      ) : (
        <span className="size-4 shrink-0" />
      )}
      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={onClick}>
        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full border',
            live ? 'border-primary bg-primary' : 'border-muted-foreground/50'
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate">{label}</span>
          {hint ? <span className="block truncate text-[11px] leading-4 text-muted-foreground">{hint}</span> : null}
        </span>
        {meta && <span className="max-w-24 shrink-0 truncate text-[11px] text-muted-foreground">{meta}</span>}
      </button>
    </div>
  )
}
