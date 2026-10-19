/* ===========================================================================
   动效底座
   - 重库（motion / lenis）一律走动态 import：只有真正用到它们的页面在浏览器里
     才会下载对应 chunk，文档页不为落地页的动效付带宽。
   - 所有动效都以「尊重 prefers-reduced-motion」为前提：关掉动效后页面必须依然完整。
   =========================================================================== */

export type MotionNS = typeof import('motion')

let motionP: Promise<MotionNS> | null = null
/** 取动效引擎（首次调用触发 chunk 加载，之后走缓存） */
export const loadMotion = (): Promise<MotionNS> => (motionP ??= import('motion'))

let lenisP: Promise<typeof import('lenis')> | null = null
const loadLenis = () => (lenisP ??= import('lenis'))

export const prefersReduced = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** 缓出：商用站最常用的一条缓动 */
export const EASE = [0.16, 1, 0.3, 1] as const

/** 指针精确的设备（触屏用系统惯性更自然，不套平滑滚动） */
export const hasFinePointer = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

/**
 * 平滑滚动（Lenis）。返回一个停止函数。
 * 只在「指针精确 + 未开启减少动效」时启用，锚点跳转交给它统一处理。
 */
export async function initSmoothScroll(offset = -88): Promise<() => void> {
  if (prefersReduced() || !hasFinePointer()) return () => {}
  const { default: Lenis } = await loadLenis()
  const lenis = new Lenis({
    lerp: 0.12,
    wheelMultiplier: 1,
    smoothWheel: true,
    autoRaf: true,
    anchors: { offset }
  })
  const onClick = (e: MouseEvent) => {
    const a = (e.target as Element | null)?.closest?.('a[href^="#"]')
    if (!(a instanceof HTMLAnchorElement)) return
    const id = a.getAttribute('href')!.slice(1)
    const el = id ? document.getElementById(id) : document.body
    if (!el) return
    e.preventDefault()
    lenis.scrollTo(el, { offset })
  }
  document.addEventListener('click', onClick)
  return () => {
    document.removeEventListener('click', onClick)
    lenis.destroy()
  }
}
