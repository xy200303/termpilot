import { readFileSync } from 'node:fs'
import { Client, type ClientChannel, type ConnectConfig } from 'ssh2'
import type { SessionConfig } from '../shared/types'

/** 正向 SSH 的连接参数。终端和 SFTP 共用，凭据只在主进程内存里出现。 */
export function buildConnectConfig(session: SessionConfig, secret: string | null): ConnectConfig {
  const cfg: ConnectConfig = {
    host: session.host,
    port: session.port,
    username: session.username,
    readyTimeout: 15000,
    keepaliveInterval: 15000
  }
  switch (session.authType) {
    case 'password':
      cfg.password = secret ?? undefined
      break
    case 'key':
      if (session.keyPath) {
        cfg.privateKey = readFileSync(session.keyPath)
        if (secret) cfg.passphrase = secret
      }
      break
  }
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
  const jumpHost = session.jumpHost?.trim()
  if (!jumpHost) {
    client.connect(buildConnectConfig(session, secret))
    return undefined
  }

  // HiDevLab 的跳板用户名是 jt_ 到 @ 之前的整段。以前把冒号后面拆成了密码，平台会拒绝转发。
  let jumpUser = session.jumpUsername?.trim() ?? ''
  let jumpPassword = jumpSecret
  if (jumpUser.startsWith('jt_') && jumpPassword && !jumpUser.includes(':')) {
    jumpUser = `${jumpUser}:${jumpPassword}`
    jumpPassword = null
  }

  const jump = new Client()
  let failed = false
  const fail = (error: Error) => {
    if (failed) return
    failed = true
    jump.end()
    client.emit('error', error)
  }
  jump.on('keyboard-interactive', (_name, _instructions, _lang, prompts, finish) => {
    finish(prompts.map(() => jumpPassword ?? ''))
  })
  jump.on('error', (error) => fail(new Error(`跳板连接失败: ${error.message}`)))
  jump.on('ready', () => {
    jump.forwardOut('127.0.0.1', 0, session.host, session.port || 22, (error, stream) => {
      if (!error && stream) {
        client.connect({ ...buildConnectConfig(session, secret), sock: stream })
        return
      }
      if (!opts?.onJumpShell) {
        fail(new Error(`跳板无法转到目标机: ${error?.message ?? '未知原因'}`))
        return
      }
      jump.shell({ term: 'xterm-256color', cols: opts.cols ?? 80, rows: opts.rows ?? 24 }, (shellError, shell) => {
        if (shellError || !shell) {
          fail(new Error(`跳板无法转到目标机: ${error?.message ?? shellError?.message ?? '未知原因'}`))
          return
        }
        loginTargetFromJump(shell, session, secret)
        opts.onJumpShell?.(shell)
      })
    })
  })
  client.on('close', () => jump.end())
  jump.connect({
    host: jumpHost,
    port: session.jumpPort || 22,
    username: jumpUser,
    password: jumpPassword ?? undefined,
    tryKeyboard: true,
    readyTimeout: 20000,
    keepaliveInterval: 15000
  })
  return jump
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
