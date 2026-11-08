import { existsSync, readFileSync } from 'node:fs'
import { t as mt } from '../i18n'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { AgentTarget } from '../../shared/types'

const SERVER = 'termpilot'
const CODEX_HEADER = '[mcp_servers.termpilot]'

interface Target {
  id: AgentTarget['id']
  name: string
  file: string
  format: 'json' | 'toml'
}

/** 列出各 Agent 的用户级 MCP 配置位置和当前接入状态。 */
export function listAgentTargets(url: string): AgentTarget[] {
  const targets = agentTargets()
  return targets.map((target) => ({
    id: target.id,
    name: target.name,
    file: target.file,
    present: existsSync(target.file),
    configured: configured(target, url)
  }))
}

/** 生成交给 Agent 自己执行接入的完整说明。 */
export function buildAgentGuide(options: {
  url: string
  token: string
  enabled: boolean
  skillFile: string
}): string {
  const targets = listAgentTargets(options.url)
  const auth = `Bearer ${options.token}`
  const jsonHttp = `{
  "mcpServers": {
    "termpilot": {
      "type": "http",
      "url": ${JSON.stringify(options.url)},
      "headers": { "Authorization": ${JSON.stringify(auth)} }
    }
  }
}`
  const jsonKimi = `{
  "termpilot": {
    "transport": "http",
    "url": ${JSON.stringify(options.url)},
    "headers": { "Authorization": ${JSON.stringify(auth)} }
  }
}`
  const jsonTransport = `{
  "termpilot": {
    "transport": "streamable-http",
    "url": ${JSON.stringify(options.url)},
    "headers": { "Authorization": ${JSON.stringify(auth)} }
  }
}`
  const jsonCursor = `{
  "termpilot": {
    "url": ${JSON.stringify(options.url)},
    "headers": { "Authorization": ${JSON.stringify(auth)} }
  }
}`
  const codex = `${CODEX_HEADER}
url = ${JSON.stringify(options.url)}
http_headers = { Authorization = ${JSON.stringify(auth)} }`
  const paths = targets.map((target) => mt('agentcfg.target_line', { name: target.name, file: target.file, status: target.configured ? mt('agentcfg.detected') : mt('agentcfg.not_connected') })).join('\n')
  return `# TermPilot Agent 接入指引

请由你（Agent）直接完成 TermPilot 的 MCP 注册和 Skill 安装，不要要求用户手工改配置。

安全要求：下面的令牌只用于本机接入。不要把它写进回复、日志、仓库或截图，也不要发给其他服务。

## MCP 服务

- 名称：termpilot
- 地址：${options.url}
- 请求头：Authorization: ${auth}
- 当前状态：${options.enabled ? mt('agentcfg.enabled') : mt('agentcfg.disabled_hint')}

## 第一步：安装 Skill

读取这个本机文件：
${options.skillFile}

按照文件里的“安装”章节，把 TermPilot Skill 安装到你自己的用户级 skills 目录，目录名使用 termpilot。只安装这一份，不要修改其他 Skill。

常见目标位置：
- Claude Code：~/.claude/skills/termpilot/SKILL.md
- Kimi Code：~/.kimi-code/skills/termpilot/SKILL.md
- Codex：~/.codex/skills/termpilot/SKILL.md
- Cursor：~/.cursor/skills/termpilot/SKILL.md
- WorkBuddy：~/.workbuddy/skills/termpilot/SKILL.md
- CodeBuddy：~/.codebuddy/skills/termpilot/SKILL.md

## 第二步：注册 MCP

只新增或更新名为 termpilot 的这一条，其他 MCP 服务器保持原样。桌面版和命令行经常读取不同文件，优先修改下面检测到的本机路径。

检测到的本机配置：
${paths}

Claude Code / CodeBuddy 的 JSON 结构：
\`\`\`json
${jsonHttp}
\`\`\`

Cursor 的 JSON 结构：
\`\`\`json
${jsonCursor}
\`\`\`

Kimi Code 的 JSON 结构：
\`\`\`json
${jsonKimi}
\`\`\`

WorkBuddy 的 JSON 结构：
\`\`\`json
${jsonTransport}
\`\`\`

Codex 的 TOML 结构：
\`\`\`toml
${codex}
\`\`\`

注意事项：
- Claude Code 读 ~/.claude.json 里的 mcpServers，不读 ~/.claude/settings.json。
- Kimi Code 的桌面版和命令行共用 ~/.kimi-code/mcp.json。
- Codex 的节名必须是 [mcp_servers.termpilot]。
- Cursor 的用户级配置是 ~/.cursor/mcp.json，不是项目里的 .cursor/mcp.json。
- CodeBuddy 读 ~/.codebuddy/mcp.json，不是 ~/.codebuddy/.mcp.json。
- 不要写进 connectors 目录，那个文件由 TermPilot 自己重写。
- Authorization 的值必须完整包含 "Bearer " 前缀。

## 第三步：检查

1. 重新打开对应的 Agent 程序。
2. 调用 MCP 工具 connection_list，确认能返回 TermPilot 连接列表。
3. 如果失败，先确认 TermPilot 正在运行且 MCP 已启用，再检查配置文件路径和令牌。
`
}

function agentTargets(): Target[] {
  const claudeDir = process.env.CLAUDE_CONFIG_DIR
  const codexHome = process.env.CODEX_HOME
  const kimiHome = process.env.KIMI_CODE_HOME
  return [
    {
      id: 'claude',
      name: 'Claude Code',
      file: claudeDir ? join(claudeDir, '.claude.json') : join(homedir(), '.claude.json'),
      format: 'json'
    },
    {
      id: 'kimi',
      name: 'Kimi Code',
      file: kimiFile(kimiHome),
      format: 'json'
    },
    {
      id: 'codex',
      name: 'Codex',
      file: join(codexHome || join(homedir(), '.codex'), 'config.toml'),
      format: 'toml'
    },
    {
      id: 'cursor',
      name: 'Cursor',
      file: join(homedir(), '.cursor', 'mcp.json'),
      format: 'json'
    },
    {
      id: 'workbuddy',
      name: 'WorkBuddy',
      file: join(homedir(), '.workbuddy', 'mcp.json'),
      format: 'json'
    },
    {
      id: 'codebuddy',
      name: 'CodeBuddy',
      file: join(homedir(), '.codebuddy', 'mcp.json'),
      format: 'json'
    }
  ]
}

function kimiFile(home: string | undefined): string {
  if (home) return join(home, 'mcp.json')
  return join(homedir(), '.kimi-code', 'mcp.json')
}

function configured(target: Target, url: string): boolean {
  if (!existsSync(target.file)) return false
  if (target.format === 'toml') {
    const text = readText(target.file)
    return text.includes(CODEX_HEADER) && text.includes(url)
  }
  const data = parseJson(target.file)
  const servers = data.mcpServers
  if (!servers || typeof servers !== 'object' || Array.isArray(servers)) return false
  const entry = (servers as Record<string, unknown>)[SERVER]
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false
  return (entry as { url?: unknown }).url === url
}

function parseJson(file: string): Record<string, unknown> {
  let data: unknown
  try {
    data = JSON.parse(readText(file))
  } catch {
    throw new Error(mt('agentcfg.bad_json', { file }))
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(mt('agentcfg.unreadable', { file }))
  }
  return data as Record<string, unknown>
}

function readText(file: string): string {
  return readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
}
