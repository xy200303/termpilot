import {
  DEFAULT_APPEARANCE,
  parseAppearance,
  type Appearance,
  type AppTheme
} from '../../../shared/types'
import { terminalPool } from '../terminal/TerminalPool'
import { terminalPalette } from './terminalThemes'

const CACHE_KEY = 'termpilot.appearance'

export type ResolvedAppTheme = 'light' | 'dark'

export function resolveAppTheme(app: AppTheme): ResolvedAppTheme {
  if (app === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return app
}

export function readCachedAppearance(): Appearance {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return DEFAULT_APPEARANCE
    return parseAppearance(JSON.parse(raw))
  } catch {
    return DEFAULT_APPEARANCE
  }
}

/** 立刻改界面和已打开的终端。persist 为真时记下这次选择，下次启动先用它，避免闪一下。 */
export function applyAppearance(appearance: Appearance, persist = true): ResolvedAppTheme {
  const resolved = resolveAppTheme(appearance.app)
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.documentElement.style.colorScheme = resolved
  const palette = terminalPalette(appearance.terminal)
  document.documentElement.style.setProperty('--terminal-background', palette.theme.background ?? '#ffffff')
  terminalPool.setTheme(palette.theme)
  if (persist) localStorage.setItem(CACHE_KEY, JSON.stringify(appearance))
  return resolved
}
