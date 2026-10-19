import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8')
) as { version: string }

const SITE_URL = 'https://term.xyun.dev'
const SITE_NAME = 'TermPilot'
const SITE_TITLE = 'TermPilot — Agent 可操控的 SSH 终端'
const SITE_DESC =
  '本机 SSH 终端：SSH / Telnet / 串口三协议，多标签终端与 SFTP 文件传输，凭据加密存本机。内置 MCP Server，AI 助手接着你登录好的会话继续操作。'
const OG_IMAGE = `${SITE_URL}/og-image.png`
const REPO = 'https://github.com/xy200303/termpilot'
const VERSION = pkg.version

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Windows, macOS, Linux',
  description: SITE_DESC,
  url: SITE_URL,
  downloadUrl: `${REPO}/releases/latest`,
  softwareVersion: VERSION,
  license: `${REPO}/blob/main/LICENSE`,
  author: { '@type': 'Person', name: 'xy200303', url: 'https://github.com/xy200303' },
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
  screenshot: `${SITE_URL}/shots/hero.png`,
  featureList: [
    'SSH / Telnet / 串口连接',
    '多标签终端与本机终端',
    '独立 exec 通道，同名 session 承接 cd / export',
    'SFTP 上传、下载、新建目录、改名、删除',
    '凭据用系统钥匙串加密，只存本机',
    '内置 MCP Server，25 个 Agent 工具'
  ],
  keywords: 'SSH 终端,SFTP,Telnet,串口,MCP,AI Agent,终端模拟器'
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESC,
  inLanguage: 'zh-CN'
}

export default defineConfig({
  lang: 'zh-CN',
  title: SITE_TITLE,
  description: SITE_DESC,
  base: '/',
  appearance: false,
  lastUpdated: true,
  cleanUrls: true,
  srcExclude: ['README.md', 'og.html'],
  sitemap: { hostname: SITE_URL },
  vite: {
    define: {
      __APP_VERSION__: JSON.stringify(VERSION)
    }
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'stylesheet', href: '/fonts/noto/noto-sans-sc.css' }],
    ['link', { rel: 'stylesheet', href: '/fonts/mono/jetbrains-mono.css' }],
    ['meta', { name: 'keywords', content: 'SSH 终端,SFTP 文件传输,Telnet,串口终端,MCP Server,AI Agent 终端,TermPilot' }],
    ['meta', { name: 'author', content: 'xy200303' }],
    ['meta', { name: 'robots', content: 'index,follow,max-image-preview:large' }],
    ['meta', { name: 'theme-color', content: '#f9f9f8' }],
    ['meta', { name: 'color-scheme', content: 'light' }],
    ['meta', { name: 'application-name', content: SITE_NAME }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: SITE_NAME }],
    ['meta', { property: 'og:locale', content: 'zh_CN' }],
    ['meta', { property: 'og:image', content: OG_IMAGE }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: 'TermPilot — 你的终端，助手可以接着用' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: OG_IMAGE }],
    ['meta', { name: 'twitter:image:alt', content: 'TermPilot — 你的终端，助手可以接着用' }],
    ['script', { type: 'application/ld+json' }, JSON.stringify(softwareJsonLd)],
    ['script', { type: 'application/ld+json' }, JSON.stringify(websiteJsonLd)]
  ],
  transformHead({ pageData }) {
    const relative = pageData.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
    const url = relative ? `${SITE_URL}/${relative}` : `${SITE_URL}/`
    const title = (pageData.frontmatter.title as string | undefined) ?? SITE_TITLE
    const description = (pageData.frontmatter.description as string | undefined) ?? SITE_DESC
    const isHome = relative === ''
    return [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:type', content: isHome ? 'website' : 'article' }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }]
    ]
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
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdated: { text: '最后更新' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '外观',
    socialLinks: [{ icon: 'github', link: REPO }],
    footer: {
      message: `以 <a href="${REPO}/blob/main/LICENSE" target="_blank" rel="noopener">MIT 协议</a> 开源 · <a href="/download">下载</a> · <a href="/guide/quickstart">文档</a> · <a href="/changelog">更新日志</a> · <a href="${REPO}" target="_blank" rel="noopener">GitHub</a>`,
      copyright: 'Copyright © 2026 xy200303'
    }
  }
})
