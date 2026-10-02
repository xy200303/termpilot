import type { StorageService } from './StorageService'
import type { SshHold, SshPool } from './SshPool'

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number | null
  /** 花了多少秒。 */
  duration: number
  timedOut: boolean
  /** stdout 或 stderr 因 maxBytes 被截断时为 true。截断保留开头和结尾。 */
  truncated: boolean
}

/** 单条流最多攒多少字符。超出后不再追加，防止输出洪水撑爆内存。 */
const CAP = 1_000_000

/**
 * 自动化命令通道：在共用 SSH 会话上开独立 exec 通道，不占终端画面，天然并发。
 * stdout/stderr 是原始字节流——不折行、无回显、无 ANSI；退出码来自协议事件，命令一结束就知道。
 * 脚本走 stdin 交给远端 bash（没有则 sh），命令原样嵌入，不经"键盘输入"，没有转义问题。
 * 填了 session 时，cd 和 export 存在远端 ~/.cache/termpilot/exec/ 下，下次同名 session 先回放；
 * 不填则每次都是全新环境。
 */
export class ExecService {
  /** 每条连接持有一个引用，和终端、文件树共用同一条 SSH 会话。 */
  private conns = new Map<string, Promise<SshHold>>()

  constructor(
    private storage: StorageService,
    private sshPool: SshPool
  ) {}

  private hold(sessionId: string): Promise<SshHold> {
    const cached = this.conns.get(sessionId)
    if (cached) return cached
    const session = this.storage.list().find((item) => item.id === sessionId)
    if (!session) throw new Error('这条连接已经删除了')
    const pending = this.sshPool.acquire(session, this.storage.getSecret(sessionId), this.storage.getJumpSecret(sessionId))
    this.conns.set(sessionId, pending)
    // 底层会话断开时主动丢掉缓存，下次 exec 重新拨号。
    // 否则缓存里一直留着死会话，之后每次 exec 都秒报 ssh2 的 Not connected
    pending
      .then((h) => {
        h.client.once('close', () => {
          if (this.conns.get(sessionId) === pending) this.conns.delete(sessionId)
        })
      })
      .catch(() => this.conns.delete(sessionId))
    return pending
  }

  async exec(
    sessionId: string,
    opts: { command: string; session?: string; prelude?: string; timeoutMs: number; maxBytes: number }
  ): Promise<ExecResult> {
    let hold = await this.hold(sessionId)
    try {
      return await this.runOnce(hold, opts)
    } catch (error) {
      // 通道开不起来（连接已断）：丢掉缓存引用重拨一条再试一次。
      // 此时命令从未发出，重试安全。重拨失败的错误（认证失败等）
      // 原样抛给调用方——不吞成 Not connected，真实原因必须可见
      this.conns.delete(sessionId)
      hold.release()
      hold = await this.hold(sessionId)
      return this.runOnce(hold, opts)
    }
  }

  private async runOnce(
    hold: SshHold,
    opts: { command: string; session?: string; prelude?: string; timeoutMs: number; maxBytes: number }
  ): Promise<ExecResult> {
    const name = opts.session?.replace(/[^\w-]/g, '_') || null
    const script = buildScript(name, opts.prelude ?? '', opts.command)
    const started = Date.now()
    const raw = await new Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }>(
      (resolve, reject) => {
        // 会话已死时 ssh2 从 exec() 同步抛 Not connected；
        // 执行器里的同步异常会自动 reject，交给上层重拨重试
        hold.client.exec('command -v bash >/dev/null 2>&1 && exec bash -s || exec sh -s', (error, stream) => {
          if (error) {
            reject(error)
            return
          }
          let stdout = ''
          let stderr = ''
          let exitCode: number | null = null
          let settled = false
          const timer = setTimeout(() => {
            if (settled) return
            settled = true
            try {
              stream.destroy()
            } catch {
              /* 已经断了 */
            }
            resolve({ stdout, stderr, exitCode, timedOut: true })
          }, opts.timeoutMs)
          stream.on('data', (data: Buffer) => {
            if (stdout.length < CAP) stdout += data.toString('utf8')
          })
          stream.stderr.on('data', (data: Buffer) => {
            if (stderr.length < CAP) stderr += data.toString('utf8')
          })
          stream.on('exit', (code: number | null) => {
            exitCode = code
          })
          stream.on('error', () => {
            /* close 会跟着来 */
          })
          stream.on('close', () => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            resolve({ stdout, stderr, exitCode, timedOut: false })
          })
          stream.write(script)
          stream.end()
        })
      }
    )
    const out = clipStream(raw.stdout, opts.maxBytes)
    const err = clipStream(raw.stderr, opts.maxBytes)
    return {
      stdout: out.text,
      stderr: err.text,
      exitCode: raw.exitCode,
      duration: Math.round(Date.now() - started) / 1000,
      timedOut: raw.timedOut,
      truncated: out.truncated || err.truncated
    }
  }
}

/**
 * 拼远端脚本。用户命令原样嵌在 { } 组里，stdin 重定向到 /dev/null，
 * 防止命令自己读 stdin 时把脚本后半截吃掉。有 session 名时才回放和
 * 保存环境状态（export -p 和 pwd）；没有就是全新环境，跑完即走。
 */
function buildScript(name: string | null, prelude: string, command: string): string {
  const parts: string[] = []
  if (name) {
    const dir = '$HOME/.cache/termpilot/exec'
    parts.push(
      'S="' + dir + '/' + name + '"',
      'mkdir -p "' + dir + '" 2>/dev/null && chmod 700 "' + dir + '" 2>/dev/null',
      'if [ -f "$S.env" ]; then . "$S.env" 2>/dev/null; fi',
      'if [ -f "$S.pwd" ]; then cd "$(cat "$S.pwd")" 2>/dev/null || true; fi'
    )
  }
  if (prelude.trim()) parts.push(prelude)
  parts.push('{', command, '} < /dev/null')
  if (name) {
    parts.push(
      'rc=$?',
      'export -p > "$S.env" 2>/dev/null && chmod 600 "$S.env" 2>/dev/null',
      'pwd > "$S.pwd" 2>/dev/null',
      'exit $rc'
    )
  }
  return parts.join('\n') + '\n'
}

/** 截断保留开头和结尾，中间注明原长。 */
function clipStream(text: string, max: number): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false }
  const head = Math.floor(max / 2)
  const tail = max - head
  return {
    text: `${text.slice(0, head)}\n…中间已截断，原长 ${text.length} 字符…\n${text.slice(-tail)}`,
    truncated: true
  }
}
