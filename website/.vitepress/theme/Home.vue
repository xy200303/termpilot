<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { withBase } from 'vitepress'
import { DOWNLOADS, RELEASE_TAG, REPO, VERSION } from '../data/site'

const announcement = {
  version: `v${VERSION}`,
  text: '不再写回 ~/.ssh/config；文件通道可按连接复用或单独拨号',
  link: RELEASE_TAG
}

const stats = [
  { value: '3', unit: '类', label: '连接协议', note: 'SSH / Telnet / 串口' },
  { value: '25', unit: '个', label: 'Agent 工具', note: '连接、命令、屏幕、文件' },
  { value: '0', unit: '条', label: '遥测上报', note: '没有统计与崩溃上报' },
  { value: '143', unit: 'MB', label: 'Windows 安装包', note: '三平台共 6 个安装包' }
]

const tracks = [
  {
    no: '01',
    title: '连接',
    summary: 'SSH、Telnet、串口放在同一个连接列表里。保存一次，之后点一下就能开终端。',
    points: [
      'SSH 支持密码、私钥、多跳跳板和 ProxyCommand，也能从 ~/.ssh/config 导入 Host。',
      'Telnet 处理 IAC 协商；串口的波特率、数据位、停止位、校验都可配。',
      '没有公网地址的机器用反向监听连回本机，监听只绑 127.0.0.1。',
      '同一主机可以保存多个账号，按主机分组；备注写在这台机器上，不写进连接名。'
    ]
  },
  {
    no: '02',
    title: '操作',
    summary: '你登录好的终端，助手接着用。不需要把密码交出去，也不用另开一条会话。',
    points: [
      'term_exec 走独立 exec 通道：stdout / stderr 分流，退出码来自协议，不占终端画面。',
      '同名 session 承接 cd 和 export；下一次调用还在同一个工作目录。',
      'term_pty 往已打开的终端发按键，TUI、菜单和安装向导都能走。',
      '删除文件或写系统路径前暂停，在窗口里等你确认。'
    ]
  },
  {
    no: '03',
    title: '传输',
    summary: '文件面板和终端共用同一条 SSH 会话。掉线、重登、再传一次这些事少一件。',
    points: [
      '上传、下载、新建目录、改名、删除；单文件上限 512MB。',
      '双击文本文件在线改，Ctrl+S 写回服务器；超过 1.5MB 不进编辑器。',
      '文件通道可按连接设为自动、复用终端连接或单独拨号。',
      '跳板只授权一次转发时，复用模式不会再拨第二次。'
    ]
  }
]

const steps = [
  { title: '新建连接', text: '选协议，填主机和账号；或从 ~/.ssh/config 导入一个 Host。' },
  { title: '打开终端', text: '点一下连接就开标签。同一主机再开终端，复用已登录的会话。' },
  { title: '日常操作', text: '多标签切换；有选中文本时 Ctrl+C 复制，没选中时中断。' },
  { title: '交给助手', text: '设置里启用 MCP，把 README 那段话发给助手，注册后就能用这条会话。' },
  { title: '传文件', text: '切到文件页签，展开远程目录，上传或双击编辑。' },
  { title: '收工', text: '关掉标签。连接、终端标题和已绘制的行下次启动还在。' }
]

const privacy = [
  {
    title: '凭据',
    text: '密码和私钥口令用 Electron safeStorage 加密后写进本机 SQLite。Windows 用 DPAPI，macOS 用 Keychain，Linux 用系统密钥环。'
  },
  {
    title: 'Agent',
    text: 'MCP Server 只绑 127.0.0.1，每个请求要带 Bearer 令牌。令牌写在本机 mcp.json，不出现在工具返回值里。'
  },
  {
    title: '外联',
    text: '没有遥测、统计和崩溃上报。只有你在设置里点「检查更新」时，应用读一次 GitHub 发布页。'
  }
]

const shots = [
  { src: '/shots/hero.png', title: '主窗口', text: '左侧连接与远程文件，右侧终端标签。' },
  {
    src: '/shots/connection.png',
    title: '新建连接',
    text: 'SSH、Telnet、串口共用一张表单，也可以从 ssh_config 导入。'
  },
  { src: '/shots/sftp.png', title: '文件面板', text: '远程目录按层展开，文本文件双击进入编辑器。' },
  { src: '/shots/import.png', title: '导入 ssh_config', text: '选中 Host，主机、端口、私钥和跳板自动填好。' }
]

const compare = {
  cols: ['手工 ssh', '图形化终端', 'TermPilot'],
  rows: [
    ['登录', '每次敲命令；密码交给 ssh-agent 或手动输入', '保存会话，点一下连接', '保存连接；用户在窗口里登录'],
    ['中途交互', '菜单、向导、sudo 都在当前终端', '本人操作，助手进不来', '本人或助手代按，画面可见'],
    ['继续工作', '同一 shell 里继续', '同一窗口继续', '同一条会话继续，不重连'],
    ['批量与脚本', '自己写 shell 脚本', '主要靠手动', '25 个 MCP 工具 + 本机 CLI'],
    ['凭据', 'ssh_config / ssh-agent', '软件内保存', '系统钥匙串加密，只存本机']
  ]
}

const specs = [
  ['连接协议', 'SSH / Telnet / 串口。Telnet 默认 23；串口默认 115200、8N1。'],
  ['终端', 'xterm.js 6 + WebGL；本机终端与远程终端同一标签栏；支持当前屏、指定行、整段缓冲截图。'],
  ['通道', 'shell / exec / SFTP 复用同一条 SSH 会话。exec 分流 stdout 与 stderr，返回协议级退出码。'],
  ['文件传输', '上传 / 下载 / 新建目录 / 改名 / 删除；单文件 512MB；4 路并发；文本编辑上限 1.5MB。'],
  ['凭据', 'safeStorage 加密后写入本机 SQLite（termpilot.db）；没有服务端和账号体系。'],
  ['Agent 接口', '内置 MCP Server（25 个工具，127.0.0.1 + Bearer）；本机 CLI `termpilot`。'],
  ['更新', '设置页手动检查 GitHub 发布页，不自动下载、不自动安装。'],
  ['平台', 'Windows x64；macOS Apple Silicon；Linux x64。'],
  [
    '安装包',
    'Windows Setup 143MB / zip 194MB；macOS dmg 164MB / zip 165MB；Linux AppImage 163MB / deb 126MB。'
  ],
  ['许可证', 'MIT']
]

const changelog = [
  {
    version: '0.7.7',
    items: [
      '不再写回 ~/.ssh/config，修复本机 ssh 报 Bad owner or permissions 的问题。',
      '启动时不再自动导入；新建连接时在表单里手动「从 ssh_config 导入」，选中 Host 自动填主机、端口、用户、私钥和跳板。'
    ]
  },
  {
    version: '0.7.6',
    items: [
      '每条连接新增「文件通道」：自动 / 复用终端连接 / 总是单独拨号。',
      '一次性授权的跳板机改复用后，SFTP 不再触发第二次拨号。',
      'MCP 的 connection_create / update 新增 sftpMode，connection_list 输出带上。'
    ]
  },
  {
    version: '0.7.5',
    items: [
      '修复 term_pty 在本机 Windows 终端命令不执行：行尾由 LF 改为 CR。',
      '修复中文输入法组字时终端内容左移被裁：容器改用 overflow: clip。'
    ]
  }
]

const faqs = [
  {
    q: '密码和私钥口令存在哪里？',
    a: '用 Electron safeStorage 加密后写进本机 SQLite。Windows 是 %APPDATA%\\TermPilot\\termpilot.db，macOS 是 ~/Library/Application Support/TermPilot/termpilot.db，Linux 是 ~/.config/TermPilot/termpilot.db。没有服务端同步，工具接口也不返回口令。换机器或换系统账号后，密文解不开，需要重新输入。'
  },
  {
    q: '能连跳板机吗？',
    a: '可以。支持 ssh -J 多跳、ProxyCommand，也能从 ~/.ssh/config 导入现成配置。跳板只授权一次转发时，把这条连接的「文件通道」设为复用终端连接，SFTP 就不会拨第二次。'
  },
  {
    q: 'Telnet 和串口能用 exec 通道和 SFTP 吗？',
    a: '不能。这两种协议只有一条终端字节流，没有通道概念。对它们调用 term_exec 或 sftp_* 会返回明确的能力说明；term_pty、term_write、term_read、截图这些屏幕族工具三种协议行为一致。'
  },
  {
    q: '串口断了怎么办？',
    a: '在终端标签上重新连接，或用 term_reconnect 恢复同一扇终端；编号、备注和已显示的内容都保留。新建串口连接前先 serial_list 看本机串口路径。Windows 还要确认驱动已装，Linux 确认当前用户在 dialout 组。'
  },
  {
    q: 'AI 助手能看到我的密码吗？',
    a: '不能。口令只在主进程拨号时短暂解密，MCP 工具和 connection_list 都不返回。MCP Server 只绑 127.0.0.1，每个请求要带本机 mcp.json 里的 Bearer 令牌。'
  },
  {
    q: '安装时提示未知发布者怎么办？',
    a: '安装包没有代码签名。Windows 在 SmartScreen 里点「更多信息 → 仍要运行」；macOS 第一次在访达里右键「打开」；Linux AppImage 先 chmod +x。'
  },
  {
    q: '支持 Intel Mac 吗？',
    a: '官方只发布 Apple Silicon（arm64）的 dmg 和 zip。Intel Mac 可以从源码构建：npm install 后跑 npm run dist:mac。'
  },
  {
    q: '有遥测吗？',
    a: '没有。源码里没有统计、崩溃上报或自动更新请求；唯一的外联是你在设置里手动点「检查更新」时读一次 GitHub 发布页（src/main/update-check.ts）。'
  }
]

let observer: IntersectionObserver | null = null

onMounted(() => {
  const faq = document.createElement('script')
  faq.type = 'application/ld+json'
  faq.id = 'faq-jsonld'
  faq.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a }
    }))
  })
  document.head.appendChild(faq)

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in')
        observer?.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }
  )
  document.querySelectorAll('.reveal').forEach((el) => observer?.observe(el))
})

onBeforeUnmount(() => {
  observer?.disconnect()
  document.getElementById('faq-jsonld')?.remove()
})
</script>

<template>
  <div class="landing">
    <div class="announce">
      <a class="announce-inner" :href="announcement.link" target="_blank" rel="noopener">
        <span class="announce-tag tnum">{{ announcement.version }}</span>
        <span class="announce-text">{{ announcement.text }}</span>
        <span class="announce-arrow" aria-hidden="true">→</span>
      </a>
    </div>

    <header class="hero">
      <div class="wrap hero-grid">
        <div class="hero-copy reveal">
          <p class="eyebrow">本机 SSH / Telnet / 串口终端</p>
          <h1>你的终端，<br />助手可以接着用。</h1>
          <p class="lede">
            TermPilot 是给开发者和运维用的本机终端。SSH、Telnet、串口、SFTP 在一个窗口里；
            你在窗口登录后，AI 助手通过本机 MCP 在同一条会话继续操作。
          </p>
          <div class="actions">
            <a class="btn primary" :href="withBase('/download')">下载 TermPilot</a>
            <a class="btn ghost" :href="withBase('/guide/quickstart')">阅读文档</a>
            <a class="btn text" :href="REPO" target="_blank" rel="noopener">GitHub ↗</a>
          </div>
          <p class="meta">Windows x64 · macOS Apple Silicon · Linux x64 · MIT 开源</p>
        </div>

        <figure class="hero-shot reveal">
          <img
            :src="withBase('/shots/hero.png')"
            alt="TermPilot 主窗口：左侧是连接列表，右侧是多标签终端"
            width="1280"
            height="800"
            loading="eager"
            fetchpriority="high"
            decoding="async"
          />
          <figcaption>主窗口：连接、文件、终端在同一个窗口里。</figcaption>
        </figure>
      </div>
    </header>

    <section class="stats" aria-label="关键数据">
      <div class="wrap stats-grid">
        <div v-for="s in stats" :key="s.label" class="stat">
          <div class="stat-value tnum">
            {{ s.value }}<span class="stat-unit">{{ s.unit }}</span>
          </div>
          <div class="stat-label">{{ s.label }}</div>
          <p class="stat-note">{{ s.note }}</p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <header class="section-head reveal">
          <p class="eyebrow">三件事</p>
          <h2>连接、操作、传输</h2>
          <p>日常用终端，重复操作基本都落在这三件事上。</p>
        </header>

        <div class="tracks">
          <article v-for="track in tracks" :key="track.title" class="track reveal">
            <div class="track-head">
              <span class="track-no tnum">{{ track.no }}</span>
              <h3>{{ track.title }}</h3>
            </div>
            <p class="track-sum">{{ track.summary }}</p>
            <ul>
              <li v-for="point in track.points" :key="point">{{ point }}</li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <section class="section alt">
      <div class="wrap">
        <header class="section-head reveal">
          <p class="eyebrow">一条工作流</p>
          <h2>从新建连接到关掉标签</h2>
          <p>按真实使用顺序走一遍。</p>
        </header>

        <ol class="steps">
          <li v-for="(step, index) in steps" :key="step.title" class="step reveal">
            <span class="step-no tnum">{{ String(index + 1).padStart(2, '0') }}</span>
            <div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.text }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section class="section">
      <div class="wrap privacy-grid">
        <div class="privacy-copy reveal">
          <p class="eyebrow">本地优先</p>
          <h2>凭据只留在本机</h2>
          <p>
            没有账号体系，没有云端同步。口令存在哪、谁在监听、什么时候外联，下面逐条写明。
          </p>
          <div class="paths">
            <p class="paths-title">数据目录</p>
            <code>%APPDATA%\TermPilot\</code>
            <code>~/Library/Application Support/TermPilot/</code>
            <code>~/.config/TermPilot/</code>
          </div>
        </div>

        <div class="privacy-list">
          <article v-for="item in privacy" :key="item.title" class="privacy-item reveal">
            <h3>{{ item.title }}</h3>
            <p>{{ item.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section alt">
      <div class="wrap">
        <header class="section-head reveal">
          <p class="eyebrow">界面</p>
          <h2>连接、文件、终端在同一屏</h2>
          <p>左侧是连接和远程文件，右侧是标签和终端。没有隐藏的第二层导航。</p>
        </header>

        <div class="shots">
          <figure v-for="shot in shots" :key="shot.src" class="shot reveal">
            <img
              :src="withBase(shot.src)"
              :alt="`TermPilot ${shot.title}`"
              width="1280"
              height="800"
              decoding="async"
            />
            <figcaption>
              <strong>{{ shot.title }}</strong>
              <span>{{ shot.text }}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <header class="section-head reveal">
          <p class="eyebrow">对照</p>
          <h2>三种做法，三种代价</h2>
          <p>只比较工作方式。每种做法都有适合的场景。</p>
        </header>

        <div class="table-wrap reveal" tabindex="0" aria-label="手工 ssh、图形化终端与 TermPilot 的对照表">
          <table class="compare">
            <thead>
              <tr>
                <th scope="col">维度</th>
                <th v-for="col in compare.cols" :key="col" scope="col">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in compare.rows" :key="row[0]">
                <th scope="row">{{ row[0] }}</th>
                <td v-for="cell in row.slice(1)" :key="cell">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="section alt">
      <div class="wrap specs-grid">
        <div class="specs-copy reveal">
          <p class="eyebrow">规格</p>
          <h2>技术规格</h2>
          <p>
            版本 {{ VERSION }}。数字都能在仓库和对应 Release 资产里核对。
          </p>
          <a class="inline-link" :href="REPO" target="_blank" rel="noopener">在 GitHub 核对源码 ↗</a>
        </div>

        <table class="specs reveal">
          <tbody>
            <tr v-for="row in specs" :key="row[0]">
              <th scope="row">{{ row[0] }}</th>
              <td>{{ row[1] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <header class="section-head reveal">
          <p class="eyebrow">演示</p>
          <h2>看一遍完整动作</h2>
          <p>建连接、打开终端、传文件。30 秒，无声循环。</p>
        </header>

        <figure class="demo reveal">
          <video
            :src="withBase('/demo/workflow.mp4')"
            :poster="withBase('/shots/hero.png')"
            width="1280"
            height="800"
            autoplay
            loop
            muted
            playsinline
            preload="metadata"
            aria-label="TermPilot 工作流演示"
          ></video>
          <figcaption>画面来自真实运行的 TermPilot，按实际点击顺序剪成。</figcaption>
        </figure>
      </div>
    </section>

    <section class="section alt">
      <div class="wrap oss-grid">
        <div class="oss-copy reveal">
          <p class="eyebrow">开源</p>
          <h2>MIT 协议，三条命令构建</h2>
          <p>
            仓库包含 Electron 主进程、React 渲染层和 Go 写的本机 CLI。
            推送到 main 会跑类型检查和构建；打 tag 自动出三端安装包。
          </p>
          <a class="inline-link" :href="REPO" target="_blank" rel="noopener">
            github.com/xy200303/termpilot ↗
          </a>
        </div>

        <pre class="code reveal"><code>git clone https://github.com/xy200303/termpilot.git
cd termpilot
npm install &amp;&amp; npm run dev

# 打包当前平台
npm run dist:win   # dist:mac / dist:linux</code></pre>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <header class="section-head releases-head reveal">
          <div>
            <p class="eyebrow">更新</p>
            <h2>最近三个版本</h2>
          </div>
          <a class="inline-link" :href="withBase('/changelog')">完整更新日志 →</a>
        </header>

        <div class="releases">
          <article v-for="release in changelog" :key="release.version" class="release reveal">
            <h3 class="tnum">v{{ release.version }}</h3>
            <ul>
              <li v-for="item in release.items" :key="item">{{ item }}</li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <section class="section alt">
      <div class="wrap faq-grid">
        <div class="faq-copy reveal">
          <p class="eyebrow">FAQ</p>
          <h2>常见问题</h2>
          <p>问题和答案都对应到具体文件、路径或工具名。</p>
          <a class="inline-link" :href="withBase('/guide/troubleshooting')">故障排查文档 →</a>
        </div>

        <div class="faqs">
          <details v-for="faq in faqs" :key="faq.q" class="faq reveal">
            <summary>{{ faq.q }}</summary>
            <p>{{ faq.a }}</p>
          </details>
        </div>
      </div>
    </section>

    <section class="final">
      <div class="wrap">
        <h2 class="reveal">把终端交给助手接着用</h2>
        <p class="final-lede reveal">
          先在窗口里登录，再让助手操作同一条会话。口令不出本机，连接也不必重来。
        </p>
        <div class="actions reveal">
          <a class="btn primary" :href="DOWNLOADS.win.setup">下载 Windows 版</a>
          <a class="btn ghost" :href="DOWNLOADS.mac.dmg">下载 macOS 版</a>
          <a class="btn ghost" :href="DOWNLOADS.linux.appimage">下载 Linux 版</a>
          <a class="btn text" :href="withBase('/download')">全部下载</a>
        </div>
        <p class="final-meta">
          MIT 协议 · Copyright © 2026 xy200303 ·
          <a :href="REPO" target="_blank" rel="noopener">GitHub</a>
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ---------------------------------------------------------------------------
 * 落地页
 * 近单色暖灰阶；强调色只出现在标签、链接和小面积标记上。
 * 层级靠字号、字重和留白，不靠卡片、渐变或阴影堆叠。
 * ------------------------------------------------------------------------- */

.wrap {
  width: 100%;
  max-width: var(--yc-container);
  margin: 0 auto;
  padding: 0 28px;
}

.eyebrow {
  margin: 0 0 14px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--yc-blue-600);
}

/* 公告条 */
.announce {
  border-bottom: 1px solid var(--yc-hairline);
  background: var(--yc-paper);
}

.announce-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  max-width: var(--yc-container);
  min-height: 40px;
  margin: 0 auto;
  padding: 8px 28px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--yc-ink-600);
  text-decoration: none;
}

.announce-inner:hover {
  color: var(--yc-ink-900);
}

.announce-inner:focus-visible {
  outline: 2px solid var(--yc-blue-600);
  outline-offset: 2px;
}

.announce-tag {
  flex: none;
  padding: 1px 7px;
  border: 1px solid var(--yc-blue-600);
  border-radius: 4px;
  color: var(--yc-blue-600);
  font-size: 11.5px;
  font-weight: 600;
}

.announce-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.announce-arrow {
  flex: none;
  color: var(--yc-ink-400);
}

/* Hero */
.hero {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--yc-hairline);
}

.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Ccircle cx='1' cy='1' r='1' fill='%231f1e1c' fill-opacity='.05'/%3E%3C/svg%3E");
  background-size: 28px 28px;
}

.hero-grid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
  align-items: center;
  gap: 56px;
  padding-top: 88px;
  padding-bottom: 80px;
}

.hero-copy h1 {
  margin: 0;
  font-size: clamp(40px, 5vw, 60px);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.038em;
  color: var(--yc-ink-900);
}

.hero-copy,
.hero-shot {
  min-width: 0;
}

.lede {
  max-width: 35em;
  margin: 26px 0 0;
  font-size: 17px;
  line-height: 1.8;
  color: var(--yc-ink-600);
  text-wrap: pretty;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 32px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 9px 18px;
  border: 1px solid transparent;
  border-radius: var(--yc-radius-s);
  font-size: 14.5px;
  font-weight: 600;
  line-height: 1.4;
  text-decoration: none;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.btn:focus-visible {
  outline: 2px solid var(--yc-blue-600);
  outline-offset: 2px;
}

.btn.primary {
  background: var(--yc-ink-900);
  color: var(--yc-paper);
}

.btn.primary:hover {
  background: #000;
}

.btn.ghost {
  border-color: var(--yc-hairline-strong);
  background: #fff;
  color: var(--yc-ink-900);
}

.btn.ghost:hover {
  border-color: var(--yc-ink-400);
}

.btn.text {
  padding-inline: 8px;
  color: var(--yc-ink-600);
}

.btn.text:hover {
  color: var(--yc-blue-600);
}

.meta {
  margin: 20px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--yc-ink-400);
}

.hero-shot {
  margin: 0;
  border: 1px solid var(--yc-hairline-strong);
  border-radius: var(--yc-radius-l);
  background: #fff;
  box-shadow: 0 24px 60px -40px rgba(31, 30, 28, 0.35);
  overflow: hidden;
}

.hero-shot img {
  display: block;
  width: 100%;
  height: auto;
}

.hero-shot figcaption {
  padding: 10px 14px;
  border-top: 1px solid var(--yc-hairline);
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--yc-ink-400);
}

/* 数字条 */
.stats {
  border-bottom: 1px solid var(--yc-hairline);
  background: var(--yc-paper);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.stat {
  padding: 30px 24px 28px;
  border-left: 1px solid var(--yc-hairline);
}

.stat:first-child {
  border-left: 0;
}

.stat-value {
  font-size: 42px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.035em;
  color: var(--yc-ink-900);
}

.stat-unit {
  margin-left: 4px;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--yc-ink-400);
}

.stat-label {
  margin-top: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--yc-ink-900);
}

.stat-note {
  margin: 4px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--yc-ink-400);
}

/* 通用分区 */
.section {
  padding: var(--yc-section-y) 0;
}

.section.alt {
  background: var(--yc-paper-dim);
}

.section-head {
  max-width: 680px;
  margin-bottom: 48px;
}

.section-head h2 {
  margin: 0;
  font-size: clamp(30px, 3.4vw, 40px);
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: -0.025em;
  color: var(--yc-ink-900);
}

.section-head > p:last-child {
  margin: 16px 0 0;
  font-size: 15.5px;
  line-height: 1.75;
  color: var(--yc-ink-600);
}

/* 三条主线 */
.tracks {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 44px;
}

.track {
  border-top: 1px solid var(--yc-ink-900);
  padding-top: 18px;
}

.track-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.track-no {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--yc-blue-600);
}

.track h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--yc-ink-900);
}

.track-sum {
  margin: 12px 0 18px;
  font-size: 15px;
  line-height: 1.7;
  color: var(--yc-ink-600);
}

.track ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.track li {
  position: relative;
  padding: 10px 0 10px 15px;
  border-top: 1px solid var(--yc-hairline);
  font-size: 14px;
  line-height: 1.65;
  color: var(--yc-ink-600);
}

.track li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 18px;
  width: 5px;
  height: 5px;
  border-radius: 1px;
  background: var(--yc-blue-600);
}

/* 工作流 */
.steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 36px 44px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.step {
  display: flex;
  gap: 14px;
  padding-top: 15px;
  border-top: 1px solid var(--yc-hairline-strong);
}

.step-no {
  flex: none;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.8;
  color: var(--yc-blue-600);
}

.step h3 {
  margin: 0;
  font-size: 16.5px;
  font-weight: 700;
  color: var(--yc-ink-900);
}

.step p {
  margin: 7px 0 0;
  font-size: 14px;
  line-height: 1.65;
  color: var(--yc-ink-600);
}

/* 本地优先 */
.privacy-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 72px;
  align-items: start;
}

.privacy-copy h2 {
  margin: 0;
  font-size: clamp(30px, 3.4vw, 40px);
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: -0.025em;
  color: var(--yc-ink-900);
}

.privacy-copy > p:not(.eyebrow) {
  margin: 18px 0 0;
  font-size: 15px;
  line-height: 1.75;
  color: var(--yc-ink-600);
}

.paths {
  margin-top: 28px;
  padding: 16px 18px;
  border: 1px solid var(--yc-hairline-strong);
  border-radius: var(--yc-radius-m);
  background: #fff;
}

.paths-title {
  margin: 0 0 8px !important;
  font-size: 12px !important;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--yc-ink-400) !important;
}

.paths code {
  display: block;
  padding: 3px 0;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--yc-ink-600);
  word-break: break-all;
}

.privacy-list {
  display: grid;
}

.privacy-item {
  padding: 20px 0 22px;
  border-top: 1px solid var(--yc-hairline-strong);
}

.privacy-item h3 {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 700;
  color: var(--yc-ink-900);
}

.privacy-item p {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.75;
  color: var(--yc-ink-600);
}

/* 界面 */
.shots {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 30px 32px;
}

.shot {
  margin: 0;
}

.shot img {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--yc-hairline-strong);
  border-radius: var(--yc-radius-m);
  background: #fff;
}

.shot figcaption {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  align-items: baseline;
  margin-top: 11px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--yc-ink-600);
}

.shot figcaption strong {
  color: var(--yc-ink-900);
  font-weight: 600;
}

/* 对照表 */
.table-wrap {
  max-width: 100%;
  overflow-x: auto;
  border-top: 1px solid var(--yc-ink-900);
  -webkit-overflow-scrolling: touch;
}

.table-wrap:focus-visible {
  outline: 2px solid var(--yc-blue-600);
  outline-offset: 2px;
}

.compare {
  width: 100%;
  min-width: 780px;
  border-collapse: collapse;
  font-size: 14px;
  line-height: 1.65;
  text-align: left;
}

.compare th,
.compare td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--yc-hairline);
  vertical-align: top;
}

.compare thead th {
  font-size: 13px;
  font-weight: 600;
  color: var(--yc-ink-900);
  white-space: nowrap;
}

.compare thead th:last-child {
  color: var(--yc-blue-600);
}

.compare tbody th {
  width: 104px;
  font-weight: 600;
  color: var(--yc-ink-900);
  white-space: nowrap;
}

.compare tbody td {
  color: var(--yc-ink-600);
}

.compare tbody tr:last-child th,
.compare tbody tr:last-child td {
  border-bottom: 0;
}

/* 技术规格 */
.specs-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr);
  gap: 72px;
  align-items: start;
}

.specs-copy h2 {
  margin: 0;
  font-size: clamp(30px, 3.4vw, 40px);
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: -0.025em;
  color: var(--yc-ink-900);
}

.specs-copy > p:not(.eyebrow) {
  margin: 18px 0 20px;
  font-size: 14.5px;
  line-height: 1.75;
  color: var(--yc-ink-600);
}

.inline-link {
  color: var(--yc-blue-600);
  font-size: 14px;
  text-decoration: none;
}

.inline-link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.inline-link:focus-visible {
  outline: 2px solid var(--yc-blue-600);
  outline-offset: 2px;
}

.specs {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  line-height: 1.65;
  text-align: left;
}

.specs th,
.specs td {
  padding: 12px 10px;
  border-top: 1px solid var(--yc-hairline-strong);
  vertical-align: top;
}

.specs tr:first-child th,
.specs tr:first-child td {
  border-top: 0;
}

.specs th {
  width: 104px;
  font-weight: 600;
  color: var(--yc-ink-900);
  white-space: nowrap;
}

.specs td {
  color: var(--yc-ink-600);
}

/* 演示 */
.demo {
  margin: 0;
  border: 1px solid var(--yc-hairline-strong);
  border-radius: var(--yc-radius-l);
  background: #fff;
  overflow: hidden;
}

.demo video {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  background: var(--yc-paper-dim);
}

.demo figcaption {
  padding: 11px 16px;
  border-top: 1px solid var(--yc-hairline);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--yc-ink-400);
}

/* 开源 */
.oss-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr);
  gap: 64px;
  align-items: start;
}

.oss-copy h2 {
  margin: 0;
  font-size: clamp(30px, 3.4vw, 40px);
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: -0.025em;
  color: var(--yc-ink-900);
}

.oss-copy > p:not(.eyebrow) {
  margin: 18px 0 20px;
  font-size: 14.5px;
  line-height: 1.75;
  color: var(--yc-ink-600);
}

.code {
  margin: 0;
  padding: 20px 22px;
  border-radius: var(--yc-radius-m);
  background: var(--yc-ink-900);
  color: #e8e7e5;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  line-height: 1.8;
  overflow-x: auto;
}

.code code {
  font-family: inherit;
}

/* 更新日志 */
.releases-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  max-width: none;
}

.releases {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 44px;
}

.release {
  border-top: 1px solid var(--yc-ink-900);
  padding-top: 16px;
}

.release h3 {
  margin: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 15px;
  font-weight: 600;
  color: var(--yc-ink-900);
}

.release ul {
  margin: 12px 0 0;
  padding-left: 17px;
}

.release li {
  margin-bottom: 8px;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--yc-ink-600);
}

.release li:last-child {
  margin-bottom: 0;
}

/* FAQ */
.faq-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.68fr) minmax(0, 1.32fr);
  gap: 64px;
  align-items: start;
}

.faq-copy h2 {
  margin: 0;
  font-size: clamp(30px, 3.4vw, 40px);
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: -0.025em;
  color: var(--yc-ink-900);
}

.faq-copy > p:not(.eyebrow) {
  margin: 18px 0 20px;
  font-size: 14.5px;
  line-height: 1.75;
  color: var(--yc-ink-600);
}

.faqs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 28px;
}

.faq {
  border-top: 1px solid var(--yc-hairline-strong);
  padding: 16px 0 18px;
}

.faq summary {
  position: relative;
  padding-right: 22px;
  font-size: 14.5px;
  font-weight: 600;
  line-height: 1.55;
  color: var(--yc-ink-900);
  cursor: pointer;
  list-style: none;
}

.faq summary::-webkit-details-marker {
  display: none;
}

.faq summary::after {
  content: '+';
  position: absolute;
  right: 2px;
  top: -1px;
  font-weight: 400;
  color: var(--yc-ink-400);
}

.faq[open] summary::after {
  content: '−';
}

.faq summary:focus-visible {
  outline: 2px solid var(--yc-blue-600);
  outline-offset: 3px;
}

.faq p {
  margin: 10px 0 0;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--yc-ink-600);
}

/* 收尾 */
.final {
  padding: var(--yc-section-y) 0 calc(var(--yc-section-y) * 0.8);
  border-top: 1px solid var(--yc-hairline);
  background: var(--yc-paper);
}

.final h2 {
  max-width: 18em;
  margin: 0;
  font-size: clamp(32px, 4vw, 46px);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: var(--yc-ink-900);
}

.final-lede {
  max-width: 38em;
  margin: 18px 0 0;
  font-size: 15.5px;
  line-height: 1.75;
  color: var(--yc-ink-600);
}

.final-meta {
  margin: 40px 0 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--yc-ink-400);
}

.final-meta a {
  color: var(--yc-ink-600);
  text-decoration: none;
}

.final-meta a:hover {
  color: var(--yc-blue-600);
}

/* 移动端 */
@media (max-width: 980px) {
  .hero-grid,
  .privacy-grid,
  .specs-grid,
  .oss-grid,
  .faq-grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .hero-grid {
    padding-top: 64px;
    padding-bottom: 64px;
  }

  .hero-copy h1 {
    font-size: clamp(40px, 8.5vw, 56px);
  }

  .tracks {
    grid-template-columns: 1fr;
    gap: 36px;
  }

  .steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 28px 32px;
  }

  .releases {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .faqs {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .wrap {
    padding: 0 20px;
  }

  .announce-inner {
    justify-content: flex-start;
    padding: 8px 20px;
  }

  .announce-text {
    white-space: normal;
  }

  .hero-copy h1 {
    font-size: 38px;
    line-height: 1.12;
  }

  .lede {
    font-size: 15.5px;
  }

  .actions {
    flex-direction: column;
    align-items: stretch;
  }

  .btn {
    width: 100%;
  }

  .btn.text {
    width: auto;
    align-self: flex-start;
    padding-inline: 0;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat {
    padding: 22px 16px;
    border-top: 1px solid var(--yc-hairline);
  }

  .stat:nth-child(-n + 2) {
    border-top: 0;
  }

  .stat:nth-child(odd) {
    border-left: 0;
  }

  .stat-value {
    font-size: 34px;
  }

  .section-head {
    margin-bottom: 34px;
  }

  .section-head h2,
  .privacy-copy h2,
  .specs-copy h2,
  .oss-copy h2,
  .faq-copy h2 {
    font-size: 29px;
  }

  .steps {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .shots {
    grid-template-columns: 1fr;
    gap: 26px;
  }

  .specs th,
  .specs td {
    display: block;
    width: auto;
    padding: 0;
    border-top: 0;
  }

  .specs tr {
    display: block;
    padding: 13px 0;
    border-top: 1px solid var(--yc-hairline-strong);
  }

  .specs tr:first-child {
    border-top: 0;
  }

  .specs th {
    padding-bottom: 4px;
    white-space: normal;
  }

  .releases-head {
    display: block;
  }

  .releases-head .inline-link {
    display: inline-block;
    margin-top: 12px;
  }

  .final h2 {
    font-size: 32px;
  }
}

@media (max-width: 420px) {
  .hero-copy h1 {
    font-size: 34px;
  }

  .stat-value {
    font-size: 30px;
  }
}
</style>
