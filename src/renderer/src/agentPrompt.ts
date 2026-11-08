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
  const lines = [tr('ID: {id}', { id: session.publicId }), tr('Name: {name}', { name: session.name })]
  const protocol = session.protocol ?? 'ssh'
  if (session.mode === 'reverse') {
    lines.push(tr('Type: reverse listener'))
    if (session.listenPort) lines.push(tr('Local port: {port}', { port: session.listenPort }))
  } else if (protocol === 'serial') {
    lines.push(tr('Type: serial (terminal stream only, no exec channel or SFTP)'))
    if (session.serialPath) lines.push(tr('Serial path: {path}', { path: session.serialPath }))
    if (session.baudRate) lines.push(tr('Baud rate: {rate}', { rate: session.baudRate }))
  } else if (protocol === 'telnet') {
    lines.push(tr('Type: Telnet (terminal stream only, no exec channel or SFTP)'))
    if (session.host) lines.push(tr('Host: {host}', { host: session.host }))
    if (session.port) lines.push(tr('Port: {port}', { port: session.port }))
  } else {
    if (session.host) lines.push(tr('Host: {host}', { host: session.host }))
    if (session.username) lines.push(tr('User: {user}', { user: session.username }))
    if (session.port) lines.push(tr('Port: {port}', { port: session.port }))
    if (session.jumpHost) lines.push(tr('via jump host'))
  }
  if (session.remark?.trim()) lines.push(tr('Note: {text}', { text: session.remark.trim() }))
  return lines.join('\n')
}

/** 右键一扇终端。只写这扇终端和它所属连接的事实。 */
export function termAgentPrompt(tab: Tab, session: SessionConfig | null): string {
  const lines = [tr('Terminal: {id}', { id: tab.id }), tr('Title: {title}', { title: tab.title })]
  if (tab.remark?.trim()) lines.push(tr('Note: {text}', { text: tab.remark.trim() }))
  if (session) {
    lines.push(tr('Connection: {id}', { id: session.publicId }), tr('Connection name: {name}', { name: session.name }))
    if (session.remark?.trim()) lines.push(tr('Connection note: {text}', { text: session.remark.trim() }))
  }
  return lines.join('\n')
}

export async function copyAgentPrompt(text: string, setNotice: (notice: string | null) => void): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    setNotice(tr('Agent prompt copied'))
  } catch (error) {
    setNotice(error instanceof Error ? error.message : String(error))
  }
}
