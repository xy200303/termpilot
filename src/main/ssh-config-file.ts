import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir, userInfo } from 'node:os'
import { dirname, join } from 'node:path'

/**
 * ~/.ssh/config 只保存 OpenSSH 认得的字段。
 * 密码、备注、窗口和反向监听留在 TermPilot 的数据库里，不写进这个文件。
 * 带通配符的 Host、Match、Include 原样保留，不导入也不改写。
 */

export interface SshHopFields {
  host: string
  port: number
  username: string
}

export interface SshHostFields {
  hostName: string
  port: number
  username: string
  identityFiles: string[]
  jumps: SshHopFields[]
  proxyCommand?: string
}

interface Section {
  kind: 'loose' | 'match' | 'host'
  lines: string[]
  alias?: string
  concrete?: boolean
}

const ALIAS = /^[A-Za-z0-9][A-Za-z0-9_.@:-]{0,127}$/

export function sshConfigPath(): string {
  return join(homedir(), '.ssh', 'config')
}

export function readConcreteHosts(text: string): { alias: string; fields: SshHostFields }[] {
  return parse(text)
    .filter((section) => section.kind === 'host' && section.concrete && section.alias)
    .map((section) => ({ alias: section.alias!, fields: fieldsOf(section.lines) }))
}

export function renderUpsert(text: string, alias: string, fields: SshHostFields): string {
  const newline = text.includes('\r\n') ? '\r\n' : '\n'
  const sections = parse(text.replace(/\r\n/g, '\n'))
  const index = sections.findIndex((section) => section.kind === 'host' && section.alias === alias)
  const lines = index >= 0 ? applyFields(sections[index]!.lines, alias, fields) : newBlock(alias, fields)
  if (index >= 0) sections[index] = { kind: 'host', alias, concrete: true, lines }
  else {
    if (sections.length > 0 && sections[sections.length - 1]!.lines.at(-1) !== '') {
      sections.push({ kind: 'loose', lines: [''] })
    }
    sections.push({ kind: 'host', alias, concrete: true, lines })
  }
  return finish(joinSections(sections), newline)
}

export function renderRemove(text: string, alias: string): string {
  const newline = text.includes('\r\n') ? '\r\n' : '\n'
  const sections = parse(text.replace(/\r\n/g, '\n')).filter(
    (section) => !(section.kind === 'host' && section.alias === alias)
  )
  return finish(joinSections(sections), newline)
}

export function suggestAlias(name: string, publicId: string, taken: Set<string>): string {
  const cleaned = name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9_.@:-]/g, '')
    .replace(/^[^A-Za-z0-9]+/, '')
    .slice(0, 64)
  const base = ALIAS.test(cleaned) && !/[*?!]/.test(cleaned) ? cleaned : `tp-${publicId.replace(/^conn-/, '')}`
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

export function upsertSshHost(alias: string, fields: SshHostFields): void {
  const file = sshConfigPath()
  const current = existsSync(file) ? readFileSync(file, 'utf8') : ''
  const next = renderUpsert(current, alias, fields)
  if (normalize(next) === normalize(current)) return
  writeConfig(file, next)
}

export function removeSshHost(alias: string): void {
  const file = sshConfigPath()
  if (!existsSync(file)) return
  const current = readFileSync(file, 'utf8')
  const next = renderRemove(current, alias)
  if (normalize(next) === normalize(current)) return
  writeConfig(file, next)
}

export function listConfigAliases(): Set<string> {
  if (!existsSync(sshConfigPath())) return new Set()
  return new Set(readConcreteHosts(readFileSync(sshConfigPath(), 'utf8')).map((host) => host.alias))
}

export function homeRelative(path: string): string {
  const home = homedir().replace(/\\/g, '/')
  const norm = path.replace(/\\/g, '/')
  if (norm === home) return '~'
  if (norm.startsWith(`${home}/`)) return `~${norm.slice(home.length)}`
  return path
}

export function localUsername(): string {
  try {
    return userInfo().username
  } catch {
    return ''
  }
}

function writeConfig(file: string, text: string): void {
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.termpilot-tmp`
  writeFileSync(tmp, text, 'utf8')
  try {
    chmodSync(tmp, 0o600)
  } catch {
    /* Windows 上忽略 */
  }
  renameSync(tmp, file)
}

function parse(text: string): Section[] {
  const sections: Section[] = []
  let current: Section = { kind: 'loose', lines: [] }
  for (const line of text.split('\n')) {
    const directive = directiveOf(line)
    if (directive?.key === 'host') {
      push(sections, current)
      const tokens = directive.value.split(/\s+/).filter(Boolean)
      const alias = tokens[0] ?? ''
      current = {
        kind: 'host',
        lines: [line],
        alias,
        concrete: tokens.length === 1 && ALIAS.test(alias) && !/[*?!]/.test(alias)
      }
      continue
    }
    if (directive?.key === 'match') {
      push(sections, current)
      current = { kind: 'match', lines: [line] }
      continue
    }
    current.lines.push(line)
  }
  push(sections, current)
  return sections
}

function push(sections: Section[], section: Section): void {
  if (section.lines.length === 0) return
  sections.push(section)
}

function fieldsOf(lines: string[]): SshHostFields {
  const values = keywords(lines)
  const hostLine = lines.map(directiveOf).find((item) => item?.key === 'host')
  const alias = hostLine?.value.split(/\s+/)[0] ?? ''
  const identityFiles = values.filter((item) => item.key === 'identityfile').map((item) => item.value)
  const proxy = values.find((item) => item.key === 'proxyjump')?.value
  const command = values.find((item) => item.key === 'proxycommand')?.value
  const port = numberOr(values.find((item) => item.key === 'port')?.value, 22)
  return {
    hostName: values.find((item) => item.key === 'hostname')?.value || alias,
    port,
    username: values.find((item) => item.key === 'user')?.value || localUsername(),
    identityFiles,
    jumps: proxy && proxy.toLowerCase() !== 'none' ? parseJumps(proxy) : [],
    proxyCommand: command && command.toLowerCase() !== 'none' ? command : undefined
  }
}

function applyFields(lines: string[], alias: string, fields: SshHostFields): string[] {
  const next = lines.map((line) => {
    const directive = directiveOf(line)
    if (directive?.key !== 'host') return line
    const indent = line.match(/^\s*/)?.[0] ?? ''
    return `${indent}Host ${alias}`
  })
  setKeyword(next, 'hostname', fields.hostName)
  setKeyword(next, 'user', fields.username)
  setKeyword(next, 'port', fields.port === 22 ? null : String(fields.port))
  setKeyword(next, 'identityfile', null)
  for (const file of fields.identityFiles) insertKeyword(next, 'identityfile', file)
  setKeyword(next, 'proxyjump', fields.jumps.length > 0 ? fields.jumps.map(formatHop).join(',') : null)
  setKeyword(next, 'proxycommand', fields.proxyCommand ?? null)
  return next
}

function newBlock(alias: string, fields: SshHostFields): string[] {
  return applyFields([`Host ${alias}`], alias, fields)
}

function setKeyword(lines: string[], key: string, value: string | null): void {
  let seen = false
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const directive = directiveOf(lines[i]!)
    if (directive?.key !== key) continue
    if (value === null || seen) {
      lines.splice(i, 1)
      continue
    }
    lines[i] = lineWithValue(lines[i]!, directive, value)
    seen = true
  }
  if (value !== null && !seen) insertKeyword(lines, key, value)
}

function insertKeyword(lines: string[], key: string, value: string): void {
  const indent = lines.find((line) => {
    const directive = directiveOf(line)
    return directive && directive.key !== 'host'
  })
  const prefix = indent?.match(/^\s*/)?.[0] || '    '
  const row = `${prefix}${canonical(key)} ${quote(value)}`
  let at = lines.length
  while (at > 0 && lines[at - 1]!.trim() === '') at -= 1
  lines.splice(at, 0, row)
}

function lineWithValue(line: string, directive: Directive, value: string): string {
  const at = line.indexOf(directive.rawValue)
  if (at < 0) return `${line.replace(/\s*$/, '')} ${quote(value)}`
  return `${line.slice(0, at)}${quote(value)}`
}

function keywords(lines: string[]): { key: string; value: string }[] {
  return lines.flatMap((line) => {
    const directive = directiveOf(line)
    return directive ? [{ key: directive.key, value: directive.value }] : []
  })
}

interface Directive {
  key: string
  value: string
  rawValue: string
}

function directiveOf(line: string): Directive | null {
  const match = line.match(/^\s*([A-Za-z][A-Za-z0-9]*)\s*(=\s*)?(.*)$/)
  if (!match) return null
  const raw = line.trim()
  if (raw.startsWith('#')) return null
  let rawValue = match[3] ?? ''
  const comment = rawValue.search(/\s#/)
  if (comment >= 0) rawValue = rawValue.slice(0, comment)
  rawValue = rawValue.trim()
  let value = rawValue
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
    (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
  ) {
    value = value.slice(1, -1)
  }
  return { key: match[1]!.toLowerCase(), value, rawValue }
}

function parseJumps(value: string): SshHopFields[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseHop)
    .filter((hop): hop is SshHopFields => hop !== null)
}

function parseHop(value: string): SshHopFields | null {
  const at = value.lastIndexOf('@')
  const user = at >= 0 ? value.slice(0, at) : ''
  const hostPort = at >= 0 ? value.slice(at + 1) : value
  if (!hostPort) return null
  if (hostPort.startsWith('[')) {
    const end = hostPort.indexOf(']')
    if (end < 0) return null
    const host = hostPort.slice(1, end)
    const port = hostPort.slice(end + 1)
    return { host, username: user, port: port.startsWith(':') ? numberOr(port.slice(1), 22) : 22 }
  }
  const colon = hostPort.lastIndexOf(':')
  if (colon > 0 && /^\d+$/.test(hostPort.slice(colon + 1))) {
    return { host: hostPort.slice(0, colon), username: user, port: numberOr(hostPort.slice(colon + 1), 22) }
  }
  return { host: hostPort, username: user, port: 22 }
}

function formatHop(hop: SshHopFields): string {
  const host = hop.host.includes(':') ? `[${hop.host}]` : hop.host
  const target = hop.port === 22 ? host : `${host}:${hop.port}`
  return hop.username ? `${hop.username}@${target}` : target
}

function canonical(key: string): string {
  const names: Record<string, string> = {
    hostname: 'HostName',
    user: 'User',
    port: 'Port',
    identityfile: 'IdentityFile',
    proxyjump: 'ProxyJump',
    proxycommand: 'ProxyCommand'
  }
  return names[key] ?? key
}

function quote(value: string): string {
  return /[\s#"]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value
}

function numberOr(value: string | undefined, fallback: number): number {
  const port = Number(value)
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : fallback
}

function joinSections(sections: Section[]): string {
  return sections.flatMap((section) => section.lines).join('\n')
}

function finish(text: string, newline: string): string {
  const body = text.replace(/\n/g, newline)
  if (!body || body.endsWith(newline)) return body
  return body + newline
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\s+$/, '')
}
