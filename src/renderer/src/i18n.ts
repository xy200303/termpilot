import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import en from './locales/en.json'
import zh from './locales/zh.json'

/**
 * 英文原文就是 key（i18next 标准资源格式），zh.json 提供中文映射，en 直接返回 key。
 */
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, zh: { translation: zh } },
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['zh', 'en'],
    // 中文原文当 key：不要按 . 或 : 拆命名空间
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    returnNull: false,
    debug: false
  })
}

export type Translate = (text: string, params?: Record<string, string | number>) => string

/** 组件里用它拿翻译：中文返回原文，英文查表，查不到回退中文。 */
export function useT(): Translate {
  const { t } = useTranslation()
  return (text, params) => t(text, { ...(params ?? {}), defaultValue: text }) as string
}

export function syncLanguage(locale: 'zh' | 'en'): void {
  if (i18n.language !== locale) void i18n.changeLanguage(locale)
}

export default i18n
