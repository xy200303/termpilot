import { defineConfig } from 'vitepress'

const SITE_URL = 'https://term.xyun.dev'
const SITE_NAME = 'TermPilot'
const SITE_TITLE = 'TermPilot — Agent 可操控的 SSH 终端'
const SITE_DESC =
  '本机 SSH 终端：SSH / Telnet / 串口三协议，多标签终端与 SFTP 文件传输，凭据加密存本机。内置 MCP Server，AI 助手接着你登录好的会话继续操作。'
const OG_IMAGE = `${SITE_URL}/og-image.png`
const REPO = 'https://github.com/xy200303/termpilot'
const VERSION = '0.7.8'

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
  appearance: 'force-light',
  lastUpdated: true,
  cleanUrls: true,
  srcExclude: ['README.md'],
  sitemap: { hostname: SITE_URL },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['link', { rel: 'stylesheet', href: '/fonts/noto/noto-sans-sc.css' }],
    ['link', { rel: 'stylesheet', href: '/fonts/mono/jetbrains-mono.css' }],
    ['meta', { name: 'keywords', content: 'SSH 终端,SFTP 文件传输,Telnet,串口终端,MCP Server,AI Agent 终端,TermPilot' }],
    ['meta', { name: 'author', content: 'xy200303' }],
    ['meta', { name: 'robots', content: 'index,follow,max-image-preview:large' }],
    ['meta', { name: 'theme-color', content: '#f9f9f8' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: SITE_NAME }],
    ['meta', { property: 'og:title', content: SITE_TITLE }],
    ['meta', { property: 'og:description', content: SITE_DESC }],
    ['meta', { property: 'og:url', content: SITE_URL }],
    ['meta', { property: 'og:image', content: OG_IMAGE }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: 'TermPilot — Agent 可操控的 SSH 终端' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: SITE_TITLE }],
    ['meta', { name: 'twitter:description', content: SITE_DESC }],
    ['meta', { name: 'twitter:image', content: OG_IMAGE }],
    ['script', { type: 'application/ld+json' }, JSON.stringify(softwareJsonLd)],
    ['script', { type: 'application/ld+json' }, JSON.stringify(websiteJsonLd)]
  ],
  transformHead({ pageData }) {
    const path = pageData.relativePath.replace(/index\.md$/, '').replace(/\.md$/, '')
    return [['link', { rel: 'canonical', href: `${SITE_URL}/${path}` }]]
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
    socialLinks: [{ icon: 'github', link: REPO }],
    footer: {
      message: `以 <a href="${REPO}/blob/main/LICENSE" target="_blank" rel="noopener">MIT 协议</a> 开源 · <a href="/download">下载</a> · <a href="/guide/quickstart">文档</a> · <a href="/changelog">更新日志</a> · <a href="${REPO}" target="_blank" rel="noopener">GitHub</a>`,
      copyright: 'Copyright © 2026 xy200303'
    }
  }
})
