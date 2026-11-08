import type { SessionConfig, Tab } from '../../shared/types'
import i18n from './i18n'

const tr = (key: string, params?: Record<string, string | number>): string =>
  String(i18n.t(key, { ...(params ?? {}), defaultValue: key }))

/** 标签上显示的名字：连接名加上这扇窗口自己的短标题。 */
export function windowLabel(title: string, connectionName?: string | null): string {
  if (!connectionName) return title
  return `${connectionName} · ${title}`
}

/** 右键一条连接。只写这条连接本身的事实。 */
export function connectionAgentPrompt(session: SessionConfig): string {
  const lines = [tr('agent.id_id', { id: session.publicId }), tr('agent.name_name', { name: session.name })]
  const protocol = session.protocol ?? 'ssh'
  if (session.mode === 'reverse') {
    lines.push(tr('agent.type_reverse_listener'))
    if (session.listenPort) lines.push(tr('agent.local_port_port', { port: session.listenPort }))
  } else if (protocol === 'serial') {
    lines.push(tr('agent.type_serial_terminal_stream_only_no_exec_channel'))
    if (session.serialPath) lines.push(tr('agent.serial_path_path', { path: session.serialPath }))
    if (session.baudRate) lines.push(tr('agent.baud_rate_rate', { rate: session.baudRate }))
  } else if (protocol === 'telnet') {
    lines.push(tr('agent.type_telnet_terminal_stream_only_no_exec_channel'))
    if (session.host) lines.push(tr('agent.host_host', { host: session.host }))
    if (session.port) lines.push(tr('agent.port_port', { port: session.port }))
  } else {
    if (session.host) lines.push(tr('agent.host_host', { host: session.host }))
    if (session.username) lines.push(tr('agent.user_user', { user: session.username }))
    if (session.port) lines.push(tr('agent.port_port', { port: session.port }))
    if (session.jumpHost) lines.push(tr('agent.via_jump_host'))
  }
  if (session.remark?.trim()) lines.push(tr('agent.note_text', { text: session.remark.trim() }))
  return lines.join('\n')
}

/** 右键一扇终端。只写这扇终端和它所属连接的事实。 */
export function termAgentPrompt(tab: Tab, session: SessionConfig | null): string {
  const lines = [tr('agent.terminal_id', { id: tab.id }), tr('agent.title_title', { title: tab.title })]
  if (tab.remark?.trim()) lines.push(tr('agent.note_text', { text: tab.remark.trim() }))
  if (session) {
    lines.push(tr('agent.connection_id', { id: session.publicId }), tr('agent.connection_name_name', { name: session.name }))
    if (session.remark?.trim()) lines.push(tr('agent.connection_note_text', { text: session.remark.trim() }))
  }
  return lines.join('\n')
}

export async function copyAgentPrompt(text: string, setNotice: (notice: string | null) => void): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    setNotice(tr('agent.agent_prompt_copied'))
  } catch (error) {
    setNotice(error instanceof Error ? error.message : String(error))
  }
}
