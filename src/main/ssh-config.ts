import { readFileSync } from 'node:fs'
import type { ConnectConfig } from 'ssh2'
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
