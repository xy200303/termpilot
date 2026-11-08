import { useCallback } from 'react'
import { useAppStore } from './stores/useAppStore'
import { EN } from './i18n-en'

export type Translate = (text: string, params?: Record<string, string | number>) => string

export function translate(locale: 'zh' | 'en', text: string, params?: Record<string, string | number>): string {
  let out = locale === 'en' ? (EN[text] ?? text) : text
  if (params) {
    for (const [key, value] of Object.entries(params)) out = out.split(`{${key}}`).join(String(value))
  }
  return out
}

/** 组件里用它拿翻译：中文返回原字符串，英文查表，查不到先回退中文。 */
export function useT(): Translate {
  const locale = useAppStore((state) => state.locale)
  return useCallback((text, params) => translate(locale, text, params), [locale])
}
