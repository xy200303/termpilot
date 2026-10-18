<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

const VERSION = '0.7.7'
const REPO = 'https://github.com/xy200303/termpilot'
const RELEASE = `${REPO}/releases/latest`
const RELEASE_TAG = `${REPO}/releases/tag/v${VERSION}`
const DL = `${REPO}/releases/latest/download`
const DOWNLOADS = {
  win: `${DL}/TermPilot.Setup.${VERSION}.exe`,
  mac: `${DL}/TermPilot-${VERSION}-arm64.dmg`,
  linux: `${DL}/TermPilot-${VERSION}.AppImage`
}

const announcement = {
  version: `v${VERSION}`,
  text: '文件通道可按连接配置复用或独立拨号；~/.ssh/config 改为创建时手动导入',
  link: RELEASE_TAG
}

const stats = [
  { value: '3', label: '类连接协议', note: 'SSH / Telnet / 串口' },
  { value: '25', label: '个 Agent 工具', note: '连接 / 终端 / exec / 屏幕 / 文件五族' },
  { value: '0', label: '遥测上报', note: '没有统计、没有 crash 上报通道' },
  { value: '6', label: '个安装包', note: 'Windows · macOS · Linux 各两种' }
]

const tracks = [
  {
    key: 'connect',
    title: '连接',
    summary: '三类协议一张表单。密码和私钥口令用系统钥匙串加密，只存本机。',
    points: [
      'SSH 支持密码 / 私钥、多跳跳板（ssh -J）、ProxyCommand',
      '串口波特率、数据位、停止位、校验可配，serial_list 先探路',
      '可从 ~/.ssh/config 手动导入已有 Host，应用不写回该文件',
      '无公网地址的机器用反向监听，只接受 127.0.0.1 连入'
    ]
  },
  {
    key: 'operate',
    title: '操作',
    summary: '你登录好的会话，助手接着用。不用重连，不用把密码交出去。',
    points: [
      'exec 通道独立跑命令：stdout / stderr 分流、协议级退出码',
      '同名 session 跨调用承接 cd 和 export，环境不丢',
      'PTY 族工具发按键、读屏幕、截长图，TUI 和安装向导也能走',
      '危险命令和删除操作暂停，在窗口里等你确认'
    ]
  },
  {
    key: 'transfer',
    title: '传输',
    summary: 'SFTP 文件面板和终端共用同一条 SSH，不掉线、不重登。',
    points: [
      '上传 / 下载 / 新建目录 / 改名 / 删除，单文件 512MB 以内',
      '双击文本文件在线编辑，Ctrl+S 写回服务器',
      '一次性授权的跳板机：文件通道设为复用，不拨第二次',
      '目标机缺 SFTP 子系统时自动改 internal-sftp（可关）'
    ]
  }
]

const steps = [
  { title: '新建连接', text: '填主机和账号，或从 ~/.ssh/config 导入。口令加密存本机。' },
  { title: '打开终端', text: '双击连接即开标签。多跳跳板自动串起，登录只输一次。' },
  { title: '日常操作', text: '多标签切换、右键复制截图。断线用 term_reconnect 原样恢复。' },
  { title: '交给助手', text: '设置里启用 Agent 连接，助手在同一会话里跑命令、读屏幕。' },
  { title: '传文件', text: '文件面板上传下载，文本文件双击直接在线改。' },
  { title: '收工', text: '关掉标签。连接、终端标题和已绘制的行，下次启动还在。' }
]

const privacy = [
  {
    title: '凭据只存本机',
    text: '密码和私钥口令用 Electron safeStorage 调系统钥匙串加密，写进本机 SQLite（%APPDATA%\\TermPilot\\termpilot.db）。没有服务端，没有账号体系。'
  },
  {
    title: 'MCP 只听回环',
    text: '内置 MCP Server 只绑定 127.0.0.1，每个请求要带 Bearer 令牌。令牌在本机 mcp.json 里，不给谁，谁就连不上。'
  },
  {
    title: '没有遥测',
    text: '源码里没有统计、没有 crash 上报。唯一的外联请求是你在设置页手动点「检查更新」时，读一次 GitHub 发布页。'
  }
]

const shots = [
  { src: '/shots/hero.png', title: '主窗口', text: '左侧连接与文件，右侧多标签终端。' },
  { src: '/shots/connection.png', title: '新建连接', text: '三种协议一张表单，跳板和多跳在各自页签。' },
  { src: '/shots/sftp.png', title: '文件面板', text: '远程目录按层展开，双击文本直接编辑。' },
  { src: '/shots/import.png', title: '从 ssh_config 导入', text: '选中一个 Host，主机、私钥、跳板自动填好。' }
]

const compare = {
  cols: ['手工敲 ssh 命令', '图形化终端（XShell 类）', 'TermPilot'],
  rows: [
    ['登录', '每次敲完整命令，密码靠 ssh-agent 兜底', '保存会话，双击连接', '保存连接，双击或由助手代开'],
    ['中途交互', '菜单、向导、sudo 都要本人', '本人操作', '本人或助手代按，画面实时可见'],
    ['继续下一步', '同一窗口继续', '同一窗口继续，助手进不来', '同一条会话助手接着做，不重连'],
    ['批量与脚本', '自己写 shell 脚本', '基本靠手动', '25 个 MCP 工具 + 本机 CLI'],
    ['凭据', 'ssh_config / ssh-agent', '软件内保存', '系统钥匙串加密，只存本机']
  ]
}

const specs = [
  ['连接协议', 'SSH / Telnet / 串口（波特率、数据位、停止位、校验可配）'],
  ['终端', 'xterm.js + WebGL 渲染；本机与远程同一标签栏；滚轮横滚、右键复制截图'],
  ['通道', 'shell / exec（stdout、stderr 分流，协议级退出码）/ SFTP，同一条 SSH 复用'],
  ['文件传输', '上传、下载、新建目录、改名、删除；单文件 512MB 以内；文本在线编辑'],
  ['凭据存储', 'safeStorage 加密 → 本机 SQLite，不出本机'],
  ['Agent 接口', '内置 MCP Server（25 个工具，只绑 127.0.0.1 + 令牌）；Go 写的本机 CLI'],
  ['平台', 'Windows x64 / macOS（Apple Silicon）/ Linux x64'],
  ['安装包', 'Windows Setup 143MB · macOS dmg 164MB · AppImage 163MB · deb 126MB'],
  ['许可证', 'MIT']
]

const changelog = [
  {
    version: '0.7.7',
    items: [
      '修复使用 TermPilot 后本机 ssh 命令失效（Bad owner or permissions）的问题：不再写回 ~/.ssh/config',
      '改为新建连接时手动「从 ssh_config 导入」，选中 Host 自动填好主机、私钥和跳板'
    ]
  },
  {
    version: '0.7.6',
    items: [
      '每条连接新增「文件通道」设置：自动 / 复用终端连接 / 总是单独拨号',
      '一次性授权的跳板机（第二跳会被拒）改复用后，SFTP 走已授权的同一条连接',
      'MCP connection_create / update 新增 sftpMode 参数，connection_list 输出带上'
    ]
  },
  {
    version: '0.7.5',
    items: [
      '修复 term_pty 在本机 Windows 终端命令不执行：行尾 LF 被 PSReadLine 当续行，改发 CR',
      '修复中文输入法组字时终端内容左移被裁：根容器改用 overflow: clip'
    ]
  }
]

const faqs = [
  {
    q: '密码和私钥口令存在哪里？',
    a: '用 Electron safeStorage 调用系统钥匙串加密后，写进本机 SQLite 数据库（Windows 是 %APPDATA%\\TermPilot\\termpilot.db）。没有服务端同步，connection_list 等接口也不返回口令。'
  },
  {
    q: '能连跳板机吗？',
    a: '可以。支持 ssh -J 多跳、ProxyCommand，也能从 ~/.ssh/config 导入现成配置。跳板只授权一次转发时，把这条连接的「文件通道」设为复用终端连接，SFTP 就不会触发第二次拨号。'
  },
  {
    q: 'Telnet 和串口能用 exec 通道和 SFTP 吗？',
    a: '不能。这两种协议只有一条终端字节流，没有通道概念。对它们调用 term_exec 或 sftp_* 会返回明确的能力说明错误；term_pty、term_write、截图等屏幕族工具三种协议行为一致。'
  },
  {
    q: '串口断了怎么办？',
    a: '终端断开后用 term_reconnect（或界面上重连）恢复同一扇终端，编号、备注和已显示的内容都保留。建连接前先 serial_list 确认串口路径和参数。'
  },
  {
    q: 'AI 助手能看到我的密码吗？',
    a: '不能。口令只在拨号时于主进程内存里短暂解密，任何工具接口都不返回。MCP Server 只绑定 127.0.0.1，且每个请求要带本机 mcp.json 里的令牌。'
  },
  {
    q: 'macOS Intel 芯片能用吗？',
    a: '官方只发布 Apple Silicon（arm64）的 dmg 和 zip。Intel Mac 可以从源码自行构建：npm install 后跑 npm run dist:mac。'
  },
  {
    q: '安装时提示未签名 / 未知发布者？',
    a: '安装包没有做代码签名。Windows 在 SmartScreen 里选「仍要运行」，macOS 在访达里右键打开。介意签名的可以自己从源码构建，三条命令。'
  },
  {
    q: 'TermPilot 会上传我的数据吗？',
    a: '没有遥测、没有统计、没有 crash 上报。唯一的外联是在设置页手动点「检查更新」时读一次 GitHub 发布页，可以在源码 update-check.ts 里核实。'
  }
]

let observer: IntersectionObserver | null = null

onMounted(() => {
  const ld = document.createElement('script')
  ld.type = 'application/ld+json'
  ld.id = 'faq-jsonld'
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a }
    }))
  })
  document.head.appendChild(ld)

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in')
          observer?.unobserve(entry.target)
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
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
    <!-- 阅读进度细条 -->
    <div class="topline" />

    <!-- Hero -->
    <header class="hero">
      <div class="wrap">
        <a class="announce reveal" :href="announcement.link" target="_blank" rel="noopener">
          <span class="tag">{{ announcement.version }}</span>
          <span>{{ announcement.text }}</span>
          <span class="arrow">→</span>
        </a>
        <div class="hero-grid">
          <div class="hero-copy">
            <h1 class="reveal">你的终端，<br />助手可以接着用。</h1>
            <p class="sub reveal">
              TermPilot 是本机 SSH 终端：连接、终端、文件一体。你在窗口里登录后，
              AI 助手通过内置 MCP Server 接着同一条会话继续操作——口令不出本机。
            </p>
            <div class="cta reveal">
              <a class="btn primary" href="/download">下载</a>
              <a class="btn ghost" href="/guide/quickstart">看文档</a>
              <a class="btn text" :href="REPO" target="_blank" rel="noopener">GitHub ↗</a>
            </div>
            <p class="plat reveal">Windows · macOS · Linux，MIT 开源</p>
          </div>
          <figure class="hero-shot reveal">
            <img src="/shots/hero.png" alt="TermPilot 主窗口：左侧连接列表，右侧多标签终端" width="1280" height="800" />
          </figure>
        </div>
      </div>
    </header>

    <!-- 数字条 -->
    <section class="stats">
      <div class="wrap stats-grid">
        <div v-for="s in stats" :key="s.label" class="stat reveal">
          <div class="stat-value tnum">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
          <div class="stat-note">{{ s.note }}</div>
        </div>
      </div>
    </section>

    <!-- 三条主线 -->
    <section class="section">
      <div class="wrap">
        <h2 class="reveal">连接、操作、传输，三件事做扎实</h2>
        <div class="tracks">
          <div v-for="t in tracks" :key="t.key" class="track reveal">
            <h3>{{ t.title }}</h3>
            <p class="track-sum">{{ t.summary }}</p>
            <ul>
              <li v-for="p in t.points" :key="p">{{ p }}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- 一条工作流 -->
    <section class="section dim">
      <div class="wrap">
        <h2 class="reveal">从新建连接到关掉标签</h2>
        <ol class="steps">
          <li v-for="(s, i) in steps" :key="s.title" class="step reveal">
            <span class="step-no tnum">{{ i + 1 }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.text }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- 本地优先 / 隐私 -->
    <section class="section">
      <div class="wrap">
        <h2 class="reveal">本地优先：终端工具该有的样子</h2>
        <div class="privacy">
          <div v-for="p in privacy" :key="p.title" class="privacy-item reveal">
            <h3>{{ p.title }}</h3>
            <p>{{ p.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 界面 -->
    <section class="section dim">
      <div class="wrap">
        <h2 class="reveal">界面</h2>
        <div class="shots">
          <figure v-for="s in shots" :key="s.src" class="shot reveal">
            <img :src="s.src" :alt="s.title" width="1280" height="800" loading="lazy" />
            <figcaption>
              <b>{{ s.title }}</b>
              <span>{{ s.text }}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- 对照表 -->
    <section class="section">
      <div class="wrap">
        <h2 class="reveal">和同类的做法比一比</h2>
        <div class="table-scroll reveal">
          <table class="compare">
            <thead>
              <tr>
                <th></th>
                <th v-for="c in compare.cols" :key="c">{{ c }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in compare.rows" :key="row[0]">
                <th>{{ row[0] }}</th>
                <td v-for="cell in row.slice(1)" :key="cell">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- 技术规格 -->
    <section class="section dim">
      <div class="wrap">
        <h2 class="reveal">技术规格</h2>
        <table class="specs reveal">
          <tbody>
            <tr v-for="row in specs" :key="row[0]">
              <th>{{ row[0] }}</th>
              <td>{{ row[1] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 开源 -->
    <section class="section">
      <div class="wrap oss">
        <h2 class="reveal">MIT 开源，自己构建只要三条命令</h2>
        <pre class="reveal"><code>git clone https://github.com/xy200303/termpilot.git
cd termpilot
npm install && npm run dist:win  # dist:mac / dist:linux</code></pre>
        <p class="reveal">
          仓库：<a :href="REPO" target="_blank" rel="noopener">github.com/xy200303/termpilot</a>。
          推送到 main 跑类型检查和构建，打 tag 自动出三端安装包并发布 Release。
        </p>
      </div>
    </section>

    <!-- 更新日志 -->
    <section class="section dim">
      <div class="wrap">
        <h2 class="reveal">最近更新</h2>
        <div class="changelog">
          <div v-for="c in changelog" :key="c.version" class="release reveal">
            <h3 class="tnum">v{{ c.version }}</h3>
            <ul>
              <li v-for="item in c.items" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
        <p class="more reveal">
          <a href="/changelog">查看完整更新日志</a> ·
          <a :href="`${REPO}/blob/main/CHANGELOG.md`" target="_blank" rel="noopener">仓库 CHANGELOG.md</a>
        </p>
      </div>
    </section>

    <!-- FAQ -->
    <section class="section">
      <div class="wrap">
        <h2 class="reveal">常见问题</h2>
        <div class="faqs">
          <details v-for="f in faqs" :key="f.q" class="faq reveal">
            <summary>{{ f.q }}</summary>
            <p>{{ f.a }}</p>
          </details>
        </div>
      </div>
    </section>

    <!-- 收尾 -->
    <section class="final">
      <div class="wrap">
        <h2 class="reveal">下载 TermPilot，把终端交给助手接着用</h2>
        <div class="cta reveal">
          <a class="btn primary" :href="DOWNLOADS.win">Windows 版</a>
          <a class="btn primary" :href="DOWNLOADS.mac">macOS 版</a>
          <a class="btn primary" :href="DOWNLOADS.linux">Linux 版</a>
          <a class="btn text" href="/download">全部下载</a>
        </div>
        <p class="fine reveal">MIT 协议 · Copyright © 2026 xy200303</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.wrap {
  max-width: var(--yc-container);
  margin: 0 auto;
  padding: 0 24px;
}

.topline {
  height: 2px;
  background: var(--yc-ink-900);
}

/* ---------------------------------------------------------------- Hero */
.hero {
  position: relative;
  padding: 40px 0 calc(var(--yc-section-y) * 0.8);
  background-image: radial-gradient(circle, rgba(31, 30, 28, 0.09) 1px, transparent 1px);
  background-size: 26px 26px;
}
.announce {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  color: var(--yc-ink-600);
  border: 1px solid var(--yc-hairline-strong);
  border-radius: 999px;
  padding: 5px 14px 5px 6px;
  text-decoration: none;
  background: var(--yc-paper);
}
.announce:hover {
  color: var(--yc-ink-900);
  border-color: var(--yc-ink-400);
}
.announce .tag {
  background: var(--yc-ink-900);
  color: var(--yc-paper);
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 12.5px;
  font-weight: 600;
}
.announce .arrow {
  color: var(--yc-ink-400);
}
.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 56px;
  align-items: center;
  margin-top: 48px;
}
.hero h1 {
  font-size: 64px;
  line-height: 1.08;
  letter-spacing: -0.025em;
  font-weight: 800;
  color: var(--yc-ink-900);
  margin: 0;
}
.sub {
  margin-top: 24px;
  font-size: 18.5px;
  line-height: 1.65;
  color: var(--yc-ink-600);
  max-width: 30em;
}
.cta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 32px;
  align-items: center;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--yc-radius-s);
  font-size: 15px;
  font-weight: 600;
  padding: 11px 22px;
  text-decoration: none;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.btn.primary {
  background: var(--yc-ink-900);
  color: var(--yc-paper);
}
.btn.primary:hover {
  background: #353330;
}
.btn.ghost {
  border: 1px solid var(--yc-hairline-strong);
  color: var(--yc-ink-900);
  background: var(--yc-paper);
}
.btn.ghost:hover {
  border-color: var(--yc-ink-400);
}
.btn.text {
  color: var(--yc-ink-600);
  padding: 11px 6px;
}
.btn.text:hover {
  color: var(--yc-blue-600);
}
.plat {
  margin-top: 18px;
  font-size: 13.5px;
  color: var(--yc-ink-400);
}
.hero-shot {
  margin: 0;
}
.hero-shot img {
  width: 100%;
  height: auto;
  border-radius: var(--yc-radius-l);
  box-shadow: var(--yc-shadow);
  display: block;
}

/* ---------------------------------------------------------------- 数字条 */
.stats {
  border-top: 1px solid var(--yc-hairline);
  border-bottom: 1px solid var(--yc-hairline);
  background: var(--yc-paper);
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}
.stat {
  padding: 36px 20px;
  border-left: 1px solid var(--yc-hairline);
}
.stat:first-child {
  border-left: none;
}
.stat-value {
  font-size: 44px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--yc-ink-900);
}
.stat-label {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 600;
  color: var(--yc-ink-900);
}
.stat-note {
  margin-top: 4px;
  font-size: 13px;
  color: var(--yc-ink-400);
}

/* ---------------------------------------------------------------- 通用屏 */
.section {
  padding: var(--yc-section-y) 0;
}
.section.dim {
  background: var(--yc-paper-dim);
}
.section h2 {
  font-size: 38px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--yc-ink-900);
  margin: 0 0 48px;
  max-width: 22em;
}

/* 三条主线 */
.tracks {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
}
.track h3 {
  font-size: 20px;
  font-weight: 700;
  color: var(--yc-ink-900);
  margin: 0;
  padding-top: 18px;
  border-top: 2px solid var(--yc-ink-900);
}
.track-sum {
  margin: 12px 0 16px;
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
  font-size: 14.5px;
  line-height: 1.65;
  color: var(--yc-ink-600);
  padding: 8px 0 8px 18px;
  border-top: 1px solid var(--yc-hairline);
}
.track li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 16px;
  width: 6px;
  height: 6px;
  border-radius: 2px;
  background: var(--yc-blue-600);
}

/* 工作流 */
.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px 40px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.step {
  border-top: 1px solid var(--yc-hairline-strong);
  padding-top: 16px;
}
.step-no {
  display: inline-block;
  font-size: 13px;
  font-weight: 700;
  color: var(--yc-blue-600);
  border: 1px solid var(--yc-blue-600);
  border-radius: 999px;
  width: 26px;
  height: 26px;
  line-height: 24px;
  text-align: center;
}
.step h3 {
  margin: 12px 0 6px;
  font-size: 17px;
  font-weight: 700;
  color: var(--yc-ink-900);
}
.step p {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.65;
  color: var(--yc-ink-600);
}

/* 隐私 */
.privacy {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
}
.privacy-item h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 10px;
  color: var(--yc-ink-900);
}
.privacy-item p {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.75;
  color: var(--yc-ink-600);
}

/* 界面截图 */
.shots {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
}
.shot {
  margin: 0;
}
.shot img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: var(--yc-radius-m);
  box-shadow: var(--yc-shadow);
}
.shot figcaption {
  display: flex;
  gap: 10px;
  align-items: baseline;
  margin-top: 12px;
  font-size: 14px;
  color: var(--yc-ink-600);
}
.shot figcaption b {
  color: var(--yc-ink-900);
  font-weight: 700;
}

/* 对照表 */
.table-scroll {
  overflow-x: auto;
}
.compare {
  width: 100%;
  border-collapse: collapse;
  font-size: 14.5px;
  min-width: 720px;
}
.compare th,
.compare td {
  text-align: left;
  padding: 14px 16px;
  border-top: 1px solid var(--yc-hairline);
  vertical-align: top;
  line-height: 1.6;
}
.compare thead th {
  border-top: none;
  border-bottom: 2px solid var(--yc-ink-900);
  font-size: 14px;
  color: var(--yc-ink-900);
}
.compare thead th:last-child {
  color: var(--yc-blue-600);
}
.compare tbody th {
  color: var(--yc-ink-900);
  font-weight: 600;
  white-space: nowrap;
}
.compare tbody td {
  color: var(--yc-ink-600);
}

/* 技术规格 */
.specs {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
}
.specs th,
.specs td {
  text-align: left;
  padding: 14px 8px;
  border-top: 1px solid var(--yc-hairline-strong);
  vertical-align: top;
  line-height: 1.65;
}
.specs tr:first-child th,
.specs tr:first-child td {
  border-top: none;
}
.specs th {
  width: 180px;
  color: var(--yc-ink-900);
  font-weight: 600;
  white-space: nowrap;
}
.specs td {
  color: var(--yc-ink-600);
}

/* 开源 */
.oss pre {
  background: var(--yc-ink-900);
  color: #e8e7e5;
  border-radius: var(--yc-radius-m);
  padding: 20px 24px;
  font-size: 14px;
  line-height: 1.8;
  overflow-x: auto;
  max-width: 640px;
}
.oss pre code {
  font-family: var(--vp-font-family-mono);
}
.oss p {
  font-size: 15px;
  color: var(--yc-ink-600);
  max-width: 44em;
  line-height: 1.75;
}
.oss a {
  color: var(--yc-blue-600);
}

/* 更新日志 */
.changelog {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
}
.release h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--yc-ink-900);
  padding-top: 14px;
  border-top: 2px solid var(--yc-ink-900);
}
.release ul {
  margin: 12px 0 0;
  padding-left: 18px;
}
.release li {
  font-size: 14px;
  line-height: 1.7;
  color: var(--yc-ink-600);
  margin-bottom: 8px;
}
.more {
  margin-top: 32px;
  font-size: 14.5px;
}
.more a {
  color: var(--yc-blue-600);
}

/* FAQ */
.faqs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 48px;
}
.faq {
  border-top: 1px solid var(--yc-hairline-strong);
  padding: 18px 0;
}
.faq summary {
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  color: var(--yc-ink-900);
  list-style: none;
  position: relative;
  padding-right: 28px;
}
.faq summary::after {
  content: '+';
  position: absolute;
  right: 4px;
  top: 0;
  font-weight: 400;
  color: var(--yc-ink-400);
  transition: transform 0.15s ease;
}
.faq[open] summary::after {
  transform: rotate(45deg);
}
.faq p {
  margin: 12px 0 0;
  font-size: 14.5px;
  line-height: 1.75;
  color: var(--yc-ink-600);
}

/* 收尾 */
.final {
  padding: var(--yc-section-y) 0 calc(var(--yc-section-y) * 0.75);
  border-top: 1px solid var(--yc-hairline);
}
.final h2 {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--yc-ink-900);
  margin: 0;
  max-width: 18em;
}
.fine {
  margin-top: 36px;
  font-size: 13px;
  color: var(--yc-ink-400);
}

/* ---------------------------------------------------------------- 移动端 */
@media (max-width: 960px) {
  .hero-grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  .hero h1 {
    font-size: 42px;
  }
  .sub {
    font-size: 16.5px;
  }
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .stat:nth-child(3) {
    border-left: none;
  }
  .stat {
    border-top: 1px solid var(--yc-hairline);
  }
  .stat:nth-child(-n + 2) {
    border-top: none;
  }
  .tracks,
  .privacy,
  .changelog {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .steps {
    grid-template-columns: 1fr;
  }
  .shots {
    grid-template-columns: 1fr;
  }
  .faqs {
    grid-template-columns: 1fr;
  }
  .section h2,
  .final h2 {
    font-size: 29px;
  }
  .cta .btn.primary,
  .cta .btn.ghost {
    flex: 1 1 auto;
  }
}
</style>
