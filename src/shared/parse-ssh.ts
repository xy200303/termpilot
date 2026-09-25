export interface ParsedJump {
  host: string
  port: number
  username: string
  /** ssh -J user:pass@host 里冒号后面的口令 */
  secret?: string
}

export interface ParsedSsh {
  host: string
  port: number
  username: string
  keyPath?: string
  /** 只在命令里明文带了密码时才有，例如 ssh://user:pass@host */
  secret?: string
  /** ssh -J / ProxyJump。只取第一跳。 */
  jump?: ParsedJump
  name: string
}

const ARG_FLAGS = new Set(['b', 'c', 'D', 'E', 'e', 'F', 'I', 'i', 'J', 'L', 'l', 'm', 'O', 'o', 'p', 'Q', 'R', 'S', 'W', 'w'])

/**
 * 把一条 SSH 命令拆成连接字段。
 * 认 ssh、ssh.exe、ssh://、user@host，以及 -p / -l / -i / -J / -o。
 * -J user:pass@jump:port 里的 pass 是跳板口令，不是目标机密码。
 */
export function parseSshCommand(input: string): ParsedSsh | null {
  const tokens = tokenize(input.trim())
  if (tokens.length === 0) return null

  let index = 0
  let secret: string | undefined
  let sawSsh = false
  if (tokens[0] === 'sudo') index += 1
  if (tokens[index] === 'sshpass') {
    const taken = takeSshpass(tokens, index)
    if (!taken) return null
    secret = taken.secret
    index = taken.next
    sawSsh = true
  }
  if (isSshBin(tokens[index] ?? '')) {
    index += 1
    sawSsh = true
  }

  let port: number | undefined
  let userFlag = ''
  let keyPath: string | undefined
  let hostFlag = ''
  let jump: ParsedJump | undefined
  const positionals: string[] = []

  while (index < tokens.length) {
    const token = tokens[index]!
    if (!token.startsWith('-') || token === '-') {
      positionals.push(token)
      index += 1
      continue
    }

    const body = token.slice(1)
    const flag = body[0] ?? ''
    const attached = body.slice(1)
    if (!ARG_FLAGS.has(flag)) {
      index += 1
      continue
    }

    const value = attached || tokens[index + 1]
    if (!value || (!attached && value.startsWith('-'))) return null
    if (!attached) index += 1
    index += 1

    if (flag === 'p') {
      const n = Number(value)
      if (!Number.isInteger(n) || n < 1 || n > 65535) return null
      port = n
    } else if (flag === 'l') {
      userFlag = value
    } else if (flag === 'i') {
      keyPath = value
    } else if (flag === 'J') {
      const parsedJump = parseJump(value)
      if (!parsedJump) return null
      jump = parsedJump
    } else if (flag === 'o') {
      const option = readOption(value)
      if (!option) continue
      if (option.key === 'port') {
        const n = Number(option.value)
        if (!Number.isInteger(n) || n < 1 || n > 65535) return null
        port = n
      } else if (option.key === 'user') {
        userFlag = option.value
      } else if (option.key === 'identityfile') {
        keyPath = option.value
      } else if (option.key === 'hostname') {
        hostFlag = option.value
      } else if (option.key === 'proxyjump') {
        jump = parseJump(option.value) ?? jump
      }
    }
  }

  const destToken =
    positionals.find((token) => token.includes('@') || token.includes('://') || token.startsWith('[')) ??
    positionals.find((token) => token.includes('.') || token.includes(':')) ??
    (sawSsh ? positionals[0] : undefined)
  const dest = destToken ? parseDestination(destToken) : null
  const host = dest?.host || hostFlag
  if (!host) return null
  const username = dest?.user || userFlag
  const resolvedPort = dest?.port ?? port ?? 22
  const resolvedSecret = dest?.password || secret

  return {
    host,
    port: resolvedPort,
    username,
    keyPath,
    secret: resolvedSecret || undefined,
    jump,
    name: username ? `${username}@${host}` : host
  }
}

/** 只取第一跳。user:pass@host:port 里的 pass 留给跳板登录。 */
function parseJump(value: string): ParsedJump | undefined {
  const first = value.split(',')[0]?.trim()
  if (!first) return undefined
  const dest = parseDestination(first)
  if (!dest?.host || !dest.user) return undefined
  return {
    host: dest.host,
    port: dest.port ?? 22,
    username: dest.user,
    secret: dest.password || undefined
  }
}

function isSshBin(token: string): boolean {
  const name = token.replace(/^.*[\\/]/, '').toLowerCase()
  return name === 'ssh' || name === 'ssh.exe'
}

function takeSshpass(tokens: string[], start: number): { secret?: string; next: number } | null {
  let index = start + 1
  let secret: string | undefined
  while (index < tokens.length && tokens[index]?.startsWith('-')) {
    const token = tokens[index]!
    if (token === '-p' || token.startsWith('-p')) {
      const attached = token === '-p' ? '' : token.slice(2)
      const value = attached || tokens[index + 1]
      if (!value) return null
      secret = value
      index += attached ? 1 : 2
      continue
    }
    index += token === '-f' || token === '-P' ? 2 : 1
  }
  return { secret, next: index }
}

function readOption(value: string): { key: string; value: string } | null {
  const eq = value.indexOf('=')
  if (eq <= 0) return null
  return { key: value.slice(0, eq).trim().toLowerCase(), value: value.slice(eq + 1).trim() }
}

function parseDestination(token: string): { user?: string; password?: string; host: string; port?: number } | null {
  let rest = token
  if (/^ssh:\/\//i.test(rest)) rest = rest.slice(6)
  if (!rest || rest.startsWith('-')) return null

  let user: string | undefined
  let password: string | undefined
  const at = rest.lastIndexOf('@')
  if (at >= 0) {
    const cred = decode(rest.slice(0, at))
    rest = rest.slice(at + 1)
    const colon = cred.indexOf(':')
    if (colon >= 0) {
      user = cred.slice(0, colon)
      password = cred.slice(colon + 1)
    } else {
      user = cred
    }
  }
  if (!rest) return null

  if (rest.startsWith('[')) {
    const end = rest.indexOf(']')
    if (end <= 1) return null
    const host = rest.slice(1, end)
    const tail = rest.slice(end + 1)
    if (!tail) return { user, password, host }
    if (!tail.startsWith(':')) return null
    const port = Number(tail.slice(1))
    if (!Number.isInteger(port) || port < 1 || port > 65535) return null
    return { user, password, host, port }
  }

  const colon = rest.lastIndexOf(':')
  if (colon > 0 && /^\d+$/.test(rest.slice(colon + 1)) && !rest.slice(0, colon).includes(':')) {
    const port = Number(rest.slice(colon + 1))
    if (port >= 1 && port <= 65535) return { user, password, host: rest.slice(0, colon), port }
  }
  return { user, password, host: rest }
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function tokenize(input: string): string[] {
  const out: string[] = []
  let cur = ''
  let quote: '"' | "'" | null = null
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!
    if (quote) {
      if (ch === quote) quote = null
      else cur += ch
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === '\\') {
      const next = input[i + 1]
      if (next === ' ' || next === '"' || next === "'" || next === '\\') {
        cur += next
        i += 1
        continue
      }
    }
    if (/\s/.test(ch)) {
      if (cur) out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur) out.push(cur)
  return out
}
