import { homedir } from 'node:os'
import { existsSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { Duplex } from 'node:stream'
import { Client, type ClientChannel, type ConnectConfig } from 'ssh2'
import type { AlgorithmList } from 'ssh2'
import type { SessionConfig } from '../shared/types'
import type { SshConnectOptions } from '../shared/ssh-options'

/** 正向 SSH 的连接参数。终端和 SFTP 共用，凭据只在主进程内存里出现。 */
export function buildConnectConfig(session: SessionConfig, secret: string | null): ConnectConfig {
  const cfg: ConnectConfig = {
    host: session.host,
    port: session.port,
    username: session.username,
    readyTimeout: 15000,
    keepaliveInterval: 15000
  }
  const keyPath = resolveKeyPath(session)
  switch (session.authType) {
    case 'password':
      cfg.password = secret ?? undefined
      break
    case 'key':
      if (keyPath) {
        cfg.privateKey = readFileSync(keyPath)
        if (secret) cfg.passphrase = secret
      }
      break
  }
  applyDialOptions(cfg, session.sshOptions)
  return cfg
}

/**
 * 有跳板时先登录跳板，再从跳板连到目标机。
 * 调用前先给 client 挂好 ready / error。跳板失败会转到 client 的 error。
 * 平台禁止直接转发时，改在跳板的终端里执行 ssh，并用目标机密码应答。
 */
export function dialSsh(
  session: SessionConfig,
  secret: string | null,
  jumpSecret: string | null,
  client: Client,
  opts?: { cols?: number; rows?: number; onJumpShell?: (stream: ClientChannel) => void }
): Client | undefined {
  const options = session.sshOptions
  const hops = jumpHops(session, jumpSecret)
  if (hops.length === 0) {
    const cfg = buildConnectConfig(session, secret)
    if (options?.proxyCommand) cfg.sock = openProxyCommand(options.proxyCommand, session)
    connectClient(client, cfg)
    return undefined
  }

  const opened: Client[] = []
  let dialFailed = false
  const fail = (error: Error) => {
    if (dialFailed) return
    dialFailed = true
    for (const hop of opened) hop.end()
    client.emit('error', error)
  }
  client.on('close', () => {
    for (const hop of opened) hop.end()
  })

  const connectHop = (index: number, sock?: ConnectConfig['sock']) => {
    const hop = hops[index]!
    const jump = new Client()
    opened.push(jump)
    let failed = false
    const hopFail = (error: Error) => {
      if (failed) return
      failed = true
      fail(error)
    }
    jump.on('keyboard-interactive', (_name, _instructions, _lang, prompts, finish) => {
      finish(prompts.map(() => hop.password ?? ''))
    })
    jump.on('error', (error) => hopFail(new Error(`跳板连接失败: ${error.message}`)))
    jump.on('ready', () => {
      const next = index + 1 < hops.length ? hops[index + 1]! : { host: session.host, port: session.port || 22 }
      jump.forwardOut('127.0.0.1', 0, next.host, next.port, (error, stream) => {
        if (!error && stream) {
          if (index + 1 < hops.length) connectHop(index + 1, stream)
          else connectClient(client, { ...buildConnectConfig(session, secret), sock: stream })
          return
        }
        const last = index === hops.length - 1
        if (last && opts?.onJumpShell) {
          jump.shell({ term: 'xterm-256color', cols: opts.cols ?? 80, rows: opts.rows ?? 24 }, (shellError, shell) => {
            if (shellError || !shell) {
              hopFail(new Error(`跳板无法转到目标机: ${error?.message ?? shellError?.message ?? '未知原因'}`))
              return
            }
            loginTargetFromJump(shell, session, secret)
            opts.onJumpShell?.(shell)
          })
          return
        }
        hopFail(new Error(`跳板无法转到目标机: ${error?.message ?? '未知原因'}`))
      })
    })
    const cfg: ConnectConfig = {
      host: hop.host,
      port: hop.port,
      username: hop.username,
      password: hop.password ?? undefined,
      tryKeyboard: true,
      readyTimeout: 20000,
      keepaliveInterval: 15000
    }
    applyDialOptions(cfg, options)
    if (sock) cfg.sock = sock
    connectClient(jump, cfg, hopFail)
  }

  connectHop(0)
  const head = opened[0]
  if (head) jumpChains.set(head, opened)
  return head
}

/** 关掉跳板，连同后面几跳。 */
export function endJump(jump: Client | undefined): void {
  if (!jump) return
  const hops = jumpChains.get(jump) ?? [jump]
  jumpChains.delete(jump)
  for (const hop of hops) hop.end()
}

const jumpChains = new WeakMap<Client, Client[]>()

interface DialHop {
  host: string
  port: number
  username: string
  password: string | null
}

function jumpHops(session: SessionConfig, jumpSecret: string | null): DialHop[] {
  const host = session.jumpHost?.trim()
  if (!host) return []
  let username = session.jumpUsername?.trim() || session.username
  let password = jumpSecret
  if (username.startsWith('jt_') && password && !username.includes(':')) {
    username = `${username}:${password}`
    password = null
  }
  const hops: DialHop[] = [{ host, port: session.jumpPort || 22, username, password }]
  for (const extra of session.sshOptions?.extraJumps ?? []) {
    if (!extra.host.trim()) continue
    hops.push({
      host: extra.host,
      port: extra.port || 22,
      username: extra.username.trim() || session.username,
      password: null
    })
  }
  return hops
}

function connectClient(client: Client, cfg: ConnectConfig, onError?: (error: Error) => void): void {
  try {
    client.connect(cfg)
  } catch (error) {
    const wrapped = error instanceof Error ? error : new Error(String(error))
    if (onError) onError(wrapped)
    else client.emit('error', wrapped)
  }
}

function applyDialOptions(cfg: ConnectConfig, options: SshConnectOptions | undefined): void {
  if (!options) return
  if (options.readyTimeoutMs !== undefined) cfg.readyTimeout = options.readyTimeoutMs === 0 ? 120_000 : options.readyTimeoutMs
  if (options.keepaliveIntervalMs !== undefined) cfg.keepaliveInterval = options.keepaliveIntervalMs
  if (options.keepaliveCountMax !== undefined) cfg.keepaliveCountMax = options.keepaliveCountMax
  if (options.localAddress) cfg.localAddress = options.localAddress
  if (options.family === 4) cfg.forceIPv4 = true
  if (options.family === 6) cfg.forceIPv6 = true
  if (options.strictHostKeyChecking === 'no' || options.strictHostKeyChecking === 'accept-new') {
    cfg.hostVerifier = () => true
  }
  const algorithms = toAlgorithms(options)
  if (algorithms) cfg.algorithms = algorithms
}

function toAlgorithms(options: SshConnectOptions): ConnectConfig['algorithms'] | undefined {
  const algorithms: NonNullable<ConnectConfig['algorithms']> = {}
  const cipher = algoList(options.algorithms?.cipher)
  const kex = algoList(options.algorithms?.kex)
  const serverHostKey = algoList(options.algorithms?.serverHostKey)
  const hmac = algoList(options.algorithms?.hmac)
  if (cipher) algorithms.cipher = cipher as NonNullable<ConnectConfig['algorithms']>['cipher']
  if (kex) algorithms.kex = kex as NonNullable<ConnectConfig['algorithms']>['kex']
  if (serverHostKey) algorithms.serverHostKey = serverHostKey as NonNullable<ConnectConfig['algorithms']>['serverHostKey']
  if (hmac) algorithms.hmac = hmac as NonNullable<ConnectConfig['algorithms']>['hmac']
  if (options.compress) algorithms.compress = ['zlib@openssh.com', 'zlib', 'none']
  return Object.keys(algorithms).length > 0 ? algorithms : undefined
}

function algoList(values: string[] | undefined): AlgorithmList<string> | undefined {
  if (!values?.length) return undefined
  const append: string[] = []
  const prepend: string[] = []
  const remove: string[] = []
  const plain: string[] = []
  for (const item of values) {
    if (item.startsWith('+')) append.push(item.slice(1))
    else if (item.startsWith('^')) prepend.push(item.slice(1))
    else if (item.startsWith('-')) remove.push(item.slice(1))
    else plain.push(item)
  }
  if (plain.length > 0) return plain
  const patch: { append?: string[]; prepend?: string[]; remove?: string[] } = {}
  if (append.length > 0) patch.append = append
  if (prepend.length > 0) patch.prepend = prepend
  if (remove.length > 0) patch.remove = remove
  return patch as AlgorithmList<string>
}

function resolveKeyPath(session: SessionConfig): string | undefined {
  const candidates = [session.keyPath, ...(session.sshOptions?.keyPaths ?? [])].filter((item): item is string =>
    Boolean(item?.trim())
  )
  for (const candidate of candidates) {
    const path = expandHome(candidate)
    if (existsSync(path)) return path
  }
  const first = candidates[0]
  return first ? expandHome(first) : undefined
}

function expandHome(path: string): string {
  if (path === '~') return homedir()
  if (path.startsWith('~/') || path.startsWith('~\\')) return homedir() + path.slice(1)
  return path
}

function openProxyCommand(command: string, target: { host: string; port: number; username: string }): Duplex {
  const expanded = command.replace(/%[%hpnr]/g, (token) => {
    if (token === '%%') return '%'
    if (token === '%h' || token === '%n') return target.host
    if (token === '%p') return String(target.port || 22)
    if (token === '%r') return target.username
    return token
  })
  const child = spawn(expanded, { shell: true, windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] })
  const sock = new Duplex({
    read() {
      child.stdout.resume()
    },
    write(chunk, encoding, callback) {
      child.stdin.write(chunk, encoding, callback)
    },
    final(callback) {
      child.stdin.end()
      callback()
    },
    destroy(error, callback) {
      child.kill()
      callback(error)
    }
  })
  child.stdout.on('data', (chunk) => {
    if (!sock.push(chunk)) child.stdout.pause()
  })
  child.stdout.on('end', () => sock.push(null))
  child.on('error', (error) => sock.destroy(error))
  return sock
}

/** 跳板不允许端口转发时，在它的 shell 里再 ssh 到目标机，看到密码提示就送已保存的密码。 */
function loginTargetFromJump(stream: ClientChannel, session: SessionConfig, secret: string | null): void {
  const host = session.host.includes(':') && !session.host.startsWith('[') ? `[${session.host}]` : session.host
  const port = session.port && session.port !== 22 ? ` -p ${session.port}` : ''
  const command = `ssh -tt -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o NumberOfPasswordPrompts=1${port} ${session.username}@${host}\n`
  let phase: 'wait' | 'asked' | 'done' = 'wait'
  const ask = () => {
    if (phase !== 'wait') return
    phase = 'asked'
    stream.write(command)
  }
  const timer = setTimeout(ask, 1200)
  stream.on('data', (chunk: Buffer | string) => {
    const text = stripControls(chunk.toString())
    if (/are you sure you want to continue connecting/i.test(text)) {
      stream.write('yes\n')
      return
    }
    const askingPassword = /(?:password|passphrase|密码)\s*[:：]\s*$/i.test(text.trim())
    if (askingPassword && secret && phase !== 'done') {
      clearTimeout(timer)
      phase = 'done'
      stream.write(`${secret}\n`)
      return
    }
    if (phase === 'wait' && /[#$>]\s*$/.test(text.trim())) {
      clearTimeout(timer)
      ask()
    }
  })
}

function stripControls(text: string): string {
  return text.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '').replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, '')
}
