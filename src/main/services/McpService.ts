import { randomUUID, timingSafeEqual } from 'node:crypto'
import { isConnId, isTermId, newTermId } from '../../shared/ids'
import { readFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { WebContents } from 'electron'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { parseToolArgs, schemaText, TOOLS, toolsText } from './tool-catalog'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { IPC } from '../../shared/ipc-channels'
import { encodeTermInput, TERM_KEYS } from '../../shared/term-keys'
import type { CaptureReply, TermLinesReply, TermModeReply } from '../../shared/types'
import {
  MCP_DEFAULT_PORT,
  MCP_HOST,
  type AuthType,
  type ConnectMode,
  type McpRuntime,
  type McpSettings,
  type SessionConfig,
  type SessionInput
} from '../../shared/types'
import type { ReverseListenerService } from './ReverseListenerService'
import type { SftpService } from './SftpService'
import type { StorageService } from './StorageService'
import type { TerminalService } from './TerminalService'

const SENSITIVE = /^(\/etc|\/boot|\/bin|\/sbin|\/usr|\/dev|\/sys|\/proc)(\/|$)|^[A-Za-z]:\\Windows\\/i

const DANGEROUS =
  /(?:^|[;&|`\n])\s*(?:sudo\s+)?(rm|rmdir|mkfs|dd|shutdown|reboot|poweroff|halt)\b|chmod\s+[^\n]*-[^\n]*R|chown\s+[^\n]*-[^\n]*R|>\s*\/(?:dev|etc)\b/i

type SessionPatch = {
  name?: string
  mode?: ConnectMode
  host?: string
  port?: number
  username?: string
  authType?: AuthType
  keyPath?: string
  secret?: string
  jumpHost?: string
  jumpPort?: number
  jumpUsername?: string
  jumpSecret?: string
  listenPort?: number
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
  private lineReads = new Map<string, (result: TermLinesReply) => void>()
  private modeReads = new Map<string, (result: TermModeReply) => void>()
  private token = ''
  private runtime: McpRuntime = { running: false, port: MCP_DEFAULT_PORT, clients: 0 }

  constructor(
    private storage: StorageService,
    private terminal: TerminalService,
    private sftp: SftpService,
    private reverse: ReverseListenerService,
    private getSender: () => WebContents | null
  ) {}

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
      settle({ id, error: '应用正在退出' })
    }
    for (const [id, settle] of this.lineReads) {
      this.lineReads.delete(id)
      settle({ id, error: '应用正在退出' })
    }
    for (const [id, settle] of this.modeReads) {
      this.modeReads.delete(id)
      settle({ id, error: '应用正在退出' })
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
        return `已写上备注`
      }
      case 'term_exec': {
        const termId = this.requireTerm(need(raw, 'termId'))
        let command = need(raw, 'command')
        if (!command.endsWith('\n')) command += '\n'
        await this.guard(command)
        const output = await this.terminal.execCommand(termId, command, intArg(raw, 'timeoutMs') ?? 20_000)
        return clip(stripAnsi(output))
      }
      case 'term_write':
        return this.writeTerm(raw)
      case 'term_read':
        return clip(stripAnsi(this.terminal.readTail(this.requireTerm(need(raw, 'termId')), intArg(raw, 'maxChars') ?? 8000)))
      case 'term_close': {
        const termId = this.requireTerm(need(raw, 'termId'))
        this.terminal.close(termId)
        this.send(IPC.mcpCloseTab, termId)
        return '已关闭'
      }
      case 'term_open_local':
        return this.openLocal()
      case 'term_lines':
        return this.lines(this.requireTerm(need(raw, 'termId')), intArg(raw, 'startLine'), intArg(raw, 'endLine'))
      case 'term_screenshot': {
        const shot = lineShot(raw)
        const termId = this.requireTerm(shot.termId)
        return shot.ranged
          ? this.capture(termId, 'scrollback', shot.startLine, shot.endLine, true)
          : this.capture(termId, 'viewport')
      }
      case 'term_screenshot_scrollback': {
        const shot = lineShot(raw)
        return this.capture(this.requireTerm(shot.termId), 'scrollback', shot.startLine, shot.endLine, shot.ranged)
      }
      case 'sftp_list': {
        const found = this.requireForward(need(raw, 'connection'))
        const listed = await this.sftp.list(found.id, textArg(raw, 'path') || '.')
        return JSON.stringify(listed, null, 2)
      }
      case 'sftp_mkdir': {
        const path = need(raw, 'path')
        const found = this.requireForward(need(raw, 'connection'))
        await this.guardPath(path)
        await this.sftp.mkdirPath(found.id, path)
        return `已创建 ${path}`
      }
      case 'sftp_upload': {
        const remotePath = need(raw, 'remotePath')
        const found = this.requireForward(need(raw, 'connection'))
        await this.guardPath(remotePath)
        await this.sftp.put(found.id, need(raw, 'localPath'), remotePath)
        return `已上传到 ${remotePath}`
      }
      case 'sftp_download': {
        const localPath = need(raw, 'localPath')
        const found = this.requireForward(need(raw, 'connection'))
        await this.sftp.get(found.id, need(raw, 'remotePath'), localPath)
        return `已下载到 ${localPath}`
      }
      case 'sftp_rename': {
        const to = need(raw, 'to')
        const found = this.requireForward(need(raw, 'connection'))
        await this.guardPath(to)
        await this.sftp.rename(found.id, need(raw, 'from'), to)
        return `已改名为 ${to}`
      }
      case 'sftp_remove': {
        const path = need(raw, 'path')
        const kind = need(raw, 'kind')
        if (kind !== 'file' && kind !== 'dir' && kind !== 'link') throw new Error('kind 只能是 file、dir 或 link')
        const found = this.requireForward(need(raw, 'connection'))
        await this.guard(`rm ${path}`)
        await this.sftp.remove(found.id, path, kind)
        return `已删除 ${path}`
      }
      default:
        throw new Error(`未知命令: ${tool}`)
    }
  }

  private async writeTerm(raw: Record<string, unknown>): Promise<string> {
    const termId = this.requireTerm(need(raw, 'termId'))
    const keys = keyArg(raw)
    const text = textArg(raw, 'text')
    const data = textArg(raw, 'data')
    const submit = boolArg(raw, 'submit')
    if (!keys?.length && !text && !data && !submit) throw new Error('要提供 keys、text、submit 或 data')
    const applicationCursor = keys?.some((key) => MOVES.has(key)) ? await this.cursorMode(termId) : false
    const payload = encodeTermInput({ keys, text, data, submit, applicationCursor })
    if (!payload) throw new Error('没有可发送的内容')
    if (payload.includes('\n') || payload.includes('\r')) await this.guard(payload)
    this.terminal.input(termId, payload)
    await wait(200)
    try {
      return await this.lines(termId)
    } catch {
      return '已发送'
    }
  }

  private async onCli(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, text: '只接受 POST' })
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
        sendJson(res, 200, { ok: false, text: error instanceof Error ? error.message : '失败' })
      }
      return
    }
    if (body.op !== 'call' || typeof body.tool !== 'string' || !body.tool) {
      sendJson(res, 400, { ok: false, text: 'op 只能是 tools、schema 或 call' })
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
      sendJson(res, 200, { ok: false, text: error instanceof Error ? error.message : '参数不对' })
      return
    }
    const result = await this.run(body.tool, auditDetail(args) || body.tool, () => this.invoke(body.tool as string, args))
    const text = result.content[0]?.text ?? ''
    sendJson(res, 200, { ok: result.isError !== true, text })
  }

  private async connectSession(key: string): Promise<string> {
    const session = this.findSession(key)
    if (session.mode === 'reverse') throw new Error('反向监听要在界面上点开始监听')
    const n = this.terminal.listTerms().filter((term) => term.sessionId === session.id).length + 1
    const title = `窗口 ${n}`
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
      `已打开连接 ${session.publicId}（${session.name}）。`,
      `终端：${termId}`,
      `标题：${title}`,
      '操作这扇终端用 termId。连接用 conn- 编号。弄清这扇终端在做什么之后，用 term_update 写上备注。'
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
    if (!saved) throw new Error('连接已不存在')
    this.publishSessions()
    return JSON.stringify(this.connectionView(saved), null, 2)
  }

  private async deleteSession(key: string): Promise<string> {
    const session = this.findSession(key)
    if (this.storage.getMcpSettings().confirmDangerous) {
      const ok = await this.ask(`删除连接 ${session.name}`)
      if (!ok) throw new Error('已取消：删除未确认')
    }
    this.disconnectSession(session.id)
    if (session.mode === 'reverse') this.reverse.stop(session.id)
    this.storage.delete(session.id)
    this.publishSessions()
    return `已删除 ${session.name}`
  }

  private normalize(current: SessionConfig | null, patch: SessionPatch, creating: boolean): SessionInput {
    const input: SessionInput = {
      name: (patch.name ?? current?.name ?? '').trim(),
      group: (patch.group ?? current?.group ?? '').trim(),
      mode: patch.mode ?? current?.mode ?? 'forward',
      host: (patch.host ?? current?.host ?? '').trim(),
      port: patch.port ?? current?.port ?? 22,
      username: (patch.username ?? current?.username ?? '').trim(),
      authType: patch.authType ?? current?.authType ?? 'password',
      keyPath: (patch.keyPath ?? current?.keyPath ?? '').trim() || undefined,
      listenPort: patch.listenPort ?? current?.listenPort,
      remark: patch.remark ?? current?.remark,
      secret: patch.secret ? patch.secret : undefined,
      jumpHost: patch.jumpHost !== undefined ? patch.jumpHost.trim() : (current?.jumpHost ?? ''),
      jumpPort: patch.jumpPort ?? current?.jumpPort ?? 22,
      jumpUsername: patch.jumpUsername !== undefined ? patch.jumpUsername.trim() : (current?.jumpUsername ?? ''),
      jumpSecret: patch.jumpSecret
    }
    if (!input.name) throw new Error('名称不能为空')
    if (input.mode === 'forward') {
      if (!input.host || !input.username) throw new Error('主机和用户名不能为空')
      if (input.authType === 'key' && !input.keyPath) throw new Error('私钥认证需要填写 keyPath')
      if (creating && input.authType === 'password' && !input.secret) throw new Error('密码认证需要填写 secret')
      if (input.jumpHost) {
        if (!input.jumpUsername) throw new Error('跳板需要用户名')
      }
    } else if (!input.listenPort) {
      throw new Error('反向监听需要 listenPort')
    }
    const taken = this.storage.list().some((item) => item.name === input.name && item.id !== current?.id)
    if (taken) throw new Error(`已有同名连接: ${input.name}`)
    return input
  }

  private publishSessions(): void {
    this.send(IPC.sessionChanged, this.storage.list())
  }

  private disconnectSession(key: string): string {
    const session = this.findSession(key)
    const terms = this.terminal.listTerms().filter((term) => term.sessionId === session.id)
    for (const term of terms) {
      this.terminal.close(term.id)
      this.send(IPC.mcpCloseTab, term.id)
    }
    this.sftp.close(session.id)
    return `已断开 ${session.name}，关闭 ${terms.length} 个终端`
  }

  private async openLocal(): Promise<string> {
    const n = this.terminal.listTerms().filter((term) => term.kind === 'local').length + 1
    const title = `窗口 ${n}`
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
    return [`已打开本机终端 ${termId}。`, `标题：${title}`, '它没有连接。弄清它在做什么之后，用 term_update 写上备注。'].join('\n')
  }

  private requireForward(key: string) {
    const found = this.findSession(key)
    if (found.mode === 'reverse') throw new Error('反向监听没有 SFTP')
    return found
  }

  private async guardPath(path: string): Promise<void> {
    if (!SENSITIVE.test(path)) return
    if (!this.storage.getMcpSettings().confirmDangerous) return
    const ok = await this.ask(path)
    if (!ok) throw new Error('已取消：危险路径未确认')
  }

  private connectionView(session: SessionConfig) {
    return {
      id: session.publicId,
      name: session.name,
      remark: session.remark ?? '',
      mode: session.mode,
      host: session.host,
      port: session.port,
      username: session.username,
      listenPort: session.listenPort ?? null,
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

  private requireTerm(termId: string): string {
    const id = termId.trim()
    if (isConnId(id)) throw new Error(`「${id}」是连接编号。终端请填 term- 开头的编号。`)
    if (!isTermId(id)) throw new Error(`「${id}」不是终端编号。请先 term_list，再用 term- 开头的编号。`)
    if (!this.terminal.listTerms().some((term) => term.id === id)) throw new Error('终端不存在或已断开')
    return id
  }

  private findSession(key: string) {
    const id = key.trim()
    if (isTermId(id)) throw new Error(`「${id}」是终端编号。连接请填 conn- 开头的编号。`)
    if (!isConnId(id)) throw new Error(`「${id}」不是连接编号。请先 connection_list，再用 conn- 开头的编号。名称和备注不能用来查找。`)
    const found = this.storage.list().find((session) => session.publicId === id)
    if (!found) throw new Error(`找不到连接: ${id}`)
    return found
  }

  private async guard(command: string): Promise<void> {
    if (!DANGEROUS.test(command)) return
    if (!this.storage.getMcpSettings().confirmDangerous) return
    const ok = await this.ask(command)
    if (!ok) throw new Error('已取消：危险操作未确认')
  }

  private capture(
    termId: string,
    mode: 'viewport' | 'scrollback',
    startLine?: number,
    endLine?: number,
    cropOnly = false
  ): Promise<string> {
    if (startLine !== undefined && endLine !== undefined && endLine < startLine) {
      return Promise.reject(new Error('endLine 要大于或等于 startLine，两端都包含'))
    }
    const wc = this.getSender()
    if (!wc || wc.isDestroyed()) return Promise.reject(new Error('窗口不可用，无法截图'))
    const id = randomUUID()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.captures.delete(id)
        reject(new Error('截图超时'))
      }, 60_000)
      this.captures.set(id, (result) => {
        clearTimeout(timer)
        if (result.error || !result.paths?.length) {
          reject(new Error(result.error || '截图失败'))
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
      return Promise.reject(new Error('endLine 要大于或等于 startLine，两端都包含'))
    }
    const wc = this.getSender()
    if (!wc || wc.isDestroyed()) return Promise.reject(new Error('窗口不可用，无法读取终端'))
    const id = randomUUID()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.lineReads.delete(id)
        reject(new Error('读取终端行超时'))
      }, 10_000)
      this.lineReads.set(id, (result) => {
        clearTimeout(timer)
        if (result.error || !result.lines) {
          reject(new Error(result.error || '读取终端行失败'))
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
    if (!wc || wc.isDestroyed()) return Promise.reject(new Error('窗口不可用，无法确认危险操作'))
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatLines(result: TermLinesReply): string {
  const lines = result.lines ?? []
  const length = result.length ?? 0
  const from = result.viewportY ?? 0
  const to = from + Math.max(0, (result.rows ?? 1) - 1)
  if (lines.length === 0) {
    return length === 0 ? '缓冲是空的' : `行号超出缓冲，一共 ${length} 行`
  }
  const body = lines.map((line) => `${line.n}|${line.text}`).join('\n')
  const cap = lines.length >= 200 ? '\n一次最多返回 200 行，其余请缩小范围再查。' : ''
  return `缓冲共 ${length} 行，当前画面是第 ${from}–${to} 行。\n${body}${cap}`
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
    return `端口 ${port} 已被占用`
  }
  return error instanceof Error ? error.message : String(error)
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
  if (!value) throw new Error(`缺少 ${key}`)
  return value
}

function textArg(raw: Record<string, unknown>, key: string): string | undefined {
  const value = raw[key]
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw new Error(`${key} 必须是字符串`)
  return value
}

function intArg(raw: Record<string, unknown>, key: string): number | undefined {
  const value = raw[key]
  if (value === undefined || value === null || value === '') return undefined
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  if (!Number.isInteger(parsed)) throw new Error(`${key} 必须是整数`)
  return parsed
}

function boolArg(raw: Record<string, unknown>, key: string): boolean | undefined {
  const value = raw[key]
  if (value === undefined || value === null || value === '') return undefined
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  throw new Error(`${key} 必须是 true 或 false`)
}

function keyArg(raw: Record<string, unknown>): Array<(typeof TERM_KEYS)[number]> | undefined {
  const value = raw.keys
  if (value === undefined || value === null || value === '') return undefined
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : null
  if (!list) throw new Error('keys 必须是按键列表')
  const allowed = new Set<string>(TERM_KEYS)
  const keys = list.map((item) => String(item).trim()).filter(Boolean)
  for (const key of keys) {
    if (!allowed.has(key)) throw new Error(`不认识的按键: ${key}`)
  }
  return keys as Array<(typeof TERM_KEYS)[number]>
}

function sessionPatch(raw: Record<string, unknown>): SessionPatch {
  const mode = textArg(raw, 'mode')
  if (mode && mode !== 'forward' && mode !== 'reverse') throw new Error('mode 只能是 forward 或 reverse')
  const authType = textArg(raw, 'authType')
  if (authType && authType !== 'password' && authType !== 'key') throw new Error('authType 只能是 password 或 key')
  return {
    mode: mode === 'reverse' ? 'reverse' : mode === 'forward' ? 'forward' : undefined,
    host: textArg(raw, 'host'),
    port: intArg(raw, 'port'),
    username: textArg(raw, 'username'),
    authType: authType === 'key' ? 'key' : authType === 'password' ? 'password' : undefined,
    keyPath: textArg(raw, 'keyPath'),
    secret: textArg(raw, 'secret'),
    listenPort: intArg(raw, 'listenPort'),
    group: textArg(raw, 'group'),
    remark: textArg(raw, 'remark')
  }
}

function stripAnsi(text: string): string {
  return text
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, '')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
}

function clip(text: string, max = 16_000): string {
  if (text.length <= max) return text
  return `${text.slice(-max)}\n…已截断，只保留最后 ${max} 个字符`
}
