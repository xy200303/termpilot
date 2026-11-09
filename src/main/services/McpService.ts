import { randomUUID, timingSafeEqual } from 'node:crypto'
import { isConnId, isTermId, newTermId, newViewId } from '../../shared/ids'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { WebContents } from 'electron'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { parseToolArgs, schemaText, TOOLS, toolsText } from './tool-catalog'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { t as mt } from '../i18n'
import { pruneScreenshots } from './screenshotFiles'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { IPC } from '../../shared/ipc-channels'
import { renderGrid } from './desktop/gridRender'
import { canonicalKey, encodeTermInput, TERM_KEYS } from '../../shared/term-keys'
import type { CaptureReply, RecordReply, TermLinesReply, TermModeReply } from '../../shared/types'
import {
  MCP_DEFAULT_PORT,
  MCP_HOST,
  type AuthType,
  type ConnectMode,
  type DesktopOptions,
  type McpRuntime,
  type McpSettings,
  type SessionConfig,
  type SessionInput,
  type SftpMode
} from '../../shared/types'
import type { ExecService } from './ExecService'
import type { ReverseListenerService } from './ReverseListenerService'
import type { SftpService } from './SftpService'
import type { StorageService } from './StorageService'
import type { TerminalService } from './TerminalService'
import type { DesktopService } from './desktop/DesktopService'
import type { DesktopAgentService } from './desktop/DesktopAgentService'
import { LinuxAccessibilityService } from './desktop/LinuxAccessibilityService'
import type { DesktopAgentInput, DesktopRegion } from '../../shared/desktop-agent'
import { listSerialPorts } from './transport/serial'
import { capabilitiesOf, defaultPort, isDesktopProtocol, protocolLabel, TELNET_DEFAULT_PORT } from '../../shared/protocol'
import type { SerialParity, SessionProtocol } from '../../shared/protocol'

const SENSITIVE = /^(\/etc|\/boot|\/bin|\/sbin|\/usr|\/dev|\/sys|\/proc)(\/|$)|^[A-Za-z]:\\Windows\\/i

const DANGEROUS =
  /(?:^|[;&|`\n])\s*(?:sudo\s+)?(rm|rmdir|mkfs|dd|shutdown|reboot|poweroff|halt)\b|chmod\s+[^\n]*-[^\n]*R|chown\s+[^\n]*-[^\n]*R|>\s*\/(?:dev|etc)\b/i

type SessionPatch = {
  protocol?: SessionProtocol
  name?: string
  mode?: ConnectMode
  host?: string
  port?: number
  username?: string
  authType?: AuthType
  keyPath?: string
  secret?: string
  serialPath?: string
  baudRate?: number
  dataBits?: number
  stopBits?: number
  parity?: SerialParity
  jumpHost?: string
  jumpPort?: number
  jumpUsername?: string
  jumpSecret?: string
  listenPort?: number
  sftpMode?: SftpMode
  desktopOptions?: DesktopOptions
  group?: string
  remark?: string
}

/**
 * 本机 MCP 服务。只绑 127.0.0.1，每个请求都要带 Bearer 令牌。
 * 工具和界面走同一套终端 / SFTP，Agent 连上的会话会出现在标签栏。
 */
export class McpService {
  private http: Server | null = null
  private transports = new Map<string, StreamableHTTPServerTransport>()
  private confirms = new Map<string, (ok: boolean) => void>()
  private captures = new Map<string, (result: CaptureReply) => void>()
  private recordStarts = new Map<string, { resolve: () => void; reject: (error: Error) => void }>()
  private recording: {
    id: string
    startedAt: number
    endedAt?: number
    saved?: string
    pendingStop?: { resolve: (file: string) => void; reject: (error: Error) => void }
  } | null = null
  private lineReads = new Map<string, (result: TermLinesReply) => void>()
  private modeReads = new Map<string, (result: TermModeReply) => void>()
  private token = ''
  private runtime: McpRuntime = { running: false, port: MCP_DEFAULT_PORT, clients: 0 }
  private accessibility: LinuxAccessibilityService

  constructor(
    private storage: StorageService,
    private terminal: TerminalService,
    private sftp: SftpService,
    private exec2: ExecService,
    private reverse: ReverseListenerService,
    private getSender: () => WebContents | null,
    private desktop: DesktopService,
    private desktopAgent: DesktopAgentService
  ) {
    this.accessibility = new LinuxAccessibilityService(storage, exec2, desktop)
  }

  state(): McpRuntime {
    return this.runtime
  }

  async apply(settings: McpSettings): Promise<void> {
    await this.stop()
    if (!settings.enabled) {
      this.publish({ running: false, port: settings.port, clients: 0 })
      console.log('[TermPilot] MCP disabled')
      return
    }
    this.token = settings.token
    try {
      await this.listen(settings.port)
      this.publish({ running: true, port: settings.port, clients: 0 })
      console.log(`[TermPilot] MCP listening on http://${MCP_HOST}:${settings.port}/mcp`)
    } catch (error) {
      const message = listenError(error, settings.port)
      this.publish({ running: false, port: settings.port, clients: 0, error: message })
      throw new Error(message)
    }
  }

  async stop(): Promise<void> {
    const closing = [...this.transports.values()].map((transport) => transport.close().catch(() => undefined))
    this.transports.clear()
    await Promise.all(closing)
    for (const [id, settle] of this.confirms) {
      this.confirms.delete(id)
      settle(false)
    }
    for (const [id, settle] of this.captures) {
      this.captures.delete(id)
      settle({ id, error: mt('mcp.shutting_down') })
    }
    for (const [id, settle] of this.lineReads) {
      this.lineReads.delete(id)
      settle({ id, error: mt('mcp.shutting_down') })
    }
    for (const [id, settle] of this.modeReads) {
      this.modeReads.delete(id)
      settle({ id, error: mt('mcp.shutting_down') })
    }
    const http = this.http
    this.http = null
    if (!http) return
    http.closeAllConnections?.()
    await new Promise<void>((resolve) => http.close(() => resolve()))
  }

  resolveCapture(result: CaptureReply): void {
    const settle = this.captures.get(result.id)
    if (!settle) return
    this.captures.delete(result.id)
    settle(result)
  }

  resolveRecord(reply: RecordReply): void {
    if (reply.phase === 'started') {
      const start = this.recordStarts.get(reply.id)
      this.recordStarts.delete(reply.id)
      start?.resolve()
      return
    }
    if (reply.phase === 'error') {
      const start = this.recordStarts.get(reply.id)
      if (start) {
        this.recordStarts.delete(reply.id)
        this.recording = null
        start.reject(new Error(reply.error))
        return
      }
      const rec = this.recording
      if (rec?.id === reply.id) {
        this.recording = null
        rec.pendingStop?.reject(new Error(reply.error))
      }
      return
    }
    const rec = this.recording
    if (!rec || rec.id !== reply.id) return
    rec.endedAt = Date.now()
    try {
      rec.saved = saveRecording(reply.data, reply.mime)
      if (rec.pendingStop) {
        const pending = rec.pendingStop
        rec.pendingStop = undefined
        this.recording = null
        pending.resolve(rec.saved)
      }
    } catch (error) {
      const pending = rec.pendingStop
      this.recording = null
      pending?.reject(error instanceof Error ? error : new Error(String(error)))
    }
  }

  resolveLines(result: TermLinesReply): void {
    const settle = this.lineReads.get(result.id)
    if (!settle) return
    this.lineReads.delete(result.id)
    settle(result)
  }

  resolveMode(result: TermModeReply): void {
    const settle = this.modeReads.get(result.id)
    if (!settle) return
    this.modeReads.delete(result.id)
    settle(result)
  }

  resolveConfirm(id: string, ok: boolean): void {
    const settle = this.confirms.get(id)
    if (!settle) return
    this.confirms.delete(id)
    settle(ok)
  }

  private publish(next: McpRuntime): void {
    this.runtime = next
    const wc = this.getSender()
    if (!wc || wc.isDestroyed()) return
    wc.send(IPC.mcpStateEvent, next)
  }

  private publishClients(): void {
    this.publish({ ...this.runtime, clients: this.transports.size, error: undefined })
  }

  private listen(port: number): Promise<void> {
    const http = createServer((req, res) => {
      void this.onRequest(req, res, port)
    })
    this.http = http
    return new Promise((resolve, reject) => {
      http.once('error', reject)
      http.listen(port, MCP_HOST, () => {
        http.off('error', reject)
        resolve()
      })
    })
  }

  private async onRequest(req: IncomingMessage, res: ServerResponse, port: number): Promise<void> {
    try {
      if (!hostAllowed(req, port) || !loopback(req)) {
        sendJson(res, 403, rpcError('Forbidden'))
        return
      }
      if (!authorized(header(req, 'authorization'), this.token)) {
        sendJson(res, 401, rpcError('Unauthorized'))
        return
      }
      const path = (req.url ?? '/').split('?')[0]
      if (path === '/cli') {
        await this.onCli(req, res)
        return
      }
      if (req.method !== 'POST' && req.method !== 'GET' && req.method !== 'DELETE') {
        sendJson(res, 405, rpcError('Method not allowed'))
        return
      }

      const sessionId = header(req, 'mcp-session-id')
      let parsed: unknown
      if (req.method === 'POST') {
        const raw = await readBody(req)
        if (raw) {
          try {
            parsed = JSON.parse(raw)
          } catch {
            sendJson(res, 400, rpcError('Invalid JSON'))
            return
          }
        }
      }

      let transport = sessionId ? this.transports.get(sessionId) : undefined
      if (sessionId && !transport) {
        sendJson(res, 404, rpcError('Session not found'))
        return
      }
      if (!transport) {
        if (req.method !== 'POST' || !isInitializeRequest(parsed)) {
          sendJson(res, 400, rpcError('No valid session ID'))
          return
        }
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            this.transports.set(id, transport!)
            this.publishClients()
          }
        })
        transport.onclose = () => {
          const id = transport?.sessionId
          if (id) this.transports.delete(id)
          this.publishClients()
        }
        const server = this.createServer()
        await server.connect(transport)
      }
      await transport.handleRequest(req, res, parsed)
    } catch (error) {
      console.error('[TermPilot] MCP request failed:', error)
      if (!res.headersSent) sendJson(res, 500, rpcError('Internal server error'))
    }
  }

  private createServer(): McpServer {
    const server = new McpServer({ name: 'termpilot', version: '0.1.0' })
    for (const tool of TOOLS) {
      server.registerTool(
        tool.name,
        {
          description: tool.description,
          ...(tool.readOnly ? { annotations: { readOnlyHint: true as const } } : {}),
          ...(tool.input ? { inputSchema: tool.input } : {})
        },
        async (args) => {
          const input = (args ?? {}) as Record<string, unknown>
          const work = () => this.invoke(tool.name, input)
          if (!tool.images) return this.run(tool.name, auditDetail(input), work)
          const ranged = input.startLine !== undefined || input.endLine !== undefined
          const attach = tool.images === 'always' || ranged
          return this.shot(tool.name, auditDetail(input), attach, work)
        }
      )
    }
    return server
  }

  private async invoke(tool: string, raw: Record<string, unknown>): Promise<string> {
    switch (tool) {
      case 'connection_list':
        return JSON.stringify(this.storage.list().map((session) => this.connectionView(session)), null, 2)
      case 'connection_open':
        return this.connectSession(need(raw, 'connection'))
      case 'connection_close':
        return this.disconnectSession(need(raw, 'connection'))
      case 'desktop_close': {
        const viewId = need(raw, 'viewId')
        const found = this.desktop.list().find((item) => item.viewId === viewId)
        if (!found) throw new Error(mt('desktop.missing'))
        this.desktop.close(viewId)
        this.send(IPC.mcpCloseTab, viewId)
        return mt('mcp.desktop_closed', { id: viewId })
      }
      case 'connection_create':
        return this.createSession({ name: need(raw, 'name'), ...sessionPatch(raw) })
      case 'connection_update':
        return this.updateSession(need(raw, 'connection'), { name: textArg(raw, 'name'), ...sessionPatch(raw) })
      case 'connection_delete':
        return this.deleteSession(need(raw, 'connection'))
      case 'term_list':
        return JSON.stringify(this.listOpenTerms(), null, 2)
      case 'term_update': {
        const termId = this.requireTerm(need(raw, 'termId'))
        const remark = textArg(raw, 'remark')
        this.terminal.setLabel(termId, { remark })
        return mt('mcp.note_written')
      }
      case 'term_reconnect':
        return this.reconnectTerm(need(raw, 'termId'))
      case 'term_exec': {
        const found = this.requireCapability(need(raw, 'connection'), 'exec')
        const command = need(raw, 'command')
        await this.guard(command)
        const run = await this.exec2.exec(found.id, {
          command,
          session: textArg(raw, 'session'),
          prelude: textArg(raw, 'prelude'),
          timeoutMs: (intArg(raw, 'timeout') ?? 20) * 1000,
          maxBytes: intArg(raw, 'maxBytes') ?? 50_000
        })
        return JSON.stringify(run)
      }
      case 'term_pty': {
        const termId = this.requireLive(need(raw, 'termId'))
        let command = need(raw, 'command')
        if (!command.endsWith('\n')) command += '\n'
        await this.guard(command)
        const run = await this.terminal.execCommand(termId, command, (intArg(raw, 'timeout') ?? 20) * 1000)
        const output = clipCommand(agentText(run.output))
        if (run.finished && run.exitCode !== null) return `${output}\n\nexit code: ${run.exitCode}`
        if (run.finished) return output
        return mt('mcp.cmd_still_running', { output })
      }
      case 'term_write':
        return this.writeTerm(raw)
      case 'term_close': {
        const termId = this.requireTerm(need(raw, 'termId'))
        this.terminal.close(termId)
        this.send(IPC.mcpCloseTab, termId)
        return mt('mcp.closed')
      }
      case 'term_open_local':
        return this.openLocal()
      case 'term_lines':
        return this.lines(this.requireTerm(need(raw, 'termId')), intArg(raw, 'startLine'), intArg(raw, 'endLine'))
      case 'term_screenshot': {
        const shot = lineShot(raw)
        const scope = textArg(raw, 'scope') ?? 'viewport'
        if (scope !== 'viewport' && scope !== 'buffer') throw new Error(mt('mcp.err_scope'))
        const termId = this.requireTerm(shot.termId)
        if (shot.ranged) return this.capture(termId, 'scrollback', shot.startLine, shot.endLine, true)
        return scope === 'buffer'
          ? this.capture(termId, 'scrollback', undefined, undefined, false)
          : this.capture(termId, 'viewport')
      }
      case 'serial_list':
        return JSON.stringify(await listSerialPorts(), null, 2)
      case 'sftp_list': {
        const found = this.requireCapability(need(raw, 'connection'), 'sftp')
        const listed = await this.sftp.list(found.id, textArg(raw, 'path') || '.')
        return JSON.stringify(listed, null, 2)
      }
      case 'sftp_mkdir': {
        const path = need(raw, 'path')
        const found = this.requireCapability(need(raw, 'connection'), 'sftp')
        await this.guardPath(path)
        await this.sftp.mkdirPath(found.id, path)
        return mt('mcp.created', { path })
      }
      case 'sftp_upload': {
        const remotePath = need(raw, 'remotePath')
        const found = this.requireCapability(need(raw, 'connection'), 'sftp')
        await this.guardPath(remotePath)
        await this.sftp.put(found.id, need(raw, 'localPath'), remotePath)
        return mt('mcp.uploaded', { path: remotePath })
      }
      case 'sftp_download': {
        const localPath = need(raw, 'localPath')
        const found = this.requireCapability(need(raw, 'connection'), 'sftp')
        await this.sftp.get(found.id, need(raw, 'remotePath'), localPath)
        return mt('mcp.downloaded', { path: localPath })
      }
      case 'sftp_rename': {
        const to = need(raw, 'to')
        const found = this.requireCapability(need(raw, 'connection'), 'sftp')
        await this.guardPath(to)
        await this.sftp.rename(found.id, need(raw, 'from'), to)
        return mt('mcp.renamed', { to })
      }
      case 'sftp_remove': {
        const path = need(raw, 'path')
        const kind = need(raw, 'kind')
        if (kind !== 'file' && kind !== 'dir' && kind !== 'link') throw new Error(mt('mcp.err_kind'))
        const found = this.requireCapability(need(raw, 'connection'), 'sftp')
        await this.guard(`rm ${path}`)
        await this.sftp.remove(found.id, path, kind)
        return mt('mcp.removed', { path })
      }
      case 'desktop_list':
        return JSON.stringify(this.desktopAgent.list(), null, 2)
      case 'desktop_screenshot':
        return this.desktopAgent.run(need(raw, 'viewId'), {
          action: 'screenshot',
          grid: desktopGrid(raw),
          region: desktopRegion(raw)
        })
      case 'desktop_click':
        return this.desktopAgent.run(need(raw, 'viewId'), {
          action: 'click',
          x: intArg(raw, 'x') ?? 0,
          y: intArg(raw, 'y') ?? 0,
          button: desktopButton(raw),
          double: boolArg(raw, 'double'),
          ...desktopScaleSource(raw)
        })
      case 'desktop_key':
        return this.desktopAgent.run(need(raw, 'viewId'), { action: 'key', keys: need(raw, 'keys') })
      case 'desktop_type':
        return this.desktopAgent.run(need(raw, 'viewId'), {
          action: 'type',
          text: need(raw, 'text'),
          ...desktopTypeOptions(raw)
        })
      case 'desktop_scroll':
        return this.desktopAgent.run(need(raw, 'viewId'), {
          action: 'scroll',
          x: intArg(raw, 'x'),
          y: intArg(raw, 'y'),
          deltaY: intArg(raw, 'deltaY') ?? 0,
          ...desktopScaleSource(raw)
        })
      case 'desktop_wait':
        return this.desktopAgent.run(need(raw, 'viewId'), {
          action: 'wait',
          ms: intArg(raw, 'ms'),
          stableMs: intArg(raw, 'stableMs'),
          timeoutMs: intArg(raw, 'timeoutMs')
        })
      case 'desktop_actions': {
        if (!Array.isArray(raw.actions) || raw.actions.length === 0) throw new Error(mt('mcp.err_actions_empty'))
        const actions = raw.actions.map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(mt('mcp.err_actions_item'))
          return desktopAction(item as Record<string, unknown>)
        })
        return this.desktopAgent.runMany(need(raw, 'viewId'), actions)
      }
      case 'desktop_perf': {
        const id = textArg(raw, 'viewId')
        if (id) return JSON.stringify(this.desktop.metrics(id), null, 2)
        return JSON.stringify(this.desktop.list().map((item) => this.desktop.metrics(item.viewId)), null, 2)
      }
      case 'desktop_a11y': {
        const operation = textArg(raw, 'operation') || 'tree'
        if (operation !== 'tree' && operation !== 'click') throw new Error(mt('mcp.err_operation'))
        if (operation === 'click' && !textArg(raw, 'path')) throw new Error(mt('mcp.err_a11y_path'))
        return this.accessibility.run(need(raw, 'viewId'), operation, textArg(raw, 'path'), textArg(raw, 'action'))
      }
      case 'app_screenshot':
        return this.appShot(desktopGrid(raw))
      case 'app_record': {
        const action = textArg(raw, 'action') || 'start'
        if (action === 'start') {
          return this.startRecording(intArg(raw, 'fps') ?? 15, intArg(raw, 'maxSeconds') ?? 120)
        }
        if (action === 'stop') return this.stopRecording()
        throw new Error(mt('mcp.err_record_action'))
      }
      default:
        throw new Error(mt('mcp.err_unknown_tool', { tool }))
    }
  }

  private async reconnectTerm(termId: string): Promise<string> {
    const id = this.requireTerm(termId)
    const current = this.terminal.listTerms().find((term) => term.id === id)
    if (current?.status === 'connected') return mt('mcp.term_already', { id })
    await this.terminal.reconnect(id)
    const session = this.storage.list().find((item) => item.id === current?.sessionId)
    return [
      mt('mcp.term_reconnected', { id }),
      session ? mt('mcp.connection_line', { id: session.publicId, name: session.name }) : '',
      mt('mcp.reconnect_note')
    ]
      .filter(Boolean)
      .join('\n')
  }

  private async writeTerm(raw: Record<string, unknown>): Promise<string> {
    const termId = this.requireLive(need(raw, 'termId'))
    const keys = keyArg(raw)
    const text = textArg(raw, 'text')
    const data = textArg(raw, 'data')
    const submit = boolArg(raw, 'submit')
    if (!keys?.length && !text && !data && !submit) throw new Error(mt('mcp.need_input'))
    const applicationCursor = keys?.some((key) => MOVES.has(key)) ? await this.cursorMode(termId) : false
    const payload = encodeTermInput({ keys, text, data, submit, applicationCursor })
    if (!payload) throw new Error(mt('mcp.nothing_to_send'))
    if (payload.includes('\n') || payload.includes('\r')) await this.guard(payload)
    this.terminal.input(termId, payload)
    await wait(200)
    try {
      return await this.lines(termId)
    } catch {
      return mt('mcp.sent')
    }
  }

  private async onCli(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, text: mt('mcp.err_post_only') })
      return
    }
    let body: { op?: unknown; tool?: unknown; args?: unknown }
    try {
      body = JSON.parse((await readBody(req)) || '{}') as { op?: unknown; tool?: unknown; args?: unknown }
    } catch {
      sendJson(res, 400, { ok: false, text: 'Invalid JSON' })
      return
    }
    if (body.op === 'tools') {
      sendJson(res, 200, { ok: true, text: toolsText() })
      return
    }
    if (body.op === 'schema') {
      try {
        sendJson(res, 200, { ok: true, text: schemaText(typeof body.tool === 'string' ? body.tool : undefined) })
      } catch (error) {
        sendJson(res, 200, { ok: false, text: error instanceof Error ? error.message : mt('mcp.failed') })
      }
      return
    }
    if (body.op !== 'call' || typeof body.tool !== 'string' || !body.tool) {
      sendJson(res, 400, { ok: false, text: mt('mcp.err_op') })
      return
    }
    const raw =
      body.args && typeof body.args === 'object' && !Array.isArray(body.args)
        ? (body.args as Record<string, unknown>)
        : {}
    let args: Record<string, unknown>
    try {
      args = parseToolArgs(body.tool, raw)
    } catch (error) {
      sendJson(res, 200, { ok: false, text: error instanceof Error ? error.message : mt('mcp.err_params') })
      return
    }
    const result = await this.run(body.tool, auditDetail(args) || body.tool, () => this.invoke(body.tool as string, args))
    const text = result.content[0]?.text ?? ''
    sendJson(res, 200, { ok: result.isError !== true, text })
  }

  private async connectSession(key: string): Promise<string> {
    const session = this.findSession(key)
    if (session.mode === 'reverse') throw new Error(mt('mcp.reverse_manual'))
    if (isDesktopProtocol(session.protocol)) {
      const existing = this.desktop.list().find((item) => item.sessionId === session.id)
      if (existing) {
        return [
          mt('mcp.desktop_already', { id: session.publicId, name: session.name }),
          mt('mcp.desktop_line', { id: existing.viewId }),
          mt('mcp.desktop_reuse', { protocol: session.protocol.toUpperCase() }),
          mt('mcp.desktop_hint')
        ].join('\n')
      }
      const viewId = newViewId()
      this.send(IPC.mcpOpenTab, { termId: viewId, sessionId: session.id, kind: session.protocol, title: mt('mcp.desktop_title') })
      try {
        const result = await this.desktop.open(viewId, session.id)
        return [
          mt('mcp.connection_opened', { id: session.publicId, name: session.name }),
          mt('mcp.desktop_line', { id: viewId }),
          result.mode === 'embedded' ? mt('mcp.desktop_embedded', { protocol: session.protocol.toUpperCase() }) : result.message,
          mt('mcp.desktop_hint')
        ].join('\n')
      } catch (error) {
        this.send(IPC.mcpCloseTab, viewId)
        throw error
      }
    }
    const n = this.terminal.listTerms().filter((term) => term.sessionId === session.id).length + 1
    const title = mt('mcp.window_number', { n })
    const termId = newTermId()
    const bound = this.terminal.expectBind(termId, 8000)
    this.send(IPC.mcpOpenTab, { termId, sessionId: session.id, kind: 'ssh', title })
    try {
      await bound
    } catch (error) {
      this.send(IPC.mcpCloseTab, termId)
      throw error
    }
    const connected = this.terminal.waitStatus(termId, 20_000)
    await this.terminal.create({ termId, kind: 'ssh', sessionId: session.id, cols: 120, rows: 32, title })
    try {
      await connected
    } catch (error) {
      this.terminal.close(termId)
      this.send(IPC.mcpCloseTab, termId)
      throw error
    }
    return [
      mt('mcp.connection_opened', { id: session.publicId, name: session.name }),
      mt('mcp.term_line', { id: termId }),
      mt('mcp.title_line', { title }),
      mt('mcp.term_hint')
    ].join('\n')
  }

  private createSession(input: SessionPatch & { name: string }): string {
    const saved = this.storage.create(this.normalize(null, input, true))
    this.publishSessions()
    return JSON.stringify(this.connectionView(saved), null, 2)
  }

  private updateSession(key: string, patch: SessionPatch): string {
    const current = this.findSession(key)
    const saved = this.storage.update(current.id, this.normalize(current, patch, false))
    if (!saved) throw new Error(mt('mcp.connection_gone'))
    this.publishSessions()
    return JSON.stringify(this.connectionView(saved), null, 2)
  }

  private async deleteSession(key: string): Promise<string> {
    const session = this.findSession(key)
    if (this.storage.getMcpSettings().confirmDangerous) {
      const ok = await this.ask(mt('mcp.delete_connection', { name: session.name }))
      if (!ok) throw new Error(mt('mcp.cancelled_delete'))
    }
    this.disconnectById(session)
    if (session.mode === 'reverse') this.reverse.stop(session.id)
    this.storage.delete(session.id)
    this.publishSessions()
    return mt('mcp.deleted_connection', { name: session.name })
  }

  private normalize(current: SessionConfig | null, patch: SessionPatch, creating: boolean): SessionInput {
    const protocol = patch.protocol ?? current?.protocol ?? 'ssh'
    const protocolChanged = protocol !== (current?.protocol ?? 'ssh')
    const desktopOptions = isDesktopProtocol(protocol)
      ? (Object.fromEntries(
          [...Object.entries(current?.desktopOptions ?? {}), ...Object.entries(patch.desktopOptions ?? {})].filter(
            ([, value]) => value !== undefined
          )
        ) as DesktopOptions)
      : undefined
    const input: SessionInput = {
      name: (patch.name ?? current?.name ?? '').trim(),
      group: (patch.group ?? current?.group ?? '').trim(),
      protocol,
      // 字节流协议只有正向直连一种形态
      mode: protocol === 'ssh' ? (patch.mode ?? current?.mode ?? 'forward') : 'forward',
      host: (patch.host ?? current?.host ?? '').trim(),
      port: patch.port ?? (protocolChanged || current === null ? defaultPort(protocol) : current.port),
      username: (patch.username ?? current?.username ?? '').trim(),
      authType: patch.authType ?? current?.authType ?? 'password',
      keyPath: (patch.keyPath ?? current?.keyPath ?? '').trim() || undefined,
      serialPath: patch.serialPath ?? current?.serialPath,
      baudRate: patch.baudRate ?? current?.baudRate,
      dataBits: patch.dataBits ?? current?.dataBits,
      stopBits: patch.stopBits ?? current?.stopBits,
      parity: patch.parity ?? current?.parity,
      listenPort: patch.listenPort ?? current?.listenPort,
      sftpMode: patch.sftpMode ?? current?.sftpMode,
      desktopOptions,
      remark: patch.remark ?? current?.remark,
      secret: patch.secret ? patch.secret : undefined,
      jumpHost: patch.jumpHost !== undefined ? patch.jumpHost.trim() : (current?.jumpHost ?? ''),
      jumpPort: patch.jumpPort ?? current?.jumpPort ?? 22,
      jumpUsername: patch.jumpUsername !== undefined ? patch.jumpUsername.trim() : (current?.jumpUsername ?? ''),
      jumpSecret: patch.jumpSecret
    }
    if (!input.name) throw new Error(mt('mcp.err_name_required'))
    if (protocol === 'serial') {
      if (!input.serialPath?.trim()) {
        throw new Error(mt('mcp.err_serial_path'))
      }
    } else if (protocol === 'telnet') {
      if (!input.host) throw new Error(mt('mcp.err_telnet_host'))
    } else if (isDesktopProtocol(protocol)) {
      if (!input.host) throw new Error(mt('mcp.err_host_required', { protocol: mt(protocolLabel(protocol)) }))
    } else if (input.mode === 'forward') {
      if (!input.host || !input.username) throw new Error(mt('mcp.err_host_user'))
      if (input.authType === 'key' && !input.keyPath) throw new Error(mt('mcp.err_key_path'))
      if (creating && input.authType === 'password' && !input.secret) throw new Error(mt('mcp.err_secret'))
      if (input.jumpHost) {
        if (!input.jumpUsername) throw new Error(mt('mcp.err_jump_user'))
      }
    } else if (!input.listenPort) {
      throw new Error(mt('mcp.err_listen_port'))
    }
    const taken = this.storage.list().some((item) => item.name === input.name && item.id !== current?.id)
    if (taken) throw new Error(mt('mcp.err_duplicate_name', { name: input.name }))
    return input
  }

  private publishSessions(): void {
    this.send(IPC.sessionChanged, this.storage.list())
  }

  private disconnectSession(key: string): string {
    return this.disconnectById(this.findSession(key))
  }

  private disconnectById(session: SessionConfig): string {
    const terms = this.terminal.listTerms().filter((term) => term.sessionId === session.id)
    for (const term of terms) {
      this.terminal.close(term.id)
      this.send(IPC.mcpCloseTab, term.id)
    }
    this.sftp.close(session.id)
    const desktops = this.desktop.closeSession(session.id)
    for (const viewId of desktops) this.send(IPC.mcpCloseTab, viewId)
    return mt('mcp.closed_connection', { name: session.name, terms: terms.length, desktops: desktops.length })
  }

  private async openLocal(): Promise<string> {
    const n = this.terminal.listTerms().filter((term) => term.kind === 'local').length + 1
    const title = mt('mcp.window_number', { n })
    const termId = newTermId()
    const bound = this.terminal.expectBind(termId, 8000)
    this.send(IPC.mcpOpenTab, { termId, sessionId: null, kind: 'local', title })
    try {
      await bound
    } catch (error) {
      this.send(IPC.mcpCloseTab, termId)
      throw error
    }
    const connected = this.terminal.waitStatus(termId, 15_000)
    await this.terminal.create({ termId, kind: 'local', cols: 120, rows: 32, title })
    try {
      await connected
    } catch (error) {
      this.terminal.close(termId)
      this.send(IPC.mcpCloseTab, termId)
      throw error
    }
    return [mt('mcp.local_opened', { id: termId }), mt('mcp.title_line', { title }), mt('mcp.local_hint')].join('\n')
  }

  private requireForward(key: string) {
    const found = this.findSession(key)
    if (found.mode === 'reverse') throw new Error(mt('mcp.err_reverse_sftp'))
    return found
  }

  /**
   * 按能力降级：Telnet 和串口只有一条字节流，没有 exec 通道、没有 SFTP。
   * 对它们调 term_exec / sftp_* 时给出能力说明，而不是瞎报 Not connected。
   */
  private requireCapability(key: string, capability: 'exec' | 'sftp') {
    const found = this.requireForward(key)
    if (capabilitiesOf(found.protocol)[capability]) return found
    const feature = capability === 'exec' ? mt('mcp.feature_exec') : mt('mcp.feature_sftp')
    if (isDesktopProtocol(found.protocol)) {
      throw new Error(
        mt('mcp.err_desktop_no_stream', { protocol: mt(protocolLabel(found.protocol)), feature }) +
          mt('mcp.err_desktop_hint')
      )
    }
    throw new Error(
      mt('mcp.err_stream_only', { protocol: mt(protocolLabel(found.protocol)), feature }) +
        mt('mcp.err_stream_hint')
    )
  }

  private async guardPath(path: string): Promise<void> {
    if (!SENSITIVE.test(path)) return
    if (!this.storage.getMcpSettings().confirmDangerous) return
    const ok = await this.ask(path)
    if (!ok) throw new Error(mt('mcp.cancelled_path'))
  }

  private connectionView(session: SessionConfig) {
    return {
      id: session.publicId,
      name: session.name,
      remark: session.remark ?? '',
      protocol: session.protocol,
      capabilities: capabilitiesOf(session.protocol),
      mode: session.mode,
      host: session.host,
      port: session.port,
      username: session.username,
      serialPath: session.serialPath ?? null,
      baudRate: session.baudRate ?? null,
      listenPort: session.listenPort ?? null,
      sftpMode: session.sftpMode ?? 'auto',
      jump: Boolean(session.jumpHost)
    }
  }

  private listOpenTerms() {
    const sessions = this.storage.list()
    return this.terminal.listTerms().map((term) => {
      const session = sessions.find((item) => item.id === term.sessionId)
      return {
        termId: term.id,
        connection: session?.publicId ?? null,
        connectionName: session?.name ?? '',
        title: term.title,
        remark: term.remark,
        kind: term.kind,
        status: term.status
      }
    })
  }

  private requireLive(termId: string): string {
    const id = this.requireTerm(termId)
    const term = this.terminal.listTerms().find((item) => item.id === id)
    if (term?.status !== 'connected') throw new Error(mt('mcp.term_disconnected'))
    return id
  }

  private requireTerm(termId: string): string {
    const id = termId.trim()
    if (isConnId(id)) throw new Error(mt('mcp.err_id_is_connection', { id }))
    if (!isTermId(id)) throw new Error(mt('mcp.err_not_term', { id }))
    if (!this.terminal.listTerms().some((term) => term.id === id)) throw new Error(mt('mcp.err_term_missing'))
    return id
  }

  private findSession(key: string) {
    const id = key.trim()
    if (isTermId(id)) throw new Error(mt('mcp.err_id_is_term', { id }))
    if (!isConnId(id)) throw new Error(mt('mcp.err_not_connection', { id }))
    const found = this.storage.list().find((session) => session.publicId === id)
    if (!found) throw new Error(mt('mcp.err_connection_not_found', { id }))
    return found
  }

  private async guard(command: string): Promise<void> {
    if (!DANGEROUS.test(command)) return
    if (!this.storage.getMcpSettings().confirmDangerous) return
    const ok = await this.ask(command)
    if (!ok) throw new Error(mt('mcp.cancelled_action'))
  }

  private capture(
    termId: string,
    mode: 'viewport' | 'scrollback',
    startLine?: number,
    endLine?: number,
    cropOnly = false
  ): Promise<string> {
    if (startLine !== undefined && endLine !== undefined && endLine < startLine) {
      return Promise.reject(new Error(mt('mcp.err_line_range')))
    }
    const wc = this.getSender()
    if (!wc || wc.isDestroyed()) return Promise.reject(new Error(mt('mcp.err_window_capture')))
    const id = randomUUID()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.captures.delete(id)
        reject(new Error(mt('mcp.err_capture_timeout')))
      }, 60_000)
      this.captures.set(id, (result) => {
        clearTimeout(timer)
        if (result.error || !result.paths?.length) {
          reject(new Error(result.error || mt('mcp.err_capture_failed')))
          return
        }
        resolve([result.note, ...result.paths].filter(Boolean).join('\n'))
      })
      wc.send(IPC.captureRun, {
        id,
        termId,
        mode,
        startLine,
        endLine: endLine === undefined ? undefined : endLine + 1,
        cropOnly
      })
    })
  }

  private async appShot(grid: boolean | number): Promise<string> {
    const wc = this.getSender()
    if (!wc || wc.isDestroyed()) throw new Error(mt('mcp.err_window_capture'))
    const image = await wc.capturePage()
    const step = grid === true ? 100 : typeof grid === 'number' ? grid : 0
    const size = image.getSize()
    const drawn = step > 0 ? await renderGrid(wc, image, { step, spanWidth: size.width, spanHeight: size.height }) : image
    const png = drawn.toPNG()
    if (png.length === 0) throw new Error(mt('mcp.err_window_empty'))
    const dir = join(app.getPath('userData'), 'screenshots')
    mkdirSync(dir, { recursive: true })
    const file = join(dir, `app-${stamp()}.png`)
    writeFileSync(file, png)
    pruneScreenshots()
    return mt('mcp.app_saved', { grid: drawn !== image ? mt('mcp.app_saved_grid', { step }) : '', file })
  }

  private startRecording(fps: number, maxSeconds: number): Promise<string> {
    const wc = this.getSender()
    if (!wc || wc.isDestroyed()) return Promise.reject(new Error(mt('mcp.err_window_record')))
    if (this.recording) return Promise.reject(new Error(mt('mcp.err_recording_busy')))
    const id = randomUUID()
    this.recording = { id, startedAt: Date.now() }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.recordStarts.delete(id)
        this.recording = null
        reject(new Error(mt('mcp.err_record_start_timeout')))
      }, 15_000)
      this.recordStarts.set(id, {
        resolve: () => {
          clearTimeout(timer)
          resolve(mt('mcp.recording_started', { fps, seconds: maxSeconds }))
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        }
      })
      wc.send(IPC.recordStart, {
        id,
        sourceId: wc.getMediaSourceId(wc),
        fps,
        maxSeconds
      })
    })
  }

  private stopRecording(): Promise<string> {
    const rec = this.recording
    if (!rec) return Promise.reject(new Error(mt('mcp.err_record_idle')))
    const seconds = Math.max(1, Math.round(((rec.endedAt ?? Date.now()) - rec.startedAt) / 1000))
    if (rec.saved) {
      const file = rec.saved
      this.recording = null
      return Promise.resolve(mt('mcp.recording_auto_saved', { file, seconds }))
    }
    const wc = this.getSender()
    if (!wc || wc.isDestroyed()) {
      this.recording = null
      return Promise.reject(new Error(mt('mcp.err_record_data')))
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.recording?.id === rec.id) this.recording = null
        reject(new Error(mt('mcp.err_record_stop_timeout')))
      }, 20_000)
      rec.pendingStop = {
        resolve: (file) => {
          clearTimeout(timer)
          resolve(mt('mcp.recording_saved', { file, seconds }))
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        }
      }
      wc.send(IPC.recordStop, { id: rec.id })
    })
  }

  private cursorMode(termId: string): Promise<boolean> {
    const wc = this.getSender()
    if (!wc || wc.isDestroyed()) return Promise.resolve(false)
    const id = randomUUID()
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.modeReads.delete(id)
        resolve(false)
      }, 3_000)
      this.modeReads.set(id, (result) => {
        clearTimeout(timer)
        resolve(result.applicationCursor === true)
      })
      wc.send(IPC.termMode, { id, termId })
    })
  }

  private lines(termId: string, startLine?: number, endLine?: number): Promise<string> {
    if (startLine !== undefined && endLine !== undefined && endLine < startLine) {
      return Promise.reject(new Error(mt('mcp.err_line_range')))
    }
    const wc = this.getSender()
    if (!wc || wc.isDestroyed()) return Promise.reject(new Error(mt('mcp.err_window_lines')))
    const id = randomUUID()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.lineReads.delete(id)
        reject(new Error(mt('mcp.err_lines_timeout')))
      }, 10_000)
      this.lineReads.set(id, (result) => {
        clearTimeout(timer)
        if (result.error || !result.lines) {
          reject(new Error(result.error || mt('mcp.err_lines_failed')))
          return
        }
        resolve(formatLines(result))
      })
      const ranged = startLine !== undefined || endLine !== undefined
      wc.send(IPC.termLines, {
        id,
        termId,
        startLine: startLine ?? (ranged ? 0 : undefined),
        endLine: endLine === undefined ? undefined : endLine + 1
      })
    })
  }

  private async shot(tool: string, detail: string, attach: boolean, fn: () => Promise<string>) {
    try {
      const text = await fn()
      this.storage.appendAudit(tool, true, detail)
      const content: Array<
        { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: 'image/png' }
      > = [{ type: 'text', text }]
      if (attach) content.push(...pngsIn(text))
      return { content }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.storage.appendAudit(tool, false, `${detail} ${message}`.trim())
      return { isError: true, content: [{ type: 'text' as const, text: message }] }
    }
  }

  private ask(command: string): Promise<boolean> {
    const wc = this.getSender()
    if (!wc || wc.isDestroyed()) return Promise.reject(new Error(mt('mcp.err_window_confirm')))
    const id = randomUUID()
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.confirms.delete(id)
        resolve(false)
      }, 60_000)
      this.confirms.set(id, (ok) => {
        clearTimeout(timer)
        resolve(ok)
      })
      wc.send(IPC.mcpConfirm, { id, command: command.slice(0, 2000) })
    })
  }

  private async run(tool: string, detail: string, fn: () => Promise<string>) {
    try {
      const text = await fn()
      this.storage.appendAudit(tool, true, detail)
      return { content: [{ type: 'text' as const, text }] }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.storage.appendAudit(tool, false, `${detail} ${message}`.trim())
      return { isError: true, content: [{ type: 'text' as const, text: message }] }
    }
  }

  private send(channel: string, payload: unknown): void {
    const wc = this.getSender()
    if (!wc || wc.isDestroyed()) return
    wc.send(channel, payload)
  }
}

const MOVES = new Set(['up', 'down', 'left', 'right', 'home', 'end'])

function stamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '').replace('T', '-')
}

/** 录屏落在 userData/recordings/，和终端截图分开存放。 */
function saveRecording(data: Uint8Array, mime: string): string {
  const dir = join(app.getPath('userData'), 'recordings')
  mkdirSync(dir, { recursive: true })
  const ext = mime.includes('mp4') ? 'mp4' : 'webm'
  const file = join(dir, `record-${stamp()}-${randomUUID().slice(0, 4)}.${ext}`)
  writeFileSync(file, data)
  return file
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatLines(result: TermLinesReply): string {
  const lines = result.lines ?? []
  const length = result.length ?? 0
  const from = result.viewportY ?? 0
  const to = from + Math.max(0, (result.rows ?? 1) - 1)
  if (lines.length === 0) {
    return length === 0 ? mt('mcp.err_buffer_empty') : mt('mcp.err_line_overflow', { total: length })
  }
  const body = lines.map((line) => `${line.n}|${line.text}`).join('\n')
  const cap = lines.length >= 200 ? mt('mcp.lines_capped') : ''
  return mt('mcp.lines_view', { total: length, from, to, body, cap })
}

function pngsIn(text: string): { type: 'image'; data: string; mimeType: 'image/png' }[] {
  const files = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().endsWith('.png'))
  const images: { type: 'image'; data: string; mimeType: 'image/png' }[] = []
  for (const file of files) {
    try {
      const bytes = readFileSync(file)
      if (bytes.length === 0 || bytes.length > 6_000_000) continue
      images.push({ type: 'image', data: bytes.toString('base64'), mimeType: 'image/png' })
    } catch {
      continue
    }
  }
  return images
}

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name]
  return Array.isArray(value) ? value[0] : value
}

function hostAllowed(req: IncomingMessage, port: number): boolean {
  const host = header(req, 'host')
  return host === `${MCP_HOST}:${port}` || host === `localhost:${port}`
}

function loopback(req: IncomingMessage): boolean {
  const addr = req.socket.remoteAddress
  return addr === '127.0.0.1' || addr === '::ffff:127.0.0.1' || addr === '::1'
}

function authorized(headerValue: string | undefined, token: string): boolean {
  if (!headerValue?.startsWith('Bearer ') || !token) return false
  const got = Buffer.from(headerValue.slice('Bearer '.length))
  const expect = Buffer.from(token)
  if (got.length !== expect.length) return false
  return timingSafeEqual(got, expect)
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > 1_000_000) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

function rpcError(message: string) {
  return { jsonrpc: '2.0', error: { code: -32000, message }, id: null }
}

function listenError(error: unknown, port: number): string {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE') {
    return mt('mcp.err_port_in_use', { port })
  }
  return error instanceof Error ? error.message : String(error)
}

function desktopButton(raw: Record<string, unknown>): 'left' | 'middle' | 'right' | undefined {
  const value = textArg(raw, 'button')
  if (!value) return undefined
  if (value !== 'left' && value !== 'middle' && value !== 'right') {
    throw new Error(mt('mcp.err_button'))
  }
  return value
}

function lineShot(raw: Record<string, unknown>): {
  termId: string
  startLine: number | undefined
  endLine: number | undefined
  ranged: boolean
} {
  const startLine = intArg(raw, 'startLine')
  const endLine = intArg(raw, 'endLine')
  return { termId: need(raw, 'termId'), startLine, endLine, ranged: startLine !== undefined || endLine !== undefined }
}

function auditDetail(input: Record<string, unknown>): string {
  return Object.entries(input)
    .filter(([key, value]) => key !== 'secret' && value !== undefined && typeof value !== 'object')
    .map(([key, value]) => `${key}=${value}`)
    .join(' ')
    .slice(0, 500)
}

function need(raw: Record<string, unknown>, key: string): string {
  const value = textArg(raw, key)
  if (!value) throw new Error(mt('mcp.err_missing', { key }))
  return value
}

function textArg(raw: Record<string, unknown>, key: string): string | undefined {
  const value = raw[key]
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw new Error(mt('mcp.err_string', { key }))
  return value
}

function intArg(raw: Record<string, unknown>, key: string): number | undefined {
  const value = raw[key]
  if (value === undefined || value === null || value === '') return undefined
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  if (!Number.isInteger(parsed)) throw new Error(mt('mcp.err_int', { key }))
  return parsed
}

function boolArg(raw: Record<string, unknown>, key: string): boolean | undefined {
  const value = raw[key]
  if (value === undefined || value === null || value === '') return undefined
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  throw new Error(mt('mcp.err_bool', { key }))
}

function keyArg(raw: Record<string, unknown>): Array<(typeof TERM_KEYS)[number]> | undefined {
  const value = raw.keys
  if (value === undefined || value === null || value === '') return undefined
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : null
  if (!list) throw new Error(mt('mcp.err_keys'))
  const allowed = new Set<string>(TERM_KEYS)
  const keys = list.map((item) => canonicalKey(String(item))).filter(Boolean)
  for (const key of keys) {
    if (!allowed.has(key)) throw new Error(mt('mcp.err_key_unknown', { key }))
  }
  return keys as Array<(typeof TERM_KEYS)[number]>
}

function sessionPatch(raw: Record<string, unknown>): SessionPatch {
  const protocol = textArg(raw, 'protocol')
  if (protocol && protocol !== 'ssh' && protocol !== 'telnet' && protocol !== 'serial' && protocol !== 'rdp' && protocol !== 'vnc') {
    throw new Error(mt('mcp.err_protocol'))
  }
  const mode = textArg(raw, 'mode')
  if (mode && mode !== 'forward' && mode !== 'reverse') throw new Error(mt('mcp.err_mode'))
  const authType = textArg(raw, 'authType')
  if (authType && authType !== 'password' && authType !== 'key') throw new Error(mt('mcp.err_auth_type'))
  const parity = textArg(raw, 'parity')
  if (parity && parity !== 'none' && parity !== 'even' && parity !== 'odd' && parity !== 'mark' && parity !== 'space') {
    throw new Error(mt('mcp.err_parity'))
  }
  const sftpMode = textArg(raw, 'sftpMode')
  if (sftpMode && sftpMode !== 'auto' && sftpMode !== 'shared' && sftpMode !== 'fresh') {
    throw new Error(mt('mcp.err_sftp_mode'))
  }
  return {
    protocol: protocol as SessionPatch['protocol'],
    mode: mode === 'reverse' ? 'reverse' : mode === 'forward' ? 'forward' : undefined,
    host: textArg(raw, 'host'),
    port: intArg(raw, 'port'),
    username: textArg(raw, 'username'),
    authType: authType === 'key' ? 'key' : authType === 'password' ? 'password' : undefined,
    keyPath: textArg(raw, 'keyPath'),
    secret: textArg(raw, 'secret'),
    serialPath: textArg(raw, 'serialPath'),
    baudRate: intArg(raw, 'baudRate'),
    dataBits: intArg(raw, 'dataBits'),
    stopBits: intArg(raw, 'stopBits'),
    parity: parity as SessionPatch['parity'],
    listenPort: intArg(raw, 'listenPort'),
    sftpMode: sftpMode as SessionPatch['sftpMode'],
    desktopOptions: isDesktopProtocol(protocol)
      ? {
          viewOnly: boolArg(raw, 'viewOnly'),
          width: intArg(raw, 'width'),
          height: intArg(raw, 'height'),
          nativeClient: boolArg(raw, 'nativeClient'),
          clipboard: boolArg(raw, 'clipboard'),
          performance: desktopPerformance(raw)
        }
      : undefined,
    group: textArg(raw, 'group'),
    remark: textArg(raw, 'remark')
  }
}

function desktopPerformance(raw: Record<string, unknown>): DesktopOptions['performance'] {
  const value = textArg(raw, 'performance')
  if (value === undefined) return undefined
  if (value === 'auto' || value === 'quality' || value === 'balanced' || value === 'speed') return value
  throw new Error(mt('mcp.err_performance'))
}

function desktopGrid(raw: Record<string, unknown>): boolean | number {
  const grid = raw.grid
  // 默认带 100px 网格：Agent 不传参数时也能直接按刻度算坐标。
  if (grid === undefined) return 100
  if (typeof grid === 'boolean') return grid
  if (typeof grid === 'number' && Number.isInteger(grid) && grid >= 20 && grid <= 500) return grid
  throw new Error(mt('mcp.err_grid'))
}

/** desktop_type 的输入方式：keys 逐字按键（默认），clipboard 走远端剪贴板。 */
function desktopTypeOptions(raw: Record<string, unknown>): { method?: 'keys' | 'clipboard'; pasteKeys?: string } {
  const method = textArg(raw, 'method')
  if (method !== undefined && method !== 'keys' && method !== 'clipboard') {
    throw new Error(mt('mcp.err_method'))
  }
  return { method, pasteKeys: textArg(raw, 'pasteKeys') }
}

/** 显式指定截图尺寸时透传；不传则由主进程用最近一张截图兜底。 */
function desktopScaleSource(raw: Record<string, unknown>): {
  fromWidth?: number
  fromHeight?: number
  shotId?: string
} {
  const fromWidth = intArg(raw, 'imageWidth')
  const fromHeight = intArg(raw, 'imageHeight')
  const shotId = textArg(raw, 'shotId')
  return { fromWidth, fromHeight, shotId }
}

function desktopRegion(raw: Record<string, unknown>): DesktopRegion | undefined {
  const value = raw.region
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'object') throw new Error(mt('mcp.err_region_shape'))
  const region = value as Record<string, unknown>
  const x = intArg(region, 'x')
  const y = intArg(region, 'y')
  const width = intArg(region, 'width')
  const height = intArg(region, 'height')
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    throw new Error(mt('mcp.err_region_fields'))
  }
  return { x, y, width, height }
}

function desktopAction(raw: Record<string, unknown>): DesktopAgentInput {
  const action = textArg(raw, 'action')
  if (action === 'screenshot') return { action, grid: desktopGrid(raw), region: desktopRegion(raw) }
  if (action === 'click') {
    return {
      action,
      x: intArg(raw, 'x') ?? 0,
      y: intArg(raw, 'y') ?? 0,
      button: desktopButton(raw),
      double: boolArg(raw, 'double'),
      ...desktopScaleSource(raw)
    }
  }
  if (action === 'key') return { action, keys: need(raw, 'keys') }
  if (action === 'type') {
    return { action, text: need(raw, 'text'), ...desktopTypeOptions(raw) }
  }
  if (action === 'scroll') {
    return {
      action,
      x: intArg(raw, 'x'),
      y: intArg(raw, 'y'),
      deltaY: intArg(raw, 'deltaY') ?? 0,
      ...desktopScaleSource(raw)
    }
  }
  if (action === 'wait') {
    return { action, ms: intArg(raw, 'ms'), stableMs: intArg(raw, 'stableMs'), timeoutMs: intArg(raw, 'timeoutMs') }
  }
  throw new Error(mt('mcp.err_desktop_action', { action: action || '(missing action)' }))
}

function stripAnsi(text: string): string {
  return text
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, '')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
}

/**
 * 交给助手的回显。去掉控制符，回车收拢成换行，行尾空白去掉，
 * 连续的空行只留一个。行首缩进和行内的对齐保留，目录列表和表格不会散。
 */
function agentText(text: string): string {
  return stripAnsi(text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function clip(text: string, max = 16_000): string {
  if (text.length <= max) return text
  return mt('mcp.clip_tail', { text: text.slice(-max), max })
}

/** 只截这次命令自己的输出。头尾都留，避免只剩滚动缓冲末尾。 */
function clipCommand(text: string, max = 16_000): string {
  if (text.length <= max) return text
  const head = Math.floor(max / 2)
  const tail = max - head
  return mt('mcp.clip_middle', { head: text.slice(0, head), tail: text.slice(-tail) })
}
