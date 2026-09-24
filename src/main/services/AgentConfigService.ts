import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { AgentId, AgentTarget } from '../../shared/types'

const SERVER = 'termpilot'
const CODEX_HEADER = '[mcp_servers.termpilot]'

/**
 * 把 TermPilot 的 MCP 端点写进各 Agent 的用户级配置。
 * 只增改名为 termpilot 的那一条，其它服务器原样保留。
 * 配置不是合法 JSON / 读不出来时直接失败，不覆盖原文件。
 */
export function listAgentTargets(url: string): AgentTarget[] {
  return targets().map((target) => describe(target, url))
}

export function writeAgentTarget(id: AgentId, url: string, token: string): AgentTarget {
  const target = targets().find((item) => item.id === id)
  if (!target) throw new Error('不支持这个 Agent')
  const auth = `Bearer ${token}`
  if (target.format === 'toml') writeCodex(target.file, url, auth)
  else writeJson(target.file, target.entry(url, auth))
  return describe(target, url)
}

interface Target {
  id: AgentId
  name: string
  file: string
  format: 'json' | 'toml'
  entry: (url: string, auth: string) => Record<string, unknown>
}

function targets(): Target[] {
  const claudeDir = process.env.CLAUDE_CONFIG_DIR
  const codexHome = process.env.CODEX_HOME
  const kimiHome = process.env.KIMI_CODE_HOME
  return [
    {
      id: 'claude',
      name: 'Claude Code',
      file: claudeDir ? join(claudeDir, '.claude.json') : join(homedir(), '.claude.json'),
      format: 'json',
      entry: httpEntry
    },
    {
      id: 'kimi',
      name: 'Kimi Code',
      file: kimiFile(kimiHome),
      format: 'json',
      entry: (_url, auth) => ({
        url: _url,
        headers: { Authorization: auth }
      })
    },
    {
      id: 'codex',
      name: 'Codex',
      file: join(codexHome || join(homedir(), '.codex'), 'config.toml'),
      format: 'toml',
      entry: httpEntry
    },
    {
      id: 'workbuddy',
      name: 'WorkBuddy',
      file: join(homedir(), '.workbuddy', 'mcp.json'),
      format: 'json',
      entry: (url, auth) => ({
        transport: 'streamable-http',
        url,
        headers: { Authorization: auth }
      })
    }
  ]
}

function httpEntry(url: string, auth: string): Record<string, unknown> {
  return {
    type: 'http',
    url,
    headers: { Authorization: auth }
  }
}

function kimiFile(home: string | undefined): string {
  if (home) return join(home, 'mcp.json')
  const codeDir = join(homedir(), '.kimi-code')
  const legacy = join(homedir(), '.kimi', 'mcp.json')
  if (!existsSync(codeDir) && (existsSync(legacy) || existsSync(join(homedir(), '.kimi')))) return legacy
  return join(codeDir, 'mcp.json')
}

function describe(target: Target, url: string): AgentTarget {
  return {
    id: target.id,
    name: target.name,
    file: target.file,
    present: existsSync(target.file),
    configured: configured(target, url)
  }
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

function writeJson(file: string, entry: Record<string, unknown>): void {
  const data = existsSync(file) ? parseJson(file) : {}
  const servers = data.mcpServers
  const next =
    servers && typeof servers === 'object' && !Array.isArray(servers)
      ? { ...(servers as Record<string, unknown>) }
      : {}
  next[SERVER] = entry
  data.mcpServers = next
  writeText(file, `${JSON.stringify(data, null, 2)}\n`)
}

function writeCodex(file: string, url: string, auth: string): void {
  const current = existsSync(file) ? readText(file) : ''
  const body = [`url = ${tomlString(url)}`, `http_headers = { Authorization = ${tomlString(auth)} }`]
  writeText(file, upsertTomlSection(current, CODEX_HEADER, body))
}

function parseJson(file: string): Record<string, unknown> {
  let data: unknown
  try {
    data = JSON.parse(readText(file))
  } catch {
    throw new Error(`${file} 不是合法 JSON，没有改动`)
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${file} 的内容无法合并，没有改动`)
  }
  return data as Record<string, unknown>
}

function readText(file: string): string {
  return readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
}

function writeText(file: string, text: string): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text, 'utf8')
}

function tomlString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export function upsertTomlSection(text: string, header: string, body: string[]): string {
  const source = text.replace(/^\uFEFF/, '')
  const newline = source.includes('\r\n') ? '\r\n' : '\n'
  const lines = source.split(/\r?\n/)
  const block = [header, ...body]
  const name = header.slice(1, -1)
  const start = lines.findIndex((line) => line.trim() === header)
  if (start < 0) {
    const base = source.trimEnd()
    return `${base.length > 0 ? `${base}${newline}${newline}` : ''}${block.join(newline)}${newline}`
  }
  let end = start + 1
  while (end < lines.length) {
    const trimmed = lines[end].trim()
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      if (trimmed !== header && !trimmed.startsWith(`[${name}.`)) break
    }
    end++
  }
  const next = [...lines.slice(0, start), ...block, ...lines.slice(end)]
  return `${next.join(newline).replace(/\s*$/, '')}${newline}`
}
