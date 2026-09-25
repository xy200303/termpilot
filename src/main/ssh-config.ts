import { readFileSync } from 'node:fs'
import { Client, type ConnectConfig } from 'ssh2'
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
 */
export function dialSsh(session: SessionConfig, secret: string | null, jumpSecret: string | null, client: Client): Client | undefined {
  const jumpHost = session.jumpHost?.trim()
  if (!jumpHost) {
    client.connect(buildConnectConfig(session, secret))
    return undefined
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
    finish(prompts.map(() => jumpSecret ?? ''))
  })
  jump.on('error', (error) => fail(new Error(`跳板连接失败: ${error.message}`)))
  jump.on('ready', () => {
    jump.forwardOut('127.0.0.1', 0, session.host, session.port || 22, (error, stream) => {
      if (error) {
        fail(new Error(`跳板无法转到目标机: ${error.message}`))
        return
      }
      client.connect({ ...buildConnectConfig(session, secret), sock: stream })
    })
  })
  client.on('close', () => jump.end())
  jump.connect({
    host: jumpHost,
    port: session.jumpPort || 22,
    username: session.jumpUsername,
    password: jumpSecret ?? undefined,
    tryKeyboard: true,
    readyTimeout: 20000,
    keepaliveInterval: 15000
  })
  return jump
}
