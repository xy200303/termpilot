import { existsSync, readFileSync } from 'node:fs'
import { homedir, userInfo } from 'node:os'
import { join } from 'node:path'

/**
 * ~/.ssh/config 只读不写，仅作为导入来源。
 * 写回会替换文件、让 ACL 继承目录权限，OpenSSH 会拒绝权限过宽的 config（Bad owner or permissions）。
 * 带通配符的 Host、Match、Include 原样跳过，不导入。
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

export function localUsername(): string {
  try {
    return userInfo().username
  } catch {
    return ''
  }
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

function numberOr(value: string | undefined, fallback: number): number {
  const port = Number(value)
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : fallback
}
