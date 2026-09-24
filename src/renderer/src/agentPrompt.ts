import type { SessionConfig, Tab } from '../../shared/types'

const HANDOFF = [
  '人和你看的是同一个 TermPilot 终端。密码、私钥口令、验证码只由我在窗口里输入，不要向我索取，也不要写进回复。',
  '先 term_lines 看当前画面。停在密码、确认或要我本人决定的地方时，停下来告诉我；我在窗口里操作完，你再看画面继续。',
  '菜单、方向键、输入和 TUI 用 term_write：上下左右是 keys 里的 up、down、left、right，要打的字放 text，确认就 submit。每次发送后看返回的画面再决定下一步。不要只用 term_exec。',
  '已经回到 shell 提示符时，普通命令再用 term_exec。'
].join('\n')

function openLines(tabs: Tab[]): string[] {
  if (tabs.length === 0) return []
  return ['已经打开的终端，优先接着用，不要另开：', ...tabs.map((tab) => `- ${tab.title}  termId：${tab.id}`)]
}

/** 右键一条已保存的连接，生成可直接贴给 Agent 的提示词。 */
export function sessionAgentPrompt(session: SessionConfig, tabs: Tab[]): string {
  const open = tabs.filter((tab) => tab.sessionId === session.id)
  const lines = ['请用 TermPilot 接管下面的会话，并完成我写在「任务：」后面的内容。', '', `会话：${session.name}`]
  if (session.mode === 'reverse') {
    lines.push('类型：反向监听。不要用 session_connect 去连主机。')
    if (session.listenPort) lines.push(`本机监听端口：${session.listenPort}`)
    if (open.length === 0) lines.push('当前没有已经进来的终端。先告诉我等对端连上。')
  } else {
    if (session.host) lines.push(`主机：${session.host}`)
    lines.push('没有现成终端时，session_connect 的 session 填上面的会话名。')
  }
  lines.push(...openLines(open), '', HANDOFF, '', '任务：')
  return lines.join('\n')
}

/** 右键一台服务器，生成覆盖这台机器上全部连接的提示词。 */
export function hostAgentPrompt(host: string, sessions: SessionConfig[], tabs: Tab[]): string {
  const names = sessions.map((session) => session.name)
  const open = tabs.filter((tab) => sessions.some((session) => session.id === tab.sessionId))
  const lines = [
    '请用 TermPilot 接管这台服务器上的连接，并完成我写在「任务：」后面的内容。',
    '',
    `主机：${host}`,
    `会话：${names.join('、') || '（没有）'}`,
    names.length <= 1
      ? `session_connect 的 session 填「${names[0] ?? host}」。`
      : '有多个会话。任务里点了名就用那一个，没点名就先问我。',
    ...openLines(open),
    '',
    HANDOFF,
    '',
    '任务：'
  ]
  return lines.join('\n')
}

/** 右键一个已经打开的终端标签。 */
export function tabAgentPrompt(tab: Tab, session: SessionConfig | null): string {
  const lines = [
    '请用 TermPilot 接管这个已经打开的终端，并完成我写在「任务：」后面的内容。不要另开连接。',
    '',
    `终端：${tab.title}`,
    `termId：${tab.id}`
  ]
  if (tab.kind === 'local' || !session) {
    lines.push('这是本机终端，不要去连 SSH。')
  } else if (session.mode === 'reverse') {
    lines.push(`它属于反向监听「${session.name}」。不要用 session_connect 去连主机。`)
  } else {
    lines.push(`它属于会话「${session.name}」。`)
  }
  lines.push('', HANDOFF, '', '任务：')
  return lines.join('\n')
}
