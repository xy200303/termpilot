import { randomUUID, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { WebContents } from 'electron'
import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { IPC } from '../../shared/ipc-channels'
import type { CaptureReply } from '../../shared/types'
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

    server.registerTool(
      'session_list',
      {
        description: '列出已保存的连接。不含密码和私钥口令。',
        annotations: { readOnlyHint: true }
      },
      async () => this.run('session_list', '', async () => JSON.stringify(this.storage.list(), null, 2))
    )

    server.registerTool(
      'session_connect',
      {
        description: '按 id 或名称连接一条正向 SSH，并在界面打开终端。返回 termId。',
        inputSchema: { session: z.string().describe('会话 id 或名称') }
      },
      async ({ session }) => this.run('session_connect', session, () => this.connectSession(session))
    )

    server.registerTool(
      'session_disconnect',
      {
        description: '断开某个会话下所有终端，并关掉它的文件连接。',
        inputSchema: { session: z.string().describe('会话 id 或名称') }
      },
      async ({ session }) =>
        this.run('session_disconnect', session, async () => this.disconnectSession(session))
    )

    const sessionFields = {
      mode: z
        .enum(['forward', 'reverse'])
        .optional()
        .describe('forward 主动连服务器；reverse 只在 127.0.0.1 监听'),
      host: z.string().optional().describe('正向 SSH 的主机'),
      port: z.number().int().min(1).max(65535).optional().describe('正向 SSH 端口，默认 22'),
      username: z.string().optional(),
      authType: z.enum(['password', 'key']).optional().describe('password 或 key'),
      keyPath: z.string().optional().describe('私钥文件的本机绝对路径'),
      secret: z
        .string()
        .optional()
        .describe('密码或私钥口令。加密保存，之后不会再返回。留空表示不修改'),
      listenPort: z.number().int().min(1).max(65535).optional().describe('反向监听端口'),
      group: z.string().optional().describe('侧边栏分组，留空归入未分组'),
      remark: z.string().optional()
    }

    server.registerTool(
      'session_create',
      {
        description:
          '新建并保存一条 SSH 连接。密码和私钥口令加密存在本机。创建后会出现在侧边栏，再用 session_connect 打开。',
        inputSchema: { name: z.string().describe('显示名称，不能和已有连接重名'), ...sessionFields }
      },
      async (input) => this.run('session_create', input.name, async () => this.createSession(input))
    )

    server.registerTool(
      'session_update',
      {
        description:
          '修改已保存的 SSH 连接。只填要改的字段。secret 留空则保留原密码。已经打开的终端不会自动重连。',
        inputSchema: { session: z.string().describe('会话 id 或名称'), name: z.string().optional(), ...sessionFields }
      },
      async ({ session, ...patch }) =>
        this.run('session_update', session, async () => this.updateSession(session, patch))
    )

    server.registerTool(
      'session_delete',
      {
        description: '删除一条已保存的 SSH 连接，并断开它打开的终端。开启危险确认时会先询问。',
        inputSchema: { session: z.string().describe('会话 id 或名称') }
      },
      async ({ session }) => this.run('session_delete', session, () => this.deleteSession(session))
    )

    server.registerTool(
      'term_list',
      {
        description: '列出当前打开的终端。',
        annotations: { readOnlyHint: true }
      },
      async () => this.run('term_list', '', async () => JSON.stringify(this.terminal.listTerms(), null, 2))
    )

    server.registerTool(
      'term_exec',
      {
        description: '在已连接的终端执行一条命令，等到输出安静后返回文本。',
        inputSchema: {
          termId: z.string(),
          command: z.string(),
          timeoutMs: z.number().int().min(500).max(120_000).optional()
        }
      },
      async ({ termId, command, timeoutMs }) =>
        this.run('term_exec', `${termId} ${command}`, async () => {
          await this.guard(command)
          const output = await this.terminal.execCommand(termId, command, timeoutMs ?? 20_000)
          return clip(stripAnsi(output))
        })
    )

    server.registerTool(
      'term_write',
      {
        description: '向终端写入原始按键，用于方向键、Ctrl 和交互程序。',
        inputSchema: { termId: z.string(), data: z.string().max(65_536) }
      },
      async ({ termId, data }) =>
        this.run('term_write', termId, async () => {
          if (!this.terminal.listTerms().some((term) => term.id === termId)) {
            throw new Error('终端不存在或已断开')
          }
          if (data.includes('\n') || data.includes('\r')) await this.guard(data)
          this.terminal.input(termId, data)
          return '已写入'
        })
    )

    server.registerTool(
      'term_read',
      {
        description: '读取终端最近输出，已去掉 ANSI 控制符。',
        annotations: { readOnlyHint: true },
        inputSchema: {
          termId: z.string(),
          maxChars: z.number().int().min(200).max(50_000).optional()
        }
      },
      async ({ termId, maxChars }) =>
        this.run('term_read', termId, async () => clip(stripAnsi(this.terminal.readTail(termId, maxChars ?? 8000))))
    )

    server.registerTool(
      'term_close',
      {
        description: '断开并关闭一个终端标签。',
        inputSchema: { termId: z.string() }
      },
      async ({ termId }) =>
        this.run('term_close', termId, async () => {
          this.terminal.close(termId)
          this.send(IPC.mcpCloseTab, termId)
          return '已关闭'
        })
    )

    server.registerTool(
      'sftp_list',
      {
        description: '列出正向 SSH 会话的远端目录。',
        annotations: { readOnlyHint: true },
        inputSchema: {
          session: z.string().describe('会话 id 或名称'),
          path: z.string().optional().describe('远端目录，默认家目录')
        }
      },
      async ({ session, path }) =>
        this.run('sftp_list', `${session} ${path ?? '.'}`, async () => {
          const found = this.findSession(session)
          if (found.mode === 'reverse') throw new Error('反向监听没有 SFTP')
          const listed = await this.sftp.list(found.id, path ?? '.')
          return JSON.stringify(listed, null, 2)
        })
    )

    server.registerTool(
      'sftp_mkdir',
      {
        description: '在正向 SSH 上新建远端目录。path 是完整远端路径。',
        inputSchema: { session: z.string(), path: z.string() }
      },
      async ({ session, path }) =>
        this.run('sftp_mkdir', path, async () => {
          const found = this.requireForward(session)
          await this.guardPath(path)
          await this.sftp.mkdirPath(found.id, path)
          return `已创建 ${path}`
        })
    )

    server.registerTool(
      'sftp_upload',
      {
        description: '把本机绝对路径的文件上传到远端路径。',
        inputSchema: { session: z.string(), localPath: z.string(), remotePath: z.string() }
      },
      async ({ session, localPath, remotePath }) =>
        this.run('sftp_upload', `${localPath} -> ${remotePath}`, async () => {
          const found = this.requireForward(session)
          await this.guardPath(remotePath)
          await this.sftp.put(found.id, localPath, remotePath)
          return `已上传到 ${remotePath}`
        })
    )

    server.registerTool(
      'sftp_download',
      {
        description: '把远端文件下载到本机绝对路径。',
        inputSchema: { session: z.string(), remotePath: z.string(), localPath: z.string() }
      },
      async ({ session, remotePath, localPath }) =>
        this.run('sftp_download', `${remotePath} -> ${localPath}`, async () => {
          const found = this.requireForward(session)
          await this.sftp.get(found.id, remotePath, localPath)
          return `已下载到 ${localPath}`
        })
    )

    server.registerTool(
      'sftp_rename',
      {
        description: '重命名或移动远端文件。from 和 to 都是远端路径。',
        inputSchema: { session: z.string(), from: z.string(), to: z.string() }
      },
      async ({ session, from, to }) =>
        this.run('sftp_rename', `${from} -> ${to}`, async () => {
          const found = this.requireForward(session)
          await this.guardPath(to)
          await this.sftp.rename(found.id, from, to)
          return `已改名为 ${to}`
        })
    )

    server.registerTool(
      'sftp_remove',
      {
        description: '删除远端文件或目录。目录会连同里面的内容一起删除。',
        inputSchema: { session: z.string(), path: z.string(), kind: z.enum(['file', 'dir', 'link']) }
      },
      async ({ session, path, kind }) =>
        this.run('sftp_remove', path, async () => {
          const found = this.requireForward(session)
          await this.guard(`rm ${path}`)
          await this.sftp.remove(found.id, path, kind)
          return `已删除 ${path}`
        })
    )

    server.registerTool(
      'local_term_open',
      {
        description: '打开一个本机终端标签，返回 termId。之后用 term_exec 执行命令。'
      },
      async () => this.run('local_term_open', '', () => this.openLocal())
    )

    server.registerTool(
      'term_screenshot',
      {
        description: '截取终端当前画面。抓的是窗口里已经渲染出来的终端视图。',
        annotations: { readOnlyHint: true },
        inputSchema: { termId: z.string() }
      },
      async ({ termId }) => this.run('term_screenshot', termId, () => this.capture(termId, 'viewport'))
    )

    server.registerTool(
      'term_screenshot_scrollback',
      {
        description:
          '滚动终端视图逐屏截图，再把这些实拍图按顺序接成长图。startLine / endLine 是缓冲行号，0 是最旧的一行。',
        annotations: { readOnlyHint: true },
        inputSchema: {
          termId: z.string(),
          startLine: z.number().int().min(0).optional(),
          endLine: z.number().int().min(0).optional()
        }
      },
      async ({ termId, startLine, endLine }) =>
        this.run('term_screenshot_scrollback', termId, () =>
          this.capture(termId, 'scrollback', startLine, endLine)
        )
    )

    return server
  }

  private async connectSession(key: string): Promise<string> {
    const session = this.findSession(key)
    if (session.mode === 'reverse') throw new Error('反向监听要在界面上点开始监听')
    const termId = `mcp-${randomUUID()}`
    const bound = this.terminal.expectBind(termId, 8000)
    this.send(IPC.mcpOpenTab, { termId, sessionId: session.id, kind: 'ssh', title: session.name })
    try {
      await bound
    } catch (error) {
      this.send(IPC.mcpCloseTab, termId)
      throw error
    }
    const connected = this.terminal.waitStatus(termId, 20_000)
    await this.terminal.create({ termId, kind: 'ssh', sessionId: session.id, cols: 120, rows: 32 })
    try {
      await connected
    } catch (error) {
      this.terminal.close(termId)
      this.send(IPC.mcpCloseTab, termId)
      throw error
    }
    return `已连接 ${session.name} (${session.username}@${session.host}:${session.port})\ntermId: ${termId}`
  }

  private createSession(input: SessionPatch & { name: string }): string {
    const saved = this.storage.create(this.normalize(null, input, true))
    this.publishSessions()
    return JSON.stringify(saved, null, 2)
  }

  private updateSession(key: string, patch: SessionPatch): string {
    const current = this.findSession(key)
    const saved = this.storage.update(current.id, this.normalize(current, patch, false))
    if (!saved) throw new Error('会话已不存在')
    this.publishSessions()
    return JSON.stringify(saved, null, 2)
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
      secret: patch.secret ? patch.secret : undefined
    }
    if (!input.name) throw new Error('名称不能为空')
    if (input.mode === 'forward') {
      if (!input.host || !input.username) throw new Error('主机和用户名不能为空')
      if (input.authType === 'key' && !input.keyPath) throw new Error('私钥认证需要填写 keyPath')
      if (creating && input.authType === 'password' && !input.secret) throw new Error('密码认证需要填写 secret')
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
    const termId = `mcp-${randomUUID()}`
    const bound = this.terminal.expectBind(termId, 8000)
    this.send(IPC.mcpOpenTab, { termId, sessionId: null, kind: 'local', title: '本地终端' })
    try {
      await bound
    } catch (error) {
      this.send(IPC.mcpCloseTab, termId)
      throw error
    }
    const connected = this.terminal.waitStatus(termId, 15_000)
    await this.terminal.create({ termId, kind: 'local', cols: 120, rows: 32 })
    try {
      await connected
    } catch (error) {
      this.terminal.close(termId)
      this.send(IPC.mcpCloseTab, termId)
      throw error
    }
    return `已打开本地终端\ntermId: ${termId}`
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

  private findSession(key: string) {
    const sessions = this.storage.list()
    const exact = sessions.find((s) => s.id === key || s.name === key)
    if (exact) return exact
    const matches = sessions.filter((s) => s.name.toLowerCase().includes(key.trim().toLowerCase()))
    if (matches.length === 1) return matches[0]!
    if (matches.length === 0) throw new Error(`找不到会话: ${key}`)
    throw new Error(`名称不唯一: ${matches.map((s) => s.name).join('、')}`)
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
    endLine?: number
  ): Promise<string> {
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
      wc.send(IPC.captureRun, { id, termId, mode, startLine, endLine })
    })
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

function stripAnsi(text: string): string {
  return text
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, '')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
}

function clip(text: string, max = 16_000): string {
  if (text.length <= max) return text
  return `${text.slice(-max)}\n…已截断，只保留最后 ${max} 个字符`
}
