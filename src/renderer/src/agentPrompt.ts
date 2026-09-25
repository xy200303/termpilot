import type { SessionConfig, Tab } from '../../shared/types'

/** 标签上显示的名字：连接名加上这扇窗口自己的短标题。 */
export function windowLabel(title: string, connectionName?: string | null): string {
  if (!connectionName) return title
  return `${connectionName} · ${title}`
}

/** 右键一条连接。调用只认编号，名称和备注用来认出它。 */
export function connectionAgentPrompt(session: SessionConfig): string {
  const lines = [
    '请用 TermPilot 打开这条连接。connection_open 的 connection 只填下面的编号。',
    '',
    `编号：${session.publicId}`,
    `名称：${session.name}`
  ]
  if (session.mode === 'reverse') {
    lines.push('类型：反向监听')
    if (session.listenPort) lines.push(`本机端口：${session.listenPort}`)
  } else {
    if (session.host) lines.push(`主机：${session.host}`)
    if (session.username) lines.push(`用户：${session.username}`)
    if (session.port) lines.push(`端口：${session.port}`)
    if (session.jumpHost) lines.push('经跳板')
  }
  if (session.remark?.trim()) lines.push(`备注：${session.remark.trim()}`)
  lines.push('名称和备注只帮助你认出这条连接，不能拿去当参数。备注若是空的，弄清它是干什么的之后用 connection_update 写上一句。')
  return lines.join('\n')
}

/** 右键一扇已经打开的终端。 */
export function termAgentPrompt(tab: Tab, session: SessionConfig | null): string {
  const lines = [
    '请用 TermPilot 接着使用这扇已经打开的终端，不要新开。term_exec 等工具的 termId 只填下面的编号。',
    '',
    `终端：${tab.id}`,
    `标题：${tab.title}`
  ]
  if (tab.remark?.trim()) lines.push(`备注：${tab.remark.trim()}`)
  if (session) {
    lines.push(`所属连接：${session.publicId}`, `连接名称：${session.name}`)
    if (session.remark?.trim()) lines.push(`连接备注：${session.remark.trim()}`)
  }
  lines.push('标题和备注只帮助你认出这扇终端。备注若是空的，弄清它在做什么之后用 term_update 写上一句。')
  return lines.join('\n')
}

export async function copyAgentPrompt(text: string, setNotice: (notice: string | null) => void): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    setNotice('已复制 Agent 提示词')
  } catch (error) {
    setNotice(error instanceof Error ? error.message : String(error))
  }
}
