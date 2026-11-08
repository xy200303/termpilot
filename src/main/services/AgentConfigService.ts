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
  const paths = targets
    .map((target) => `- ${target.name}: ${target.file} (${target.configured ? 'connected' : 'not connected'})`)
    .join('\n')
  /* 这份指引是给 Agent 读的，固定英文：不随界面语言变，避免中文指令被下游模型理解偏差 */
  return `# TermPilot agent access guide

You (the agent) should complete TermPilot's MCP registration and skill installation yourself. Do not ask the user to edit configuration by hand.

Security: the token below is for local access only. Never write it into replies, logs, repositories or screenshots, and never send it to another service.

## MCP server

- Name: termpilot
- URL: ${options.url}
- Header: Authorization: ${auth}
- Status: ${options.enabled ? 'Enabled' : 'Not enabled. If connections fail after setup, ask the user to enable the MCP server in TermPilot settings first'}

## Step 1: install the skill

Read this local file:
${options.skillFile}

Follow its "Install" section and put the TermPilot skill into your own user-level skills directory, using \`termpilot\` as the directory name. Install only this one skill and leave the other skills untouched.

Common target locations:
- Claude Code: ~/.claude/skills/termpilot/SKILL.md
- Kimi Code: ~/.kimi-code/skills/termpilot/SKILL.md
- Codex: ~/.codex/skills/termpilot/SKILL.md
- Cursor: ~/.cursor/skills/termpilot/SKILL.md
- WorkBuddy: ~/.workbuddy/skills/termpilot/SKILL.md
- CodeBuddy: ~/.codebuddy/skills/termpilot/SKILL.md

## Step 2: register the MCP server

Add or update only the entry named \`termpilot\` and leave the other MCP servers as they are. Desktop apps and CLIs often read different files, so prefer the local path detected below.

Detected local configuration:
${paths}

JSON shape for Claude Code / CodeBuddy:
\`\`\`json
${jsonHttp}
\`\`\`

JSON shape for Cursor:
\`\`\`json
${jsonCursor}
\`\`\`

JSON shape for Kimi Code:
\`\`\`json
${jsonKimi}
\`\`\`

JSON shape for WorkBuddy:
\`\`\`json
${jsonTransport}
\`\`\`

TOML shape for Codex:
\`\`\`toml
${codex}
\`\`\`

Notes:
- Claude Code reads \`mcpServers\` from ~/.claude.json, not ~/.claude/settings.json.
- Kimi Code's desktop app and CLI share ~/.kimi-code/mcp.json.
- Codex requires the section name [mcp_servers.termpilot].
- Cursor's user-level config is ~/.cursor/mcp.json, not the project-level .cursor/mcp.json.
- CodeBuddy reads ~/.codebuddy/mcp.json, not ~/.codebuddy/.mcp.json.
- Do not write into the connectors directory; TermPilot rewrites that file itself.
- The Authorization value must include the full "Bearer " prefix.

## Step 3: verify

1. Restart the agent application.
2. Call the MCP tool connection_list and confirm it returns TermPilot's connection list.
3. If that fails, first confirm TermPilot is running with MCP enabled, then check the config path and the token.
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
