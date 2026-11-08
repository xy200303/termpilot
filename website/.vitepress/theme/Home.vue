<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { withBase } from 'vitepress'
import DotField from './components/DotField.vue'
import SignalStrip from './components/SignalStrip.vue'
import { initSmoothScroll, prefersReduced, hasFinePointer, loadMotion } from './motion/engine'

const VERSION = '0.8.6'
const REPO = 'https://github.com/xy200303/termpilot'
const RELEASE_TAG = `${REPO}/releases/tag/v${VERSION}`
const DL = `${REPO}/releases/latest/download`
const DOWNLOADS = {
  win: `${DL}/TermPilot.Setup.${VERSION}.exe`,
  mac: `${DL}/TermPilot-${VERSION}-arm64.dmg`,
  linux: `${DL}/TermPilot-${VERSION}.AppImage`
}

const { t, tm } = useI18n()

const announcement = computed(() => ({
  version: `v${VERSION}`,
  text: t('home.announcement'),
  link: RELEASE_TAG
}))

/* Hero 大标题：两行，第二行用强调色。逐字进场是纯 CSS（.hero-title .ch），
   脚本没加载完也不会留白。 */
const heroLines = computed(() => tm('home.hero.lines') as string[])
const heroOffset = computed(() => heroLines.value[0].length)
const heroEl = ref<HTMLElement | null>(null)
const shotEl = ref<HTMLElement | null>(null)

const stats = computed(() => tm('home.stats') as Array<{ value: string; label: string; note: string }>)
const tracks = computed(
  () => tm('home.tracks') as Array<{ key: string; title: string; summary: string; points: string[] }>
)
const steps = computed(() => tm('home.steps') as Array<{ title: string; text: string }>)
const privacy = computed(() => tm('home.privacy') as Array<{ title: string; text: string }>)
const shots = computed(() => tm('home.shots') as Array<{ src: string; title: string; text: string }>)
const compare = computed(() => tm('home.compare') as { cols: string[]; rows: string[][] })
const specs = computed(() => tm('home.specs') as string[][])
const changelog = computed(() => tm('home.changelog') as Array<{ version: string; items: string[] }>)
const faqs = computed(() => tm('home.faqs') as Array<{ q: string; a: string }>)

let observer: IntersectionObserver | null = null
const teardowns: Array<() => void> = []

onMounted(async () => {
  const ld = document.createElement('script')
  ld.type = 'application/ld+json'
  ld.id = 'faq-jsonld'
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.value.map((item) => ({
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

  const reduced = prefersReduced()

  /* 平滑滚动：仅精确指针 + 未开启减少动效 */
  if (!reduced) teardowns.push(await initSmoothScroll())

  const { animate, scroll } = await loadMotion()

  /* 首屏点阵随滚动缓慢上移：做出前后景的深度差 */
  const hero = heroEl.value
  const field = hero?.querySelector<HTMLElement>('.dot-field')
  if (hero && field && !reduced) {
    teardowns.push(
      scroll(animate(field, { y: [0, -64] }, { ease: 'linear' }), {
        target: hero,
        offset: ['start start', 'end start']
      })
    )
  }

  /* 产品窗：指针倾斜（幅度很小、弹簧跟随，回到 0 时也走弹簧） */
  const frame = shotEl.value
  if (frame && !reduced && hasFinePointer()) {
    let ctrl: { stop: () => void } | null = null
    const aim = (rx: number, ry: number, stiffness = 150) => {
      ctrl?.stop()
      ctrl = animate(frame, { rotateX: rx, rotateY: ry }, { type: 'spring', stiffness, damping: 22 })
    }
    const onMove = (e: PointerEvent) => {
      const r = frame.getBoundingClientRect()
      const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
      const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
      const cx = Math.max(-1, Math.min(1, nx))
      const cy = Math.max(-1, Math.min(1, ny))
      aim(-cy * 2.4, cx * 3.2)
    }
    const reset = () => aim(0, 0, 190)
    window.addEventListener('pointermove', onMove, { passive: true })
    frame.addEventListener('pointerleave', reset)
    teardowns.push(() => {
      ctrl?.stop()
      window.removeEventListener('pointermove', onMove)
      frame.removeEventListener('pointerleave', reset)
    })
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  document.getElementById('faq-jsonld')?.remove()
  for (const t of teardowns) t()
})
</script>

<template>
  <div class="landing">
    <!-- 阅读进度细条 -->
    <div class="topline" />

    <!-- Hero -->
    <header ref="heroEl" class="hero">
      <DotField class="hero-field" :gap="22" :radius="140" :push="34" />
      <div class="hero-inner">
        <a class="notice" :href="announcement.link" target="_blank" rel="noopener">
          <span class="notice-tag tnum">{{ announcement.version }}</span>
          <span class="notice-text">{{ announcement.text }}</span>
          <span class="notice-arrow">→</span>
        </a>
        <h1 class="hero-title">
          <span v-for="(line, li) in heroLines" :key="li" class="line">
            <span
              v-for="(ch, ci) in [...line]"
              :key="ci"
              class="ch"
              :style="{ '--ci': (li ? heroOffset : 0) + ci }"
              >{{ ch }}</span
            >
          </span>
        </h1>
        <p class="hero-sub">
          {{ t('home.hero.sub') }}
        </p>
        <div class="hero-cta">
          <a v-press class="btn primary" :href="withBase('/download')">
            {{ t('home.cta.download') }}
            <span class="arw">→</span>
          </a>
          <a v-press class="btn ghost" :href="withBase('/guide/quickstart')">{{ t('home.cta.docs') }}</a>
          <a v-press class="btn text" :href="REPO" target="_blank" rel="noopener">{{ t('home.cta.github') }}</a>
        </div>
        <p class="plat">{{ t('home.plat') }}</p>

        <div class="hero-shot">
          <div ref="shotEl" class="shot-frame">
            <div class="window">
              <div class="window-bar"><i /><i /><i /><span class="window-url">TermPilot</span></div>
              <img
                src="/shots/hero.png"
                :alt="t('home.hero.alt')"
                width="1280"
                height="800"
              />
            </div>
          </div>
        </div>
      </div>
      <SignalStrip class="hero-signal" :height="72" :lines="3" />
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
        <h2 class="reveal">{{ t('home.headings.tracks') }}</h2>
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
        <h2 class="reveal">{{ t('home.headings.steps') }}</h2>
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
        <h2 class="reveal">{{ t('home.headings.privacy') }}</h2>
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
        <h2 class="reveal">{{ t('home.headings.shots') }}</h2>
        <div class="shots">
          <figure v-for="s in shots" :key="s.src" v-lift="3" v-spot class="shot reveal">
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
        <h2 class="reveal">{{ t('home.headings.compare') }}</h2>
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
        <h2 class="reveal">{{ t('home.headings.specs') }}</h2>
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
        <h2 class="reveal">{{ t('home.headings.oss') }}</h2>
        <pre class="reveal"><code>git clone https://github.com/xy200303/termpilot.git
cd termpilot
npm install && npm run dist:win  # dist:mac / dist:linux</code></pre>
        <p class="reveal">
          {{ t('home.oss.lead') }}<a :href="REPO" target="_blank" rel="noopener">github.com/xy200303/termpilot</a>{{ t('home.oss.tail') }}
        </p>
      </div>
    </section>

    <!-- 更新日志 -->
    <section class="section dim">
      <div class="wrap">
        <h2 class="reveal">{{ t('home.headings.changelog') }}</h2>
        <div class="changelog">
          <div v-for="c in changelog" :key="c.version" class="release reveal">
            <h3 class="tnum">v{{ c.version }}</h3>
            <ul>
              <li v-for="item in c.items" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
        <p class="more reveal">
          <a href="/changelog">{{ t('home.links.changelogMore') }}</a> ·
          <a :href="`${REPO}/blob/main/CHANGELOG.md`" target="_blank" rel="noopener">{{ t('home.links.changelogRepo') }}</a>
        </p>
      </div>
    </section>

    <!-- FAQ -->
    <section class="section">
      <div class="wrap">
        <h2 class="reveal">{{ t('home.headings.faqs') }}</h2>
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
        <h2 class="reveal">{{ t('home.headings.final') }}</h2>
        <div class="cta reveal">
          <a v-press class="btn primary" :href="DOWNLOADS.win">{{ t('home.final.win') }}</a>
          <a v-press class="btn primary" :href="DOWNLOADS.mac">{{ t('home.final.mac') }}</a>
          <a v-press class="btn primary" :href="DOWNLOADS.linux">{{ t('home.final.linux') }}</a>
          <a v-press class="btn text" href="/download">{{ t('home.final.all') }}</a>
        </div>
        <p class="fine reveal">{{ t('home.final.fine') }}</p>
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
/* 版面靠留白和字号跨度撑；背景是一层可交互的点阵（DotField），不是光效 */
.hero {
  position: relative;
  overflow: hidden;
  padding: 96px 24px 0;
}
.hero-field {
  /* 只在上半屏露面，往下淡出，避免和正文抢注意力 */
  mask-image: linear-gradient(#000 0 42%, transparent 88%);
}
.hero-inner {
  position: relative;
  max-width: 1020px;
  margin: 0 auto;
  text-align: center;
}
/* 首屏信号带：出血到两侧，做 hero 的收口 */
.hero-signal {
  margin: 56px -24px 0;
  width: calc(100% + 48px);
}

/* 顶部公告条 */
.notice {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  max-width: 100%;
  margin: 0 auto 28px;
  padding: 6px 12px 6px 7px;
  border-radius: var(--yc-radius-xs);
  font-size: 13px;
  color: var(--yc-ink-600);
  background: #fff;
  border: 1px solid var(--yc-line);
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s;
}
.notice:hover {
  border-color: var(--yc-line-strong);
  color: var(--yc-ink-900);
}
.notice-tag {
  flex: none;
  padding: 2px 7px;
  border-radius: var(--yc-radius-xs);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: #fff;
  background: var(--yc-accent);
}
.notice-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.notice-arrow {
  flex: none;
  color: var(--yc-ink-400);
  transition: transform 0.2s, color 0.2s;
}
.notice:hover .notice-arrow {
  transform: translateX(2px);
  color: var(--yc-ink-900);
}

.hero-title {
  font-size: clamp(32px, 5.2vw, 60px);
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: -0.02em;
  color: var(--yc-ink-900);
  margin: 10px 0 0;
}
/* 每行一个裁切盒：字从下方升上来，被行盒切住 */
.hero-title .line {
  display: block;
  overflow: hidden;
  padding-bottom: 0.14em;
  margin-bottom: -0.14em;
}
.hero-title .ch {
  display: inline-block;
  /* 英文标题按单词内空格切分，空格字符也要占位，否则单词会粘在一起 */
  white-space: pre;
  animation: tp-rise 0.92s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--ci, 0) * 45ms + 0.12s);
  will-change: transform;
}
/* 第一行铺垫、第二行主张：主张那句用品牌色点出来 */
.hero-title .line:last-child .ch {
  color: var(--yc-accent);
}
@keyframes tp-rise {
  from {
    transform: translate3d(0, 108%, 0);
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}
.hero-sub {
  margin: 24px auto 0;
  max-width: 620px;
  font-size: 17px;
  line-height: 1.8;
  color: var(--yc-ink-600);
  text-wrap: pretty;
  animation: tp-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.62s;
}
@keyframes tp-fade-up {
  from {
    opacity: 0;
    transform: translate3d(0, 12px, 0);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.hero-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  align-items: center;
  margin-top: 34px;
  animation: tp-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.74s;
}
.plat {
  margin-top: 18px;
  font-size: 13.5px;
  color: var(--yc-ink-400);
  animation: tp-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.8s;
}

/* 窗口 / 截图框：细边 + 收紧的投影，像真的应用窗口 */
.hero-shot {
  position: relative;
  margin-top: 56px;
  perspective: 1600px;
  animation: tp-window-in 1s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.86s;
}
@keyframes tp-window-in {
  from {
    opacity: 0;
    transform: translate3d(0, 26px, 0) scale(0.986);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.shot-frame {
  position: relative;
}
.window {
  position: relative;
  border-radius: var(--yc-radius-lg);
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--yc-line);
  box-shadow: var(--yc-shadow-lg);
}
.window-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #fbfbfa;
  border-bottom: 1px solid var(--yc-line-soft);
}
.window-bar i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e4e4e7;
}
.window-bar i:nth-child(1) {
  background: #ff5f57;
}
.window-bar i:nth-child(2) {
  background: #febc2e;
}
.window-bar i:nth-child(3) {
  background: #28c840;
}
.window-url {
  margin-left: 8px;
  font-size: 12px;
  color: var(--yc-ink-400);
}
.window img {
  display: block;
  width: 100%;
  height: auto;
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
  gap: 8px;
  border-radius: var(--yc-radius-s);
  font-size: 15px;
  font-weight: 600;
  padding: 11px 22px;
  text-decoration: none;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.btn.primary {
  background: var(--yc-btn);
  color: var(--yc-paper);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 1px 2px rgba(0, 0, 0, 0.18);
}
.btn.primary:hover {
  background: #000;
}
.btn.ghost {
  border: 1px solid var(--yc-hairline-strong);
  color: var(--yc-ink-900);
  background: #fff;
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
/* 尾部箭头随 hover 右移 */
.btn .arw {
  display: inline-flex;
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.btn:hover .arw {
  transform: translateX(3px);
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
  grid-template-columns: repeat(4, 1fr);
  gap: 28px;
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
  position: relative;
  border-radius: var(--yc-radius-m);
}
/* 指针跟随高光：位置由 v-spot 写进 --mx / --my，CSS 只画一层极淡的品牌色光 */
.shot::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    220px circle at var(--mx, 50%) var(--my, 0%),
    rgba(29, 78, 216, 0.07),
    transparent 68%
  );
  opacity: 0;
  transition: opacity 0.24s;
  pointer-events: none;
}
@media (hover: hover) and (pointer: fine) {
  .shot:hover::after {
    opacity: 1;
  }
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
  .hero {
    padding-top: 68px;
  }
  .notice-text {
    white-space: normal;
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
  .cta .btn.ghost,
  .hero-cta .btn.primary,
  .hero-cta .btn.ghost {
    flex: 1 1 auto;
  }
}

/* 英文标题按字符切分后不能在字符间折行，窄屏只能靠字号保证一行放得下 */
@media (max-width: 640px) {
  .hero-title {
    font-size: clamp(18px, 7.2vw, 30px);
  }
}

/* 减少动效：逐字进场与窗口进场都停，内容保持完整 */
@media (prefers-reduced-motion: reduce) {
  .hero-title .ch,
  .hero-sub,
  .hero-cta,
  .plat,
  .hero-shot {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
