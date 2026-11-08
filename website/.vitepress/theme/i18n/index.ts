import { createI18n } from 'vue-i18n'
import { messages } from './messages'

/** VitePress 的 locale lang 映射到本站支持的两份文案 */
export type SiteLocale = 'zh-CN' | 'en'

export const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN' as SiteLocale,
  fallbackLocale: 'en' as SiteLocale,
  messages,
  missingWarn: false,
  fallbackWarn: false
})

export function syncLocale(lang: string | undefined): void {
  const next: SiteLocale = lang && lang.startsWith('en') ? 'en' : 'zh-CN'
  if (i18n.global.locale.value !== next) i18n.global.locale.value = next
}

export function currentLocale(): SiteLocale {
  return i18n.global.locale.value as SiteLocale
}
