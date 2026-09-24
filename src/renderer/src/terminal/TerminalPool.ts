import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import '@xterm/xterm/css/xterm.css'

/**
 * 进程级 xterm 单例池（关键设计，见 docs/技术方案.md §4.2）：
 *
 * 每个终端（= 标签页）对应全应用唯一的 Terminal 实例，挂在游离的 host div 上。
 * 视图挂载时只做 re-parent（appendChild），卸载时 detach 而不销毁 ——
 * 这样切换标签、折叠面板后 scrollback 缓冲不丢失，TUI 程序无需重绘。
 *
 * 渲染器：WebGL 为默认（GPU 加速），context loss 时自动重建；失败回退 Canvas。
 */

interface PoolEntry {
  term: Terminal
  fit: FitAddon
  host: HTMLDivElement
  disposeData: () => void
}

class TerminalPool {
  private entries = new Map<string, PoolEntry>()

  ensure(termId: string): PoolEntry {
    const existing = this.entries.get(termId)
    if (existing) return existing

    const term = new Terminal({
      fontFamily: 'Consolas, "Cascadia Mono", "Microsoft YaHei", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 50000,
      allowProposedApi: true,
      // 浅色终端主题（与整体浅色 UI 一致）
      theme: {
        background: '#ffffff',
        foreground: '#1f2937',
        cursor: '#2563eb',
        cursorAccent: '#ffffff',
        selectionBackground: '#bfdbfe',
        black: '#1f2937',
        red: '#dc2626',
        green: '#16a34a',
        yellow: '#ca8a04',
        blue: '#2563eb',
        magenta: '#c026d3',
        cyan: '#0891b2',
        white: '#e2e8f0',
        brightBlack: '#64748b',
        brightRed: '#ef4444',
        brightGreen: '#22c55e',
        brightYellow: '#eab308',
        brightBlue: '#3b82f6',
        brightMagenta: '#d946ef',
        brightCyan: '#06b6d4',
        brightWhite: '#f8fafc'
      }
    })

    const fit = new FitAddon()
    term.loadAddon(fit)

    const host = document.createElement('div')
    host.style.width = '100%'
    host.style.height = '100%'
    host.style.overflow = 'hidden'
    term.open(host)

    this.enableWebgl(term)

    // 键盘/粘贴输入 → 主进程
    term.onData((d) => window.api.term.input(termId, d))
    // xterm 尺寸变化（fit 之后）→ 同步远端 PTY 窗口
    term.onResize(({ cols, rows }) => window.api.term.resize(termId, cols, rows))

    // 主进程数据 → xterm
    const disposeData = window.api.term.onData((id, data) => {
      if (id === termId) term.write(data)
    })

    const entry: PoolEntry = { term, fit, host, disposeData }
    this.entries.set(termId, entry)
    return entry
  }

  /** 挂载到指定容器（re-parent），并做一次同步 fit + 下一帧 refit 强制重绘 */
  attach(termId: string, el: HTMLElement): void {
    const e = this.ensure(termId)
    if (e.host.parentElement !== el) el.appendChild(e.host)
    this.fit(termId)
    requestAnimationFrame(() => {
      if (e.host.parentElement === el) {
        this.fit(termId)
        e.term.focus()
      }
    })
  }

  detach(termId: string): void {
    const e = this.entries.get(termId)
    if (e?.host.parentElement) e.host.parentElement.removeChild(e.host)
  }

  fit(termId: string): void {
    const e = this.entries.get(termId)
    if (!e || !e.host.parentElement) return
    try {
      e.fit.fit()
    } catch {
      /* 容器不可见（0 尺寸）时 fit 会抛错，忽略 */
    }
  }

  /** 向终端写入文本（用于打印连接错误等本地提示） */
  write(termId: string, text: string): void {
    this.entries.get(termId)?.term.write(text)
  }

  /**
   * 字符网格的位置。截图用这块，不把滚动条和外面的留白拍进去，
   * 这样每一行在图片里的高度是稳定的。
   */
  screenRect(termId: string): { x: number; y: number; width: number; height: number } | null {
    const host = this.entries.get(termId)?.host
    const screen = host?.querySelector('.xterm-screen')
    if (screen instanceof HTMLElement && screen.isConnected) return boxOf(screen)
    return this.clientRect(termId)
  }

  /** 终端视图在页面上的位置。没挂到画面上时返回 null */
  clientRect(termId: string): { x: number; y: number; width: number; height: number } | null {
    const host = this.entries.get(termId)?.host
    if (!host?.isConnected) return null
    return boxOf(host)
  }

  pageInfo(termId: string): { viewportY: number; length: number; rows: number } | null {
    const term = this.entries.get(termId)?.term
    if (!term) return null
    return {
      viewportY: term.buffer.active.viewportY,
      length: term.buffer.active.length,
      rows: term.rows
    }
  }

  scrollTo(termId: string, line: number): void {
    this.entries.get(termId)?.term.scrollToLine(line)
  }

  dispose(termId: string): void {
    const e = this.entries.get(termId)
    if (!e) return
    e.disposeData()
    e.term.dispose()
    this.entries.delete(termId)
  }

  private enableWebgl(term: Terminal): void {
    try {
      const webgl = new WebglAddon()
      webgl.onContextLoss(() => {
        // GPU 驱动崩溃 / 休眠恢复后重建渲染器
        webgl.dispose()
        this.enableWebgl(term)
      })
      term.loadAddon(webgl)
    } catch {
      // WebGL 不可用时 xterm 自动回退 Canvas 渲染器
    }
  }
}

function boxOf(el: HTMLElement): { x: number; y: number; width: number; height: number } | null {
  const rect = el.getBoundingClientRect()
  const box = {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  }
  if (box.width < 2 || box.height < 2) return null
  return box
}

export const terminalPool = new TerminalPool()
