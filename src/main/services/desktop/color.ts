/**
 * 颜色计算：OKLCH 明度 + APCA 对比度，给截图网格挑线色用。
 * APCA 实现按 apca-w3 0.1.9（SA98G）常数移植，白字黑底校准值 -107.88。
 */

export type Rgb = { r: number; g: number; b: number }
export type Oklch = { l: number; c: number; h: number }

const TRC = 2.4
const R_CO = 0.2126729
const G_CO = 0.7151522
const B_CO = 0.072175

const APCA = {
  normBG: 0.56,
  normTXT: 0.57,
  revTXT: 0.62,
  revBG: 0.65,
  blkThrs: 0.022,
  blkClmp: 1.414,
  scaleBoW: 1.14,
  scaleWoB: 1.14,
  loBoWoffset: 0.027,
  loWoBoffset: 0.027,
  deltaYmin: 0.0005,
  loClip: 0.1
}

function channel(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** WCAG 2.x 相对亮度。 */
export function wcagLuminance(r: number, g: number, b: number): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG 2.x 对比度，1~21。 */
export function wcagContrast(a: Rgb, b: Rgb): number {
  const la = wcagLuminance(a.r, a.g, a.b)
  const lb = wcagLuminance(b.r, b.g, b.b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

/** APCA 用的 Y（0~1），按 sRGB 2.4 指数。 */
function apcaY(r: number, g: number, b: number): number {
  return R_CO * (r / 255) ** TRC + G_CO * (g / 255) ** TRC + B_CO * (b / 255) ** TRC
}

/** APCA Lc：深字浅底为正、浅字深底为负，绝对值 0~108。 */
export function apcaContrast(fg: Rgb, bg: Rgb): number {
  let txtY = apcaY(fg.r, fg.g, fg.b)
  let bgY = apcaY(bg.r, bg.g, bg.b)
  if (txtY <= APCA.blkThrs) txtY += (APCA.blkThrs - txtY) ** APCA.blkClmp
  if (bgY <= APCA.blkThrs) bgY += (APCA.blkThrs - bgY) ** APCA.blkClmp
  if (Math.abs(bgY - txtY) < APCA.deltaYmin) return 0
  if (bgY > txtY) {
    const sapc = (bgY ** APCA.normBG - txtY ** APCA.normTXT) * APCA.scaleBoW
    return sapc < APCA.loClip ? 0 : (sapc - APCA.loBoWoffset) * 100
  }
  const sapc = (bgY ** APCA.revBG - txtY ** APCA.revTXT) * APCA.scaleWoB
  return sapc > -APCA.loClip ? 0 : (sapc + APCA.loWoBoffset) * 100
}

/** sRGB → OKLCH（l 0~1，c 0~0.4，h 角度）。 */
export function toOklch(rgb: Rgb): Oklch {
  const r = channel(rgb.r)
  const g = channel(rgb.g)
  const b = channel(rgb.b)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const h = (Math.atan2(B, A) * 180) / Math.PI
  return { l: L, c: Math.hypot(A, B), h: h < 0 ? h + 360 : h }
}

/** OKLCH → sRGB，超出色域时按彩度收敛，返回 0~255 整数。 */
export function fromOklch({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const chroma = c * (1 - attempt / 24)
    const a = chroma * Math.cos(rad)
    const b = chroma * Math.sin(rad)
    const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
    const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
    const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
    const rgb = [
      4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp,
      -1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp,
      -0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp
    ]
    if (rgb.every((v) => v >= -0.001 && v <= 1.001)) {
      return { r: toByte(rgb[0]), g: toByte(rgb[1]), b: toByte(rgb[2]) }
    }
  }
  return { r: clampByte(l * 255), g: clampByte(l * 255), b: clampByte(l * 255) }
}

function toByte(linear: number): number {
  const c = Math.min(1, Math.max(0, linear))
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
  return clampByte(v * 255)
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}

/**
 * 给一块底色挑线色：在 OKLCH 里试深、浅两个方向，取 APCA 更强的那个；
 * 色相跟随底色、彩度压低；|Lc| ≥ 45 且 WCAG ≥ 3 才停手，否则继续推。
 */
export function pickLineColor(background: Rgb): Rgb {
  const bg = toOklch(background)
  const hue = bg.c > 0.02 ? bg.h : 264
  const chroma = bg.c > 0.02 ? Math.min(0.12, Math.max(0.05, bg.c * 0.6)) : 0.12
  const dark = fromOklch({ l: 0.34, c: chroma, h: hue })
  const light = fromOklch({ l: 0.86, c: chroma, h: hue })
  const darkScore = Math.abs(apcaContrast(dark, background))
  const lightScore = Math.abs(apcaContrast(light, background))
  let candidate = darkScore >= lightScore ? dark : light
  let lightness = darkScore >= lightScore ? 0.34 : 0.86
  const direction = darkScore >= lightScore ? -1 : 1
  for (let i = 0; i < 4; i += 1) {
    const lc = Math.abs(apcaContrast(candidate, background))
    if (lc >= 45 && wcagContrast(candidate, background) >= 3) return candidate
    lightness = clamp01(lightness + direction * 0.06)
    candidate = fromOklch({ l: lightness, c: chroma, h: hue })
  }
  return candidate
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}
