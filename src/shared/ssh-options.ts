/** 一条跳板。用户名可以含冒号，那是名字的一部分。 */
export interface SshHop {
  host: string
  port: number
  username: string
}

/**
 * 从 ssh 命令里认出来、连接时会用上的选项。
 * 主机、端口、用户名、私钥、第一跳跳板仍放在会话自己的字段里。
 */
export interface SshConnectOptions {
  /** 握手等待，毫秒。0 表示命令里写了不超时，连接时改成有上限的等待。 */
  readyTimeoutMs?: number
  /** SSH 保活间隔，毫秒。0 表示关掉。 */
  keepaliveIntervalMs?: number
  keepaliveCountMax?: number
  compress?: boolean
  family?: 4 | 6
  localAddress?: string
  strictHostKeyChecking?: 'yes' | 'no' | 'accept-new'
  /** 保留 OpenSSH 的 + / ^ / - 前缀，拨号时再交给 ssh2。 */
  algorithms?: {
    cipher?: string[]
    kex?: string[]
    serverHostKey?: string[]
    hmac?: string[]
  }
  /** -i 写了多把私钥时，第一把放在 keyPath，其余留在这里。 */
  keyPaths?: string[]
  /** 第一跳之后的跳板。 */
  extraJumps?: SshHop[]
  /** 没有跳板时，用这条本地命令代替直连。 */
  proxyCommand?: string
}

const ALGO_NAME = /^[+-^]?[A-Za-z0-9][A-Za-z0-9@._-]{0,79}$/

export function sanitizeSshOptions(value: unknown): SshConnectOptions | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  const options: SshConnectOptions = {}

  const ready = finite(raw.readyTimeoutMs)
  if (ready !== undefined && ready >= 0 && ready <= 300_000) options.readyTimeoutMs = ready
  const alive = finite(raw.keepaliveIntervalMs)
  if (alive !== undefined && alive >= 0 && alive <= 3_600_000) options.keepaliveIntervalMs = alive
  const count = finite(raw.keepaliveCountMax)
  if (count !== undefined && count >= 0 && count <= 100) options.keepaliveCountMax = count
  if (raw.compress === true) options.compress = true
  if (raw.family === 4 || raw.family === 6) options.family = raw.family
  if (typeof raw.localAddress === 'string' && raw.localAddress.trim() && raw.localAddress.length <= 200) {
    options.localAddress = raw.localAddress.trim()
  }
  if (raw.strictHostKeyChecking === 'yes' || raw.strictHostKeyChecking === 'no' || raw.strictHostKeyChecking === 'accept-new') {
    options.strictHostKeyChecking = raw.strictHostKeyChecking
  }

  const algorithms = sanitizeAlgorithms(raw.algorithms)
  if (algorithms) options.algorithms = algorithms

  const keyPaths = stringList(raw.keyPaths, 8, 500)
  if (keyPaths) options.keyPaths = keyPaths

  const hops = sanitizeHops(raw.extraJumps)
  if (hops) options.extraJumps = hops

  if (typeof raw.proxyCommand === 'string') {
    const command = raw.proxyCommand.trim()
    if (command && command.length <= 1000 && !/[\r\n]/.test(command) && command.toLowerCase() !== 'none') {
      options.proxyCommand = command
    }
  }

  return hasSshOptions(options) ? options : undefined
}

/** 没有第一跳时，后面的跳板没有落点。 */
export function sshOptionsForSession(
  jumpHost: string | undefined,
  options: SshConnectOptions | null | undefined
): SshConnectOptions | undefined {
  const clean = sanitizeSshOptions(options)
  if (!clean) return undefined
  if (!jumpHost?.trim()) delete clean.extraJumps
  return hasSshOptions(clean) ? clean : undefined
}

export function hasSshOptions(options: SshConnectOptions | undefined): boolean {
  if (!options) return false
  return Object.values(options).some((value) => value !== undefined && value !== false)
}

/** 表单里用一句话说明还认下了哪些选项。 */
export function describeSshOptions(options: SshConnectOptions | null | undefined): string {
  const clean = sanitizeSshOptions(options)
  if (!clean) return ''
  const parts: string[] = []
  if (clean.readyTimeoutMs !== undefined) {
    parts.push(clean.readyTimeoutMs === 0 ? '连接不另加超时' : `连接超时 ${Math.round(clean.readyTimeoutMs / 1000)} 秒`)
  }
  if (clean.keepaliveIntervalMs !== undefined) {
    parts.push(clean.keepaliveIntervalMs === 0 ? '关闭保活' : `保活 ${Math.round(clean.keepaliveIntervalMs / 1000)} 秒`)
  }
  if (clean.family === 4) parts.push('只走 IPv4')
  if (clean.family === 6) parts.push('只走 IPv6')
  if (clean.compress) parts.push('压缩')
  if (clean.strictHostKeyChecking === 'no' || clean.strictHostKeyChecking === 'accept-new') parts.push('不核对主机密钥')
  if (clean.localAddress) parts.push(`从 ${clean.localAddress} 出去`)
  if (clean.algorithms?.cipher) parts.push('指定加密算法')
  if (clean.algorithms?.kex) parts.push('指定密钥交换')
  if (clean.algorithms?.serverHostKey) parts.push('指定主机密钥算法')
  if (clean.algorithms?.hmac) parts.push('指定校验算法')
  if (clean.keyPaths?.length) parts.push(`另有 ${clean.keyPaths.length} 把私钥`)
  if (clean.extraJumps?.length) parts.push(`后面还有 ${clean.extraJumps.length} 跳`)
  if (clean.proxyCommand) parts.push('用 ProxyCommand 连接')
  return parts.join('，')
}

function sanitizeAlgorithms(value: unknown): SshConnectOptions['algorithms'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  const algorithms: NonNullable<SshConnectOptions['algorithms']> = {}
  const cipher = algoList(raw.cipher)
  const kex = algoList(raw.kex)
  const serverHostKey = algoList(raw.serverHostKey)
  const hmac = algoList(raw.hmac)
  if (cipher) algorithms.cipher = cipher
  if (kex) algorithms.kex = kex
  if (serverHostKey) algorithms.serverHostKey = serverHostKey
  if (hmac) algorithms.hmac = hmac
  return Object.keys(algorithms).length > 0 ? algorithms : undefined
}

function sanitizeHops(value: unknown): SshHop[] | undefined {
  if (!Array.isArray(value)) return undefined
  const hops: SshHop[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const hop = item as Record<string, unknown>
    const host = typeof hop.host === 'string' ? hop.host.trim() : ''
    const username = typeof hop.username === 'string' ? hop.username.trim() : ''
    const port = finite(hop.port)
    if (!host || host.length > 255 || username.length > 500) continue
    if (port === undefined || port < 1 || port > 65535) continue
    hops.push({ host, port, username })
    if (hops.length >= 8) break
  }
  return hops.length > 0 ? hops : undefined
}

function algoList(value: unknown): string[] | undefined {
  const list = stringList(value, 32, 80)?.filter((item) => ALGO_NAME.test(item))
  return list && list.length > 0 ? list : undefined
}

function stringList(value: unknown, max: number, itemMax: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const list = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= itemMax)
    .slice(0, max)
  return list.length > 0 ? list : undefined
}

function finite(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isFinite(n) ? Math.trunc(n) : undefined
}
