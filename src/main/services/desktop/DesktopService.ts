import { spawn, type ChildProcess } from 'node:child_process'
import { t as mt } from '../../i18n'
import type { WebContents } from 'electron'
import { IPC } from '../../../shared/ipc-channels'
import { protocolLabel, type DesktopProtocol } from '../../../shared/protocol'
import type { DesktopMetrics, DesktopOpenResult, DesktopStatusEvent, SessionConfig } from '../../../shared/types'
import type { StorageService } from '../StorageService'
import { VncBridge } from './VncBridge'
import { RdpBridge } from './RdpBridge'

interface NativeSession {
  child: ChildProcess
  output: string
}

/** VNC / RDP 内嵌，RDP 也可使用原生客户端。 */
export class DesktopService {
  private bridges = new Map<string, VncBridge>()
  private rdpBridges = new Map<string, RdpBridge>()
  private native = new Map<string, NativeSession>()
  private sessions = new Map<string, string>()

  constructor(
    private storage: StorageService,
    private sender: () => WebContents | null
  ) {}

  list(): Array<{ viewId: string; sessionId: string; protocol: string; mode: 'embedded' | 'external' }> {
    return [...this.sessions].map(([viewId, sessionId]) => {
      const session = this.storage.list().find((item) => item.id === sessionId)
      return {
        viewId,
        sessionId,
        protocol: session?.protocol ?? 'unknown',
        mode: session?.protocol === 'vnc' || (session?.protocol === 'rdp' && !session.desktopOptions?.nativeClient) ? 'embedded' as const : 'external' as const
      }
    })
  }

  protocolOf(viewId: string): string | null {
    return this.sessionOf(viewId)?.protocol ?? null
  }

  sessionOf(viewId: string): SessionConfig | null {
    const sessionId = this.sessions.get(viewId)
    return this.storage.list().find((item) => item.id === sessionId) ?? null
  }

  nativePid(viewId: string): number | null {
    return this.native.get(viewId)?.child.pid ?? null
  }

  metrics(viewId: string): DesktopMetrics | null {
    const session = this.sessionOf(viewId)
    if (!session) return null
    const traffic = this.bridges.get(viewId)?.metrics() ?? this.rdpBridges.get(viewId)?.metrics()
    const mode = session.protocol === 'vnc' || (session.protocol === 'rdp' && !session.desktopOptions?.nativeClient) ? 'embedded' : 'external'
    return {
      viewId,
      protocol: session.protocol,
      mode,
      bytesIn: traffic?.bytesIn ?? 0,
      bytesOut: traffic?.bytesOut ?? 0,
      kbpsIn: traffic?.kbpsIn ?? 0,
      kbpsOut: traffic?.kbpsOut ?? 0,
      packetsIn: traffic?.packetsIn ?? 0,
      packetsOut: traffic?.packetsOut ?? 0
    }
  }

  async open(viewId: string, sessionId: string): Promise<DesktopOpenResult> {
    const session = this.storage.list().find((item) => item.id === sessionId)
    if (!session) throw new Error(mt('desktop.connection_missing'))
    const opened = [...this.sessions.entries()].find(([otherId, id]) => id === sessionId && otherId !== viewId)
    if (opened) this.close(opened[0])
    if (this.sessions.get(viewId) === sessionId) {
      const vncUrl = this.bridges.get(viewId)?.url
      if (vncUrl) return { mode: 'embedded', url: vncUrl, password: this.storage.getSecret(sessionId) ?? undefined }
      const rdpUrl = this.rdpBridges.get(viewId)?.url
      if (rdpUrl) return { mode: 'embedded', url: rdpUrl, password: this.storage.getSecret(sessionId) ?? undefined }
    }
    this.close(viewId)
    this.sessions.set(viewId, sessionId)
    try {
      if (session.protocol === 'vnc') return await this.openVnc(viewId, session)
      if (session.protocol === 'rdp') return await this.openRdp(viewId, session)
      throw new Error(mt('desktop.not_desktop', { protocol: mt(protocolLabel(session.protocol)) }))
    } catch (error) {
      this.sessions.delete(viewId)
      const message = error instanceof Error ? error.message : String(error)
      this.status(viewId, sessionId, 'error', message)
      throw error
    }
  }

  private async openVnc(viewId: string, session: SessionConfig): Promise<DesktopOpenResult> {
    const bridge = new VncBridge(viewId, (status, message) => this.status(viewId, session.id, status, message))
    const url = await bridge.open(session.host, session.port || 5900)
    this.bridges.set(viewId, bridge)
    return { mode: 'embedded', url, password: this.storage.getSecret(session.id) ?? undefined }
  }

  private async openRdp(viewId: string, session: SessionConfig): Promise<DesktopOpenResult> {
    if (!session.desktopOptions?.nativeClient) {
      const bridge = new RdpBridge(viewId, (status, message) => this.status(viewId, session.id, status, message))
      const url = await bridge.open()
      this.rdpBridges.set(viewId, bridge)
      return { mode: 'embedded', url, password: this.storage.getSecret(session.id) ?? undefined }
    }
    const args = [`/v:${session.host}:${session.port || 3389}`, '/dynamic-resolution', '/clipboard']
    if (session.username) args.push(`/u:${session.username}`)
    const width = session.desktopOptions?.width
    const height = session.desktopOptions?.height
    if (width && height) args.push(`/size:${width}x${height}`)
    const message = await this.spawnNative(viewId, session, args)
    return { mode: 'external', message }
  }

  private async spawnNative(viewId: string, session: SessionConfig, args: string[]): Promise<string> {
    let lastError = ''
    for (const command of rdpCandidates()) {
      try {
        const message = await this.startProcess(viewId, session, command, args)
        return message
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        if (!lastError.includes('ENOENT')) throw error
      }
    }
    throw new Error(mt('desktop.freerdp_missing'))
  }

  private startProcess(viewId: string, session: SessionConfig, command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
      const state: NativeSession = { child, output: '' }
      const collect = (chunk: Buffer) => {
        state.output = `${state.output}${chunk.toString()}`.slice(-4000)
      }
      child.stdout?.on('data', collect)
      child.stderr?.on('data', collect)
      child.once('error', (error) => reject(error))
      child.once('spawn', () => {
        this.native.set(viewId, state)
        this.status(viewId, session.id, 'connected')
        resolve(mt('desktop.freerdp_opened', { command }))
      })
      child.on('exit', (code) => {
        this.native.delete(viewId)
        this.sessions.delete(viewId)
        const tail = state.output.trim().slice(-1200)
        const failed = code !== 0 && code !== null
        this.status(
          viewId,
          session.id,
          failed ? 'error' : 'disconnected',
          failed ? mt('desktop.client_exited', { code, tail: tail ? `\n${tail}` : '' }) : mt('desktop.window_closed')
        )
      })
    })
  }

  close(viewId: string): void {
    this.bridges.get(viewId)?.close()
    this.bridges.delete(viewId)
    this.rdpBridges.get(viewId)?.close()
    this.rdpBridges.delete(viewId)
    this.native.get(viewId)?.child.kill()
    this.native.delete(viewId)
    const sessionId = this.sessions.get(viewId)
    this.sessions.delete(viewId)
    if (sessionId) this.status(viewId, sessionId, 'disconnected')
  }

  closeSession(sessionId: string): number {
    let count = 0
    for (const [viewId, id] of [...this.sessions]) {
      if (id !== sessionId) continue
      this.close(viewId)
      count++
    }
    return count
  }

  dispose(): void {
    for (const viewId of [...this.sessions.keys()]) this.close(viewId)
  }

  private status(viewId: string, sessionId: string, status: DesktopStatusEvent['status'], message?: string): void {
    const wc = this.sender()
    if (!wc || wc.isDestroyed()) return
    const event: DesktopStatusEvent = { viewId, sessionId, status, message }
    wc.send(IPC.desktopStatus, event)
  }
}

function rdpCandidates(): string[] {
  const custom = process.env.TERMPILOT_FREERDP
  if (custom) return [custom]
  if (process.platform === 'win32') return ['wfreerdp.exe', 'wfreerdp', 'xfreerdp.exe']
  return ['xfreerdp', 'freerdp']
}
