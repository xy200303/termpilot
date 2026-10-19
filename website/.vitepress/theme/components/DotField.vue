<script setup lang="ts">
/* ===========================================================================
   DotField · 指针距离场点阵
   一张静态点阵做底，指针附近按 1/d² 衰减推开点、被推开的点染品牌色，
   松手后用阻尼弹簧回到原位。全程数学计算，不用任何图形库。
   静态点在离屏 canvas 上预渲染一次，每帧只重画被推动的那几十个点 —— 开销约 1ms。
   =========================================================================== */
import { onMounted, onUnmounted, ref } from 'vue'
import { prefersReduced } from '../motion/engine'

const props = withDefaults(
  defineProps<{
    gap?: number
    radius?: number
    push?: number
    alpha?: number
  }>(),
  { gap: 20, radius: 132, push: 30, alpha: 0.13 }
)

const canvas = ref<HTMLCanvasElement | null>(null)
let raf = 0
let teardown: (() => void) | null = null

const STATIC_INK = 'rgba(31, 30, 28, '
const HOT_INK = 'rgba(29, 78, 216, '

onMounted(() => {
  const el = canvas.value
  if (!el) return
  const ctx = el.getContext('2d')
  if (!ctx) return

  let w = 0
  let h = 0
  let cols = 0
  let rows = 0
  /* 每个点 4 个数：偏移 dx、dy，速度 vx、vy */
  let field = new Float32Array(0)
  let off: HTMLCanvasElement | null = null
  const pointer = { x: -1e4, y: -1e4, in: false }
  let reduced = prefersReduced()

  const staticLayer = () => {
    off = document.createElement('canvas')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    off.width = Math.floor(w * dpr)
    off.height = Math.floor(h * dpr)
    const octx = off.getContext('2d')
    if (!octx) return
    octx.setTransform(dpr, 0, 0, dpr, 0, 0)
    octx.fillStyle = STATIC_INK + props.alpha + ')'
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        octx.fillRect(c * props.gap - 0.75, r * props.gap - 0.75, 1.5, 1.5)
      }
    }
  }

  const build = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = el.clientWidth
    h = el.clientHeight
    el.width = Math.floor(w * dpr)
    el.height = Math.floor(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    cols = Math.ceil(w / props.gap) + 1
    rows = Math.ceil(h / props.gap) + 1
    field = new Float32Array(cols * rows * 4)
    staticLayer()
    draw()
  }

  const draw = () => {
    if (off) {
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(off, 0, 0, w, h)
    }
    ctx.fillStyle = HOT_INK + '0.55)'
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 4
        const dx = field[i]
        const dy = field[i + 1]
        if (dx === 0 && dy === 0) continue
        const x = c * props.gap + dx
        const y = r * props.gap + dy
        /* 被推开的点越远越淡：位移量映射成透明度 */
        const t = Math.min(1, Math.hypot(dx, dy) / props.push)
        if (t < 0.04) continue
        ctx.globalAlpha = t
        ctx.fillRect(x - 1.1, y - 1.1, 2.2, 2.2)
      }
    }
    ctx.globalAlpha = 1
  }

  const step = () => {
    const r2 = props.radius * props.radius
    const k = 0.055 /* 回位弹簧刚度 */
    const damp = 0.86
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 4
        let dx = field[i]
        let dy = field[i + 1]
        let vx = field[i + 2]
        let vy = field[i + 3]
        if (!pointer.in && dx === 0 && dy === 0 && vx === 0 && vy === 0) continue
        if (pointer.in) {
          const px = pointer.x - (c * props.gap + dx)
          const py = pointer.y - (r * props.gap + dy)
          const d2 = px * px + py * py
          if (d2 < r2) {
            const d = Math.sqrt(d2) || 0.001
            /* 距离衰减 + 极近处留一个软核，避免出现奇点 */
            const fall = (1 - d / props.radius) ** 2
            const f = (fall * props.push) / Math.max(d, 14)
            vx -= px * f * 0.12
            vy -= py * f * 0.12
          }
        }
        vx += -dx * k
        vy += -dy * k
        vx *= damp
        vy *= damp
        dx += vx
        dy += vy
        if (Math.abs(dx) < 0.02 && Math.abs(dy) < 0.02 && Math.abs(vx) < 0.02 && Math.abs(vy) < 0.02) {
          dx = dy = vx = vy = 0
        }
        field[i] = dx
        field[i + 1] = dy
        field[i + 2] = vx
        field[i + 3] = vy
      }
    }
    draw()
    raf = requestAnimationFrame(step)
  }

  const onMove = (e: PointerEvent) => {
    const rect = el.getBoundingClientRect()
    pointer.x = e.clientX - rect.left
    pointer.y = e.clientY - rect.top
    pointer.in = pointer.x > -40 && pointer.x < w + 40 && pointer.y > -40 && pointer.y < h + 40
  }
  const onLeave = () => {
    pointer.in = false
  }

  build()
  window.addEventListener('resize', build)
  if (!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(step)
  }
  /* 系统在运行中切到"减少动效"就停下来 */
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  const onPref = () => {
    reduced = mq.matches
    if (reduced) {
      cancelAnimationFrame(raf)
      field.fill(0)
      draw()
    } else if (!raf) {
      raf = requestAnimationFrame(step)
    }
  }
  mq.addEventListener('change', onPref)

  teardown = () => {
    cancelAnimationFrame(raf)
    mq.removeEventListener('change', onPref)
    window.removeEventListener('resize', build)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerleave', onLeave)
  }
})

onUnmounted(() => teardown?.())
</script>

<template>
  <canvas ref="canvas" class="dot-field" aria-hidden="true" />
</template>

<style scoped>
.dot-field {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
