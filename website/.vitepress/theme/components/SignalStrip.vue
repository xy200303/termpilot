<script setup lang="ts">
/* ===========================================================================
   SignalStrip · 数学生成的信号带
   波形不是画出来的，是按三次谐波叠加算出来的（周期整除带宽，平移一个周期即无缝循环）。
   三条不同谐波比、不同速度的细线叠在一起，看起来像一条安定的信号底噪；
   进入视口时用描边生长动画进场，之后无限匀速流动。零依赖、零图片。
   =========================================================================== */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 带宽（viewBox 宽） */
    period?: number
    height?: number
    /** 线条数：谐波比逐条错开 */
    lines?: number
    amplitude?: number
    /** 最上面那条是否用品牌色 */
    accentTop?: boolean
  }>(),
  { period: 1200, height: 84, lines: 3, amplitude: 11, accentTop: true }
)

const TAU = Math.PI * 2

const waves = computed(() => {
  const P = props.period
  const H = props.height
  const cy = H / 2
  const out: { d: string; stroke: string; width: number; duration: number; delay: number }[] = []
  for (let i = 0; i < props.lines; i++) {
    /* 每条的谐波比、相位、幅度都错开：n 取互质的小整数，合起来不重复 */
    const n1 = [3, 5, 2][i % 3]
    const n2 = [7, 11, 13][i % 3]
    const a1 = props.amplitude * (1 - i * 0.22)
    const a2 = a1 * 0.42
    const ph = i * 0.9
    let d = ''
    for (let x = 0; x <= P * 2; x += 8) {
      const y =
        cy + a1 * Math.sin((TAU * n1 * x) / P + ph) + a2 * Math.sin((TAU * n2 * x) / P + ph * 1.7)
      d += (x === 0 ? 'M' : 'L') + x + ' ' + y.toFixed(2)
    }
    const isTop = props.accentTop && i === 0
    out.push({
      d,
      stroke: isTop ? 'var(--yc-accent)' : 'currentColor',
      width: isTop ? 1.4 : 1,
      duration: 26 + i * 9,
      delay: i * 0.12
    })
  }
  return out
})
</script>

<template>
  <div class="strip" :style="{ '--strip-h': height + 'px' }">
    <svg
      class="strip-svg"
      :viewBox="`0 0 ${period} ${height}`"
      preserveAspectRatio="none"
      role="presentation"
      aria-hidden="true"
    >
      <g
        v-for="(w, i) in waves"
        :key="i"
        class="wave"
        :style="{ animationDuration: w.duration + 's', '--shift': -period + 'px' }"
      >
        <path
          class="wave-line"
          :d="w.d"
          :stroke="w.stroke"
          :stroke-width="w.width"
          pathLength="1"
          :style="{ '--grow-delay': w.delay + 's', '--line-alpha': 1 - i * 0.28 }"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.strip {
  position: relative;
  width: 100%;
  height: var(--strip-h, 84px);
  overflow: hidden;
  color: var(--vp-c-text-3);
}
.strip-svg {
  display: block;
  width: 100%;
  height: 100%;
}
/* 波形画了两倍周期，平移一个周期的用户单位即无缝（用 px 而不是 %，
   百分比在 SVG 元素上按参考框解析，各浏览器口径不一致） */
.wave {
  animation-name: yc-flow;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform;
}
@keyframes yc-flow {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(var(--shift, -1200px), 0, 0);
  }
}
.wave-line {
  fill: none;
  stroke-linecap: round;
  opacity: var(--line-alpha, 1);
  vector-effect: non-scaling-stroke;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: yc-draw 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: var(--grow-delay, 0s);
}
@keyframes yc-draw {
  to {
    stroke-dashoffset: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .wave {
    animation: none;
  }
  .wave-line {
    stroke-dashoffset: 0;
    animation: none;
  }
}
</style>
