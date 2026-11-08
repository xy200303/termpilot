import en from '../shared/locales/en.json'
import zh from '../shared/locales/zh.json'

/** 主进程运行消息的语言，由外观设置和系统 locale 合成。 */
let locale: 'zh' | 'en' = 'en'

export function setMainLocale(next: 'zh' | 'en'): void {
  locale = next
}

export function getMainLocale(): 'zh' | 'en' {
  return locale
}

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text
  let out = text
  for (const [key, value] of Object.entries(params)) {
    out = out.split(`{{${key}}}`).join(String(value))
  }
  return out
}

/** 主进程消息：查不到 key 时回退英文，再回退 key 本身。 */
export function t(key: string, params?: Record<string, string | number>): string {
  const table = (locale === 'zh' ? zh : en) as Record<string, string>
  return interpolate(table[key] ?? key, params)
}
