import { sanitizeSshOptions, type SshConnectOptions } from './ssh-options'

export interface ParsedJump {
  host: string
  port: number
  username: string
  /** 跳板自己的口令。-J 里的冒号属于用户名，不会填到这里。 */
  secret?: string
}

export interface ParsedSsh {
  host: string
  port: number
  username: string
  keyPath?: string
  /** 只在命令里明文带了密码时才有，例如 ssh://user:pass@host */
  secret?: string
  /** 命令里写了认证偏好时才有。没写就沿用表单里原来的。 */
  authType?: 'password' | 'key'
  /** ssh -J / ProxyJump 的第一跳。后面的跳在 options.extraJumps。 */
  jump?: ParsedJump
  /** 超时、算法、压缩、ProxyCommand 这类连接选项。 */
  options?: SshConnectOptions
  name: string
}

const ARG_FLAGS = new Set(['b', 'c', 'D', 'E', 'e', 'F', 'I', 'i', 'J', 'L', 'l', 'm', 'O', 'o', 'p', 'Q', 'R', 'S', 'W', 'w'])

/**
 * 把一条 SSH 命令拆成连接字段。
 * 认 ssh、ssh.exe、ssh://、user@host，以及 -p / -l / -i / -J / -o / -4 / -6 / -C。
 * -J 的用户名保留冒号后的整段。那不是跳板密码，目标机密码要另外填。
 * -o 认 Port、User、HostName、IdentityFile、ProxyJump、ProxyCommand、
 * ConnectTimeout、ServerAliveInterval、ServerAliveCountMax、Compression、
 * AddressFamily、BindAddress、StrictHostKeyChecking、UserKnownHostsFile、
 * Ciphers、MACs、KexAlgorithms、HostKeyAlgorithms、PreferredAuthentications、
 * PubkeyAuthentication、PasswordAuthentication。不认识的选项跳过。
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
  let jumps: ParsedJump[] | undefined
  let preferKey: boolean | undefined
  const options: SshConnectOptions = {}
  const keyPaths: string[] = []
  const positionals: string[] = []

  while (index < tokens.length) {
    const token = tokens[index]!
    if (!token.startsWith('-') || token === '-') {
      positionals.push(token)
      index += 1
      continue
    }
    if (token === '--') {
      positionals.push(...tokens.slice(index + 1))
      break
    }
    if (token === '-4') {
      options.family = 4
      index += 1
      continue
    }
    if (token === '-6') {
      options.family = 6
      index += 1
      continue
    }
    if (token === '-C') {
      options.compress = true
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
      keyPaths.push(value)
      keyPath = keyPaths[0]
    } else if (flag === 'J') {
      const parsed = parseJumps(value)
      if (!parsed) return null
      jumps = parsed
    } else if (flag === 'o') {
      const option = readOption(value)
      if (!option) continue
      const applied = applyOption(option, {
        setPort: (n) => {
          port = n
        },
        setUser: (user) => {
          userFlag = user
        },
        setHost: (host) => {
          hostFlag = host
        },
        addKey: (file) => {
          keyPaths.push(file)
          keyPath = keyPaths[0]
        },
        setJumps: (next) => {
          jumps = next
        },
        options,
        setPreferKey: (next) => {
          preferKey = next
        }
      })
      if (applied === 'bad-port') return null
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
  const jump = jumps?.[0]
  if (jump && !jump.username) jump.username = username
  if (jumps && jumps.length > 1) {
    options.extraJumps = jumps.slice(1).map((hop) => ({
      host: hop.host,
      port: hop.port,
      username: hop.username || username
    }))
  }
  if (keyPaths.length > 1) options.keyPaths = keyPaths.slice(1)
  const dial = sanitizeSshOptions(options)

  return {
    host,
    port: resolvedPort,
    username,
    keyPath,
    authType: preferKey === undefined ? (keyPath ? 'key' : undefined) : preferKey ? 'key' : 'password',
    secret: resolvedSecret || undefined,
    jump,
    options: dial,
    name: username ? `${username}@${host}` : host
  }
}

/** none 表示不走跳板。每一跳的 @ 之前整段都是用户名。 */
function parseJumps(value: string): ParsedJump[] | undefined {
  if (value.trim().toLowerCase() === 'none') return []
  const hops = splitHops(value)
    .map(parseJump)
    .filter((hop): hop is ParsedJump => hop !== undefined)
  return hops.length > 0 ? hops : undefined
}

function parseJump(value: string): ParsedJump | undefined {
  const dest = parseDestination(value.trim())
  if (!dest?.host) return undefined
  const at = value.lastIndexOf('@')
  const username = at >= 0 ? decode(value.slice(0, at)) : (dest.user ?? '')
  return {
    host: dest.host,
    port: dest.port ?? 22,
    username
  }
}

function splitHops(value: string): string[] {
  const parts: string[] = []
  let current = ''
  let bracket = 0
  for (const ch of value) {
    if (ch === '[') bracket += 1
    else if (ch === ']') bracket = Math.max(0, bracket - 1)
    if (ch === ',' && bracket === 0) {
      if (current.trim()) parts.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim()) parts.push(current.trim())
  return parts
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

interface OptionBag {
  setPort: (port: number) => void
  setUser: (user: string) => void
  setHost: (host: string) => void
  addKey: (file: string) => void
  setJumps: (jumps: ParsedJump[] | undefined) => void
  setPreferKey: (preferKey: boolean) => void
  options: SshConnectOptions
}

function applyOption(option: { key: string; value: string }, bag: OptionBag): 'ok' | 'bad-port' {
  const { key, value } = option
  if (key === 'port') {
    const n = Number(value)
    if (!Number.isInteger(n) || n < 1 || n > 65535) return 'bad-port'
    bag.setPort(n)
  } else if (key === 'user') {
    bag.setUser(value)
  } else if (key === 'hostname') {
    bag.setHost(value)
  } else if (key === 'identityfile') {
    bag.addKey(value)
  } else if (key === 'proxyjump') {
    const parsed = parseJumps(value)
    if (parsed) bag.setJumps(parsed.length > 0 ? parsed : undefined)
  } else if (key === 'proxycommand') {
    if (value.toLowerCase() === 'none') delete bag.options.proxyCommand
    else bag.options.proxyCommand = value
  } else if (key === 'connecttimeout') {
    bag.options.readyTimeoutMs = seconds(value)
  } else if (key === 'serveraliveinterval') {
    bag.options.keepaliveIntervalMs = seconds(value)
  } else if (key === 'serveralivecountmax') {
    const n = Number(value)
    if (Number.isInteger(n) && n >= 0 && n <= 100) bag.options.keepaliveCountMax = n
  } else if (key === 'compression') {
    if (isYes(value)) bag.options.compress = true
    else if (isNo(value)) delete bag.options.compress
  } else if (key === 'addressfamily') {
    const family = value.toLowerCase()
    if (family === 'inet') bag.options.family = 4
    else if (family === 'inet6') bag.options.family = 6
    else if (family === 'any') delete bag.options.family
  } else if (key === 'bindaddress') {
    bag.options.localAddress = value
  } else if (key === 'stricthostkeychecking') {
    const mode = value.toLowerCase()
    if (mode === 'no' || mode === 'off') bag.options.strictHostKeyChecking = 'no'
    else if (mode === 'accept-new') bag.options.strictHostKeyChecking = 'accept-new'
    else if (mode === 'yes' || mode === 'ask') bag.options.strictHostKeyChecking = 'yes'
  } else if (key === 'userknownhostsfile' || key === 'globalknownhostsfile') {
    if (value === '/dev/null' || value.toUpperCase() === 'NUL') bag.options.strictHostKeyChecking = 'no'
  } else if (key === 'ciphers') {
    setAlgo(bag, 'cipher', value)
  } else if (key === 'macs') {
    setAlgo(bag, 'hmac', value)
  } else if (key === 'kexalgorithms') {
    setAlgo(bag, 'kex', value)
  } else if (key === 'hostkeyalgorithms') {
    setAlgo(bag, 'serverHostKey', value)
  } else if (key === 'preferredauthentications') {
    const first = value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .find((item) => item === 'publickey' || item === 'password' || item === 'keyboard-interactive')
    if (first === 'publickey') bag.setPreferKey(true)
    else if (first) bag.setPreferKey(false)
  } else if (key === 'pubkeyauthentication') {
    if (isNo(value)) bag.setPreferKey(false)
    else if (isYes(value)) bag.setPreferKey(true)
  } else if (key === 'passwordauthentication') {
    if (isNo(value)) bag.setPreferKey(true)
    else if (isYes(value)) bag.setPreferKey(false)
  }
  return 'ok'
}

function setAlgo(bag: OptionBag, field: 'cipher' | 'kex' | 'serverHostKey' | 'hmac', value: string): void {
  const list = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  if (list.length === 0) return
  bag.options.algorithms = { ...bag.options.algorithms, [field]: list }
}

function seconds(value: string): number | undefined {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return undefined
  return Math.min(Math.trunc(n) * 1000, 300_000)
}

function isYes(value: string): boolean {
  const text = value.toLowerCase()
  return text === 'yes' || text === 'true' || text === 'on'
}

function isNo(value: string): boolean {
  const text = value.toLowerCase()
  return text === 'no' || text === 'false' || text === 'off'
}

function readOption(value: string): { key: string; value: string } | null {
  const eq = value.indexOf('=')
  const spaced = value.search(/\s/)
  const cut = eq >= 0 && (spaced < 0 || eq < spaced) ? eq : spaced
  if (cut <= 0) return null
  const key = value.slice(0, cut).trim().toLowerCase()
  const rest = value.slice(cut + 1).trim()
  if (!key) return null
  return { key, value: rest }
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
