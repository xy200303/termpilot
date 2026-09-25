import { Client } from 'ssh2'
import type { SessionConfig } from '../../shared/types'
import { dialSsh, endJump } from '../ssh-config'

/** 一条已经连到目标机的 SSH 会话。终端和文件树各算一次引用。 */
export interface SshHold {
  client: Client
  release: () => void
}

interface Slot {
  client: Client
  jump?: Client
  refs: number
  ready: Promise<void>
}

/**
 * 同一个保存的连接只拨号一次。
 * 跳板只转发这一条到目标机的隧道，shell 和 SFTP 都在这条会话上开通道。
 */
export class SshPool {
  private slots = new Map<string, Slot>()

  /**
   * 另拨一条连接，不放进共用池。
   * 改过 sshd 子系统之后，原来那条会话仍按登录时的配置执行 SFTP。
   */
  acquireIsolated(session: SessionConfig, secret: string | null, jumpSecret: string | null): Promise<SshHold> {
    const client = new Client()
    let jump: Client | undefined
    return new Promise((resolve, reject) => {
      let settled = false
      const fail = (error: Error) => {
        if (settled) return
        settled = true
        try {
          client.end()
          endJump(jump)
        } catch {
          /* 会话还没建立 */
        }
        reject(error)
      }
      client.once('ready', () => {
        if (settled) return
        settled = true
        resolve({
          client,
          release: () => {
            try {
              client.end()
              endJump(jump)
            } catch {
              /* 会话已经断了 */
            }
          }
        })
      })
      client.once('error', (error) => {
        fail(error instanceof Error ? error : new Error(String(error)))
      })
      try {
        jump = dialSsh(session, secret, jumpSecret, client)
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  acquire(session: SessionConfig, secret: string | null, jumpSecret: string | null): Promise<SshHold> {
    const existing = this.slots.get(session.id)
    if (existing) {
      existing.refs += 1
      const hold = this.hold(session.id, existing)
      return existing.ready.then(() => hold).catch((error: unknown) => {
        hold.release()
        throw error
      })
    }

    const client = new Client()
    let resolveReady: () => void = () => undefined
    let rejectReady: (error: Error) => void = () => undefined
    const slot: Slot = {
      client,
      refs: 1,
      ready: new Promise<void>((resolve, reject) => {
        resolveReady = resolve
        rejectReady = reject
      })
    }
    this.slots.set(session.id, slot)

    let settled = false
    const fail = (error: Error) => {
      if (settled) return
      settled = true
      if (this.slots.get(session.id) === slot) this.slots.delete(session.id)
      rejectReady(error)
    }
    client.once('ready', () => {
      if (settled) return
      settled = true
      resolveReady()
    })
    client.once('error', (error) => {
      fail(error instanceof Error ? error : new Error(String(error)))
    })
    client.on('close', () => {
      if (this.slots.get(session.id) === slot) this.slots.delete(session.id)
      fail(new Error('连接已断开'))
    })

    try {
      slot.jump = dialSsh(session, secret, jumpSecret, client)
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)))
    }

    const hold = this.hold(session.id, slot)
    return slot.ready.then(() => hold).catch((error: unknown) => {
      hold.release()
      throw error
    })
  }

  private hold(sessionId: string, slot: Slot): SshHold {
    let released = false
    return {
      client: slot.client,
      release: () => {
        if (released) return
        released = true
        slot.refs -= 1
        if (slot.refs > 0) return
        if (this.slots.get(sessionId) === slot) this.slots.delete(sessionId)
        try {
          slot.client.end()
          endJump(slot.jump)
        } catch {
          /* 会话已经断了 */
        }
      }
    }
  }
}
