import type { SessionConfig, Tab } from '../../shared/types'

function openTerm(session: SessionConfig, tabs: Tab[]): Tab | undefined {
  return tabs.find((tab) => tab.sessionId === session.id)
}

/** 右键一条会话，只带这条会话的信息。 */
export function sessionAgentPrompt(session: SessionConfig, tabs: Tab[]): string {
  const lines = ['请用 TermPilot 连接这个会话。', '', `会话：${session.name}`]
  if (session.mode === 'reverse') {
    lines.push('类型：反向监听')
    if (session.listenPort) lines.push(`本机端口：${session.listenPort}`)
  } else {
    if (session.host) lines.push(`主机：${session.host}`)
    if (session.username) lines.push(`用户：${session.username}`)
    if (session.port) lines.push(`端口：${session.port}`)
  }
  const term = openTerm(session, tabs)
  if (term) lines.push(`termId：${term.id}`)
  return lines.join('\n')
}

/** 右键一台服务器，只带这台机器上的连接。 */
export function hostAgentPrompt(host: string, sessions: SessionConfig[]): string {
  const names = sessions.map((session) => session.name).filter(Boolean)
  return ['请用 TermPilot 连接这台服务器。', '', `主机：${host}`, `会话：${names.join('、')}`].join('\n')
}

/** 右键一个已经打开的终端。 */
export function tabAgentPrompt(tab: Tab, session: SessionConfig | null): string {
  const lines = ['请用 TermPilot 接着使用这个终端。', '', `终端：${tab.title}`, `termId：${tab.id}`]
  if (session) lines.push(`会话：${session.name}`)
  return lines.join('\n')
}
