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
  const lines = [tr('编号：{id}', { id: session.publicId }), tr('名称：{name}', { name: session.name })]
  const protocol = session.protocol ?? 'ssh'
  if (session.mode === 'reverse') {
    lines.push(tr('类型：反向监听'))
    if (session.listenPort) lines.push(tr('本机端口：{port}', { port: session.listenPort }))
  } else if (protocol === 'serial') {
    lines.push(tr('类型：串口（只有终端字节流，没有 exec 通道和 SFTP）'))
    if (session.serialPath) lines.push(tr('串口：{path}', { path: session.serialPath }))
    if (session.baudRate) lines.push(tr('波特率：{rate}', { rate: session.baudRate }))
  } else if (protocol === 'telnet') {
    lines.push(tr('类型：Telnet（只有终端字节流，没有 exec 通道和 SFTP）'))
    if (session.host) lines.push(tr('主机：{host}', { host: session.host }))
    if (session.port) lines.push(tr('端口：{port}', { port: session.port }))
  } else {
    if (session.host) lines.push(tr('主机：{host}', { host: session.host }))
    if (session.username) lines.push(tr('用户：{user}', { user: session.username }))
    if (session.port) lines.push(tr('端口：{port}', { port: session.port }))
    if (session.jumpHost) lines.push(tr('经跳板'))
  }
  if (session.remark?.trim()) lines.push(tr('备注：{text}', { text: session.remark.trim() }))
  return lines.join('\n')
}

/** 右键一扇终端。只写这扇终端和它所属连接的事实。 */
export function termAgentPrompt(tab: Tab, session: SessionConfig | null): string {
  const lines = [tr('终端：{id}', { id: tab.id }), tr('标题：{title}', { title: tab.title })]
  if (tab.remark?.trim()) lines.push(tr('备注：{text}', { text: tab.remark.trim() }))
  if (session) {
    lines.push(tr('所属连接：{id}', { id: session.publicId }), tr('连接名称：{name}', { name: session.name }))
    if (session.remark?.trim()) lines.push(tr('连接备注：{text}', { text: session.remark.trim() }))
  }
  return lines.join('\n')
}

export async function copyAgentPrompt(text: string, setNotice: (notice: string | null) => void): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    setNotice(tr('已复制 Agent 提示词'))
  } catch (error) {
    setNotice(error instanceof Error ? error.message : String(error))
  }
}
