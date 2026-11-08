import { defineConfig } from 'vitepress'

const SITE_URL = 'https://term.xyun.dev'
const SITE_NAME = 'TermPilot'
const SITE_TITLE = 'TermPilot — Agent 可操控的终端与远程桌面'
const SITE_DESC =
  '本机终端与图形桌面：SSH / Telnet / 串口 / VNC / RDP，多标签终端、SFTP 文件传输和双向剪贴板。内置 MCP Server，AI 助手接着你登录好的会话继续操作。'
const OG_IMAGE = `${SITE_URL}/og-image.png`
const REPO = 'https://github.com/xy200303/termpilot'
const VERSION = '0.9.0'

const EN_TITLE = 'TermPilot — terminals and desktops your agent can keep using'
const EN_DESC =
  'Local SSH / Telnet / serial terminals and VNC / RDP desktops with a built-in MCP server. Sign in yourself, then let your agent continue on the same session or the same desktop.'

/* 首页按系统语言选落地页：中文系统进中文首页，其余进 /en/。
   只在首页生效，深链接不劫持；用语言切换器选过就记住，不再自动跳。
   ?lang=zh / ?lang=en 可以强制并记住，分享链接也好用。 */
const LANG_BOOT = `(function () {
  try {
    var forced = new URLSearchParams(location.search).get('lang')
    if (forced === 'zh' || forced === 'en') localStorage.setItem('termpilot.lang', forced)
    var p = location.pathname
    if (p !== '/' && p !== '/index.html') return
    /* 爬虫的 Accept-Language 大多是 en-US，别把中文首页跳走，否则收录不到 */
    if (/bot|crawl|spider|slurp|preview/i.test(navigator.userAgent || '')) return
    var pick = localStorage.getItem('termpilot.lang')
    if (!pick) {
      var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']
      pick = /^zh\\b/i.test(String(list[0] || '')) ? 'zh' : 'en'
    }
    if (pick === 'en') location.replace('/en/')
  } catch (e) {}
})()`

/* 点语言切换器即视为明确选择，写进 localStorage，首页不再自动改回去 */
const LANG_CHOICE = `(function () {
  document.addEventListener('click', function (event) {
    var el = event.target
    var link = el && el.closest ? el.closest('.VPNavBarTranslations a, .VPNavScreenTranslations a') : null
    if (!link) return
    var href = link.getAttribute('href') || ''
    try {
      localStorage.setItem('termpilot.lang', href === '/en' || href.indexOf('/en/') === 0 ? 'en' : 'zh')
    } catch (e) {}
  }, true)
})()`

/* 两种语言都有的页面互相声明 hreflang；只在一侧存在的页面不加，避免指向 404 */
const LOCALE_ALTERNATES: Record<string, string> = {
  '': 'en/',
  'en/': '',
  download: 'en/download',
  'en/download': 'download',
  'guide/quickstart': 'en/guide/quickstart',
  'en/guide/quickstart': 'guide/quickstart'
}

const EN_NAV = [
  { text: 'Home', link: '/en/' },
  { text: 'Download', link: '/en/download' },
  { text: 'Docs', link: '/en/guide/quickstart' },
  { text: 'GitHub', link: REPO }
]

const EN_SIDEBAR = {
  '/en/guide/': [
    {
      text: 'Guide',
      items: [{ text: 'Quick start', link: '/en/guide/quickstart' }]
    }
  ]
}

const JSON_LD_KEYWORDS = {
  zh: 'SSH 终端,SFTP,Telnet,串口,VNC,RDP,MCP,AI Agent,终端模拟器',
  en: 'SSH terminal,SFTP,Telnet,serial,VNC,RDP,MCP,AI agent,terminal emulator'
}

const softwareJsonLd = (isEn: boolean) => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Windows, macOS, Linux',
  description: isEn ? EN_DESC : SITE_DESC,
  inLanguage: isEn ? 'en' : 'zh-CN',
  url: SITE_URL,
  downloadUrl: `${REPO}/releases/latest`,
  softwareVersion: VERSION,
  license: `${REPO}/blob/main/LICENSE`,
  author: { '@type': 'Person', name: 'xy200303', url: 'https://github.com/xy200303' },
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
  keywords: isEn ? JSON_LD_KEYWORDS.en : JSON_LD_KEYWORDS.zh
})

const websiteJsonLd = (isEn: boolean) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: isEn ? EN_DESC : SITE_DESC,
  inLanguage: isEn ? 'en' : 'zh-CN'
})

const META_KEYWORDS = {
  zh: 'SSH 终端,SFTP 文件传输,Telnet,串口终端,VNC,RDP,远程桌面,MCP Server,AI Agent 终端,TermPilot',
  en: 'SSH terminal,SFTP transfer,Telnet,serial console,VNC,RDP,remote desktop,MCP server,AI agent terminal,TermPilot'
}

const OG_ALT = {
  zh: 'TermPilot — Agent 可操控的终端与远程桌面',
  en: 'TermPilot — terminals and desktops your agent can keep using'
}

export default defineConfig({
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: SITE_TITLE,
      description: SITE_DESC
    },
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      title: EN_TITLE,
      description: EN_DESC,
      themeConfig: {
        nav: EN_NAV,
        sidebar: EN_SIDEBAR,
        outline: { label: 'On this page' },
        docFooter: { prev: 'Previous', next: 'Next' },
        lastUpdated: { text: 'Last updated' },
        returnToTopLabel: 'Back to top',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Appearance',
        langMenuLabel: 'Change language',
        footer: {
          message: `Open source under the <a href="${REPO}/blob/main/LICENSE" target="_blank" rel="noopener">MIT license</a> · <a href="/en/download">Download</a> · <a href="/en/guide/quickstart">Docs</a> · <a href="${REPO}/blob/main/CHANGELOG.md" target="_blank" rel="noopener">Changelog</a> · <a href="${REPO}" target="_blank" rel="noopener">GitHub</a>`,
          copyright: 'Copyright © 2026 xy200303'
        }
      }
    }
  },
  lang: 'zh-CN',
  title: SITE_TITLE,
  description: SITE_DESC,
  base: '/',
  appearance: 'force-light',
  lastUpdated: true,
  cleanUrls: true,
  srcExclude: ['README.md'],
  sitemap: { hostname: SITE_URL },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['link', { rel: 'stylesheet', href: '/fonts/noto/noto-sans-sc.css' }],
    ['link', { rel: 'stylesheet', href: '/fonts/mono/jetbrains-mono.css' }],
    ['meta', { name: 'author', content: 'xy200303' }],
    ['meta', { name: 'robots', content: 'index,follow,max-image-preview:large' }],
    ['meta', { name: 'theme-color', content: '#f9f9f8' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: SITE_NAME }],
    ['meta', { property: 'og:image', content: OG_IMAGE }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: OG_IMAGE }],
    ['script', {}, LANG_BOOT],
    ['script', {}, LANG_CHOICE]
  ],
  /* 页头里与语言相关的标签按页面语言生成，避免英文页带着中文的
     description / og / JSON-LD 被搜索引擎和社交卡片读到 */
  transformHead({ pageData }) {
    const path = pageData.relativePath.replace(/index\.md$/, '').replace(/\.md$/, '')
    const isEn = path === 'en/' || path.startsWith('en/')
    const url = `${SITE_URL}/${path}`
    const siteTitle = isEn ? EN_TITLE : SITE_TITLE
    const description = pageData.description || (isEn ? EN_DESC : SITE_DESC)
    const title = !pageData.title || pageData.title === siteTitle ? siteTitle : `${pageData.title} | ${siteTitle}`
    const head: Array<[string, Record<string, string>, string?]> = [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { name: 'keywords', content: isEn ? META_KEYWORDS.en : META_KEYWORDS.zh }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:locale', content: isEn ? 'en_US' : 'zh_CN' }],
      ['meta', { property: 'og:locale:alternate', content: isEn ? 'zh_CN' : 'en_US' }],
      ['meta', { property: 'og:image:alt', content: isEn ? OG_ALT.en : OG_ALT.zh }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }],
      ['script', { type: 'application/ld+json' }, JSON.stringify(softwareJsonLd(isEn))],
      ['script', { type: 'application/ld+json' }, JSON.stringify(websiteJsonLd(isEn))]
    ]
    const alternate = LOCALE_ALTERNATES[path]
    if (alternate !== undefined) {
      head.push(['link', { rel: 'alternate', hreflang: isEn ? 'zh-CN' : 'en', href: `${SITE_URL}/${alternate}` }])
      head.push(['link', { rel: 'alternate', hreflang: 'x-default', href: `${SITE_URL}/` }])
    }
    return head
  },
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'TermPilot',
    nav: [
      { text: '首页', link: '/' },
      { text: '下载', link: '/download' },
      { text: '文档', link: '/guide/quickstart' },
      { text: '更新日志', link: '/changelog' },
      { text: 'GitHub', link: REPO }
    ],
    sidebar: {
      '/guide/': [
        {
          text: '使用文档',
          items: [
            { text: '快速开始', link: '/guide/quickstart' },
            { text: '界面导览', link: '/guide/interface' },
            { text: '核心概念', link: '/guide/concepts' },
            { text: '故障排查', link: '/guide/troubleshooting' }
          ]
        }
      ]
    },
    outline: { label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdated: { text: '最后更新' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '外观',
    langMenuLabel: '切换语言',
    socialLinks: [{ icon: 'github', link: REPO }],
    footer: {
      message: `以 <a href="${REPO}/blob/main/LICENSE" target="_blank" rel="noopener">MIT 协议</a> 开源 · <a href="/download">下载</a> · <a href="/guide/quickstart">文档</a> · <a href="/changelog">更新日志</a> · <a href="${REPO}" target="_blank" rel="noopener">GitHub</a>`,
      copyright: 'Copyright © 2026 xy200303'
    }
  }
})
