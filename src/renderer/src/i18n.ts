import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import { EN } from './i18n-en'

/**
 * 中文原文就是 key；en 只提供映射。切到 zh 时 i18next 查不到资源会原样返回 key，
 * 所以不用维护一份中文资源，新增文案只改代码即可。
 */
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { en: { translation: EN } },
    lng: 'zh',
    fallbackLng: 'zh',
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
