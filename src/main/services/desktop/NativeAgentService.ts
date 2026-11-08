import { execFile } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { app } from 'electron'
import type { DesktopAgentInput } from '../../../shared/desktop-agent'

const execFileAsync = promisify(execFile)

/** Windows 原生窗口输入与截图。只操作 TermPilot 自己启动的客户端 PID。 */
export class NativeAgentService {
  async run(pid: number, input: DesktopAgentInput): Promise<{ note: string; file?: string }> {
    if (process.platform !== 'win32') {
      throw new Error('RDP 原生窗口 Agent 操作目前仅支持 Windows；VNC 内嵌画面三平台都可操作')
    }
    if (input.action === 'screenshot') return this.capture(pid)
    if (input.action === 'wait') {
      if ((input.stableMs ?? 0) > 0) throw new Error('原生窗口只支持固定时间等待，不支持画面稳定检测')
      const ms = Math.max(0, Math.min(input.ms ?? 500, 60_000))
      await new Promise((resolve) => setTimeout(resolve, ms))
      return { note: `已等待 ${ms}ms` }
    }
    if (input.action === 'click') {
      const flags = input.button === 'right' ? '0x0018' : input.button === 'middle' ? '0x0020' : '0x0006'
      const count = input.double ? 2 : 1
      const px = input.fromWidth ? `[math]::Round(${Math.round(input.x)} * $winW / ${input.fromWidth})` : String(Math.round(input.x))
      const py = input.fromHeight ? `[math]::Round(${Math.round(input.y)} * $winH / ${input.fromHeight})` : String(Math.round(input.y))
      await this.script(pid, `
${windowApi()}
$h = (Get-Process -Id ${pid}).MainWindowHandle
if ($h -eq 0) { throw '原生窗口尚未创建完成' }
$r = New-Object Win32+RECT
[Win32]::GetWindowRect($h, [ref]$r) | Out-Null
$winW = $r.Right - $r.Left
$winH = $r.Bottom - $r.Top
[Win32]::SetForegroundWindow($h) | Out-Null
[Win32]::SetCursorPos($r.Left + ${px}, $r.Top + ${py}) | Out-Null
1..${count} | ForEach-Object { [Win32]::mouse_event(${flags}, 0, 0, 0, [UIntPtr]::Zero) }
`)
      return { note: `已点击原生窗口 (${input.x}, ${input.y})` }
    }
    if (input.action === 'scroll') {
      const move =
        input.x === undefined || input.y === undefined
          ? ''
          : `[Win32]::SetCursorPos($r.Left + ${input.fromWidth ? `[math]::Round(${Math.round(input.x)} * $winW / ${input.fromWidth})` : Math.round(input.x)}, $r.Top + ${input.fromHeight ? `[math]::Round(${Math.round(input.y)} * $winH / ${input.fromHeight})` : Math.round(input.y)}) | Out-Null`
      await this.script(pid, `
${windowApi()}
$h = (Get-Process -Id ${pid}).MainWindowHandle
if ($h -eq 0) { throw '原生窗口尚未创建完成' }
$r = New-Object Win32+RECT
[Win32]::GetWindowRect($h, [ref]$r) | Out-Null
$winW = $r.Right - $r.Left
$winH = $r.Bottom - $r.Top
[Win32]::SetForegroundWindow($h) | Out-Null
${move}
[Win32]::mouse_event(0x0800, 0, 0, ${-Math.round(input.deltaY)}, [UIntPtr]::Zero)
`)
      return { note: `已滚动原生窗口 ${input.deltaY}` }
    }
    if (input.action === 'key') {
      const keys = sendKeys(input.keys)
      await this.script(pid, `
Add-Type -AssemblyName System.Windows.Forms
$h = (Get-Process -Id ${pid}).MainWindowHandle
if ($h -eq 0) { throw '原生窗口尚未创建完成' }
[Win32]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 100
[System.Windows.Forms.SendKeys]::SendWait('${keys}')
`)
      return { note: `已发送原生按键 ${input.keys}` }
    }
    const text = Buffer.from(input.text, 'utf8').toString('base64')
    await this.script(pid, `
Add-Type -AssemblyName System.Windows.Forms
$h = (Get-Process -Id ${pid}).MainWindowHandle
if ($h -eq 0) { throw '原生窗口尚未创建完成' }
[Win32]::SetForegroundWindow($h) | Out-Null
$text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${text}'))
Set-Clipboard -Value $text
Start-Sleep -Milliseconds 100
[System.Windows.Forms.SendKeys]::SendWait('^v')
`)
    return { note: `已通过剪贴板粘贴 ${input.text.length} 个字符` }
  }

  private async capture(pid: number): Promise<{ note: string; file: string }> {
    const dir = join(app.getPath('userData'), 'screenshots')
    mkdirSync(dir, { recursive: true })
    const file = join(dir, `native-${pid}-${Date.now()}.png`)
    await this.script(pid, `
Add-Type -AssemblyName System.Drawing
${windowApi()}
$h = (Get-Process -Id ${pid}).MainWindowHandle
if ($h -eq 0) { throw '原生窗口尚未创建完成' }
$r = New-Object Win32+RECT
[Win32]::GetWindowRect($h, [ref]$r) | Out-Null
$w = $r.Right - $r.Left
$height = $r.Bottom - $r.Top
if ($w -le 0 -or $height -le 0) { throw '原生窗口尺寸无效' }
$bmp = New-Object System.Drawing.Bitmap $w, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
[Win32]::PrintWindow($h, $hdc, 2) | Out-Null
$g.ReleaseHdc($hdc)
$g.Dispose()
$bmp.Save('${file.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
`)
    return { note: '原生窗口已截图', file }
  }

  private async script(pid: number, body: string): Promise<void> {
    try {
      await execFileAsync('powershell.exe', ['-NoProfile', '-Command', body], {
        timeout: 20_000,
        windowsHide: true,
        maxBuffer: 2 * 1024 * 1024
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`操作原生窗口（PID ${pid}）失败：${message}`)
    }
  }
}

function windowApi(): string {
  return `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, int data, UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
`
}

function sendKeys(combo: string): string {
  const parts = combo.toLowerCase().split('-').filter(Boolean)
  const main = parts.pop() ?? ''
  const prefix = `${parts.includes('ctrl') || parts.includes('control') ? '^' : ''}${parts.includes('alt') ? '%' : ''}${parts.includes('shift') ? '+' : ''}`
  const named: Record<string, string> = {
    enter: '~',
    esc: '{ESC}',
    escape: '{ESC}',
    tab: '{TAB}',
    up: '{UP}',
    down: '{DOWN}',
    left: '{LEFT}',
    right: '{RIGHT}',
    home: '{HOME}',
    end: '{END}',
    pageup: '{PGUP}',
    pagedown: '{PGDN}',
    backspace: '{BS}',
    delete: '{DEL}',
    space: ' '
  }
  const text = named[main] ?? main
  return `${prefix}${text}`.replace(/'/g, "''")
}
