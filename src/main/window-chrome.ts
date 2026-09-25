import { BrowserWindow, nativeTheme, type WebContents } from 'electron'
import type { AppTheme } from '../shared/types'

const HEIGHT = 40

/** 和界面 --background 对齐。深色是 oklch(0.145 0 0)。 */
function chrome(dark: boolean): { color: string; symbolColor: string; height: number } {
  return dark
    ? { color: '#0a0a0a', symbolColor: '#fafafa', height: HEIGHT }
    : { color: '#ffffff', symbolColor: '#3f3f46', height: HEIGHT }
}

export function windowBackground(dark: boolean): string {
  return dark ? '#0a0a0a' : '#ffffff'
}

export function isDarkChrome(): boolean {
  return nativeTheme.shouldUseDarkColors
}

/** 让系统标题栏按钮跟着应用主题。跟随系统时，系统切换也会触发 updated。 */
export function followAppTheme(appTheme: AppTheme): boolean {
  nativeTheme.themeSource = appTheme === 'system' ? 'system' : appTheme
  return nativeTheme.shouldUseDarkColors
}

export function paintWindowChrome(win: BrowserWindow, dark = isDarkChrome()): void {
  if (process.platform !== 'win32' || win.isDestroyed()) return
  win.setTitleBarOverlay(chrome(dark))
  win.setBackgroundColor(windowBackground(dark))
}

export function paintFromContents(contents: WebContents, appTheme: AppTheme): void {
  const dark = followAppTheme(appTheme)
  const win = BrowserWindow.fromWebContents(contents)
  if (win) paintWindowChrome(win, dark)
}

export function watchSystemChrome(): void {
  nativeTheme.on('updated', () => {
    const dark = nativeTheme.shouldUseDarkColors
    for (const win of BrowserWindow.getAllWindows()) {
      // 窗口还没显示时改背景色，Windows 会把第一帧停在白屏。
      if (!win.isVisible()) continue
      paintWindowChrome(win, dark)
    }
  })
}

export function titleBarOverlay(dark: boolean): { color: string; symbolColor: string; height: number } {
  return chrome(dark)
}
