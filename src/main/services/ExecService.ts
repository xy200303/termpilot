import type { StorageService } from './StorageService'
import type { SshHold, SshPool } from './SshPool'

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number | null
  finished: boolean
}

/** 单条流最多攒多少字符。超出后不再追加，防止输出洪水撑爆内存。 */
const CAP = 1_000_000

/**
 * 自动化命令通道：在共用 SSH 会话上开独立 exec 通道，不占终端画面，天然并发。
 * stdout/stderr 是原始字节流——不折行、无回显、无 ANSI；退出码来自协议事件，命令一结束就知道。
 * 脚本走 stdin 交给远端 bash（没有则 sh），命令原样嵌入，不经"键盘输入"，没有转义问题。
 * 同名 session 的 cd 和 export 存在远端 ~/.cache/termpilot/exec2/ 下，下次执行先回放。
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
    pending.catch(() => this.conns.delete(sessionId))
    return pending
  }

  async exec(
    sessionId: string,
    opts: { command: string; session?: string; prelude?: string; timeoutMs: number }
  ): Promise<ExecResult> {
    const hold = await this.hold(sessionId)
    const name = (opts.session ?? 'main').replace(/[^\w-]/g, '_') || 'main'
    const script = buildScript(name, opts.prelude ?? '', opts.command)
    return new Promise<ExecResult>((resolve, reject) => {
      hold.client.exec('command -v bash >/dev/null 2>&1 && exec bash -s || exec sh -s', (error, stream) => {
        if (error) {
          // 通道开不起来多半是连接断了，丢掉缓存的引用，下次重新拨号
          this.conns.delete(sessionId)
          hold.release()
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
          resolve({ stdout, stderr, exitCode, finished: false })
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
          resolve({ stdout, stderr, exitCode, finished: exitCode !== null })
        })
        stream.write(script)
        stream.end()
      })
    })
  }
}

/**
 * 拼远端脚本。用户命令原样嵌在 { } 组里，stdin 重定向到 /dev/null，
 * 防止命令自己读 stdin 时把脚本后半截吃掉。环境状态（export -p 和 pwd）
 * 落在远端状态文件里，下次同名 session 先回放再执行。
 */
function buildScript(name: string, prelude: string, command: string): string {
  const dir = '$HOME/.cache/termpilot/exec2'
  const parts = [
    'S="' + dir + '/' + name + '"',
    'mkdir -p "' + dir + '" 2>/dev/null && chmod 700 "' + dir + '" 2>/dev/null',
    'if [ -f "$S.env" ]; then . "$S.env" 2>/dev/null; fi',
    'if [ -f "$S.pwd" ]; then cd "$(cat "$S.pwd")" 2>/dev/null || true; fi'
  ]
  if (prelude.trim()) parts.push(prelude)
  parts.push(
    '{',
    command,
    '} < /dev/null',
    'rc=$?',
    'export -p > "$S.env" 2>/dev/null && chmod 600 "$S.env" 2>/dev/null',
    'pwd > "$S.pwd" 2>/dev/null',
    'exit $rc'
  )
  return parts.join('\n') + '\n'
}
