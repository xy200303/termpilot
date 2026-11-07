export type GridScriptOptions = {
  step: number
  labelStep: number
  originX: number
  originY: number
  spanWidth: number
  spanHeight: number
  showOrigin: boolean
  alpha: number
  block: number
  toneWidth: number
  toneHeight: number
  tone: number[]
  colors: string[]
  dataUrl: string
}

/**
 * 渲染进程里跑的合成脚本：画网格线、刻度数字和起点角标。
 * 线色按 32px 小块从 colors 里取，标签跟随所在块的线色并描边。
 */
export function buildGridScript(options: GridScriptOptions): string {
  const {
    step,
    labelStep,
    originX,
    originY,
    spanWidth,
    spanHeight,
    showOrigin,
    alpha,
    block,
    toneWidth,
    toneHeight,
    tone,
    colors,
    dataUrl
  } = options

  return `(async () => {
  const STEP = ${step}
  const LABEL_STEP = ${labelStep}
  const ORIGIN_X = ${originX}
  const ORIGIN_Y = ${originY}
  const SPAN_W = ${spanWidth}
  const SPAN_H = ${spanHeight}
  const SHOW_ORIGIN = ${showOrigin ? 'true' : 'false'}
  const LINE_ALPHA = ${alpha}
  const BLOCK = ${block}
  const TONE_W = ${toneWidth}
  const TONE_H = ${toneHeight}
  const TONE = ${JSON.stringify(tone)}
  const COLORS = ${JSON.stringify(colors)}
  const CHIP_BG = 'rgba(0,0,0,0.64)'
  const CHIP_FG = 'rgba(255,255,255,0.97)'

  const img = new Image()
  img.src = ${JSON.stringify(dataUrl)}
  await img.decode()

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(img, 0, 0)

  const sx = canvas.width / SPAN_W
  const sy = canvas.height / SPAN_H
  const font = Math.max(9, Math.min(16, Math.round(10 * Math.min(sx, sy))))
  const chipSize = font + 4

  const colorAt = (x, y) => {
    const bx = Math.min(TONE_W - 1, Math.max(0, Math.floor(x / BLOCK)))
    const by = Math.min(TONE_H - 1, Math.max(0, Math.floor(y / BLOCK)))
    return COLORS[TONE[by * TONE_W + bx]] || COLORS[0]
  }

  const label = (text, x, y) => {
    const color = colorAt(x, y)
    const [r, g, b] = color.split(',').map(Number)
    const dark = 0.299 * r + 0.587 * g + 0.114 * b < 150
    // 描边打底，必须 save/restore，否则会改掉线条的 strokeStyle
    ctx.save()
    ctx.font = font + 'px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.textBaseline = 'top'
    ctx.lineWidth = 3
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.62)'
    ctx.strokeText(text, x, y)
    ctx.lineWidth = 1
    ctx.fillStyle = 'rgba(' + color + ',0.96)'
    ctx.fillText(text, x, y)
    ctx.restore()
  }

  // 竖线固定 x、横线固定 y，另一个方向决定当前段落属于哪一块
  const strokeRun = (vertical, fixed, from, to) => {
    const bx = Math.min(TONE_W - 1, Math.max(0, Math.floor((vertical ? fixed : from) / BLOCK)))
    const by = Math.min(TONE_H - 1, Math.max(0, Math.floor((vertical ? from : fixed) / BLOCK)))
    ctx.strokeStyle = 'rgba(' + (COLORS[TONE[by * TONE_W + bx]] || COLORS[0]) + ',' + LINE_ALPHA + ')'
    ctx.beginPath()
    if (vertical) {
      ctx.moveTo(Math.round(fixed) + 0.5, from)
      ctx.lineTo(Math.round(fixed) + 0.5, to)
    } else {
      ctx.moveTo(from, Math.round(fixed) + 0.5)
      ctx.lineTo(to, Math.round(fixed) + 0.5)
    }
    ctx.stroke()
  }

  ctx.lineWidth = 1
  const labelEvery = Math.max(1, Math.round(LABEL_STEP / STEP))
  const chipRect = { w: 0, h: chipSize }
  if (SHOW_ORIGIN) {
    const text = '(' + Math.round(ORIGIN_X) + ', ' + Math.round(ORIGIN_Y) + ')'
    ctx.font = font + 'px ui-monospace, SFMono-Regular, Menlo, monospace'
    chipRect.w = ctx.measureText(text).width + 4
  }
  const hitChip = (x, y) => SHOW_ORIGIN && x < chipRect.w + 4 && y < chipRect.h + 4

  for (let index = 0, gx = 0; gx * sx <= canvas.width - 1; gx += STEP, index += 1) {
    const x = gx * sx
    for (let y = 0; y < canvas.height; ) {
      const end = Math.min(canvas.height, (Math.floor(y / BLOCK) + 1) * BLOCK)
      strokeRun(true, x, y, end)
      y = end
    }
    if (index % labelEvery === 0) {
      const tx = Math.min(canvas.width - font * 3, Math.round(x) + 3)
      if (!hitChip(tx, 3)) label(String(Math.round(ORIGIN_X + gx)), tx, 3)
    }
  }

  for (let index = 0, gy = 0; gy * sy <= canvas.height - 1; gy += STEP, index += 1) {
    const y = gy * sy
    for (let x = 0; x < canvas.width; ) {
      const end = Math.min(canvas.width, (Math.floor(x / BLOCK) + 1) * BLOCK)
      strokeRun(false, y, x, end)
      x = end
    }
    if (index % labelEvery === 0) {
      const ty = Math.min(canvas.height - font - 1, Math.round(y) + 2)
      if (!hitChip(4, ty)) label(String(Math.round(ORIGIN_Y + gy)), 4, ty)
    }
  }

  if (SHOW_ORIGIN) {
    const text = '(' + Math.round(ORIGIN_X) + ', ' + Math.round(ORIGIN_Y) + ')'
    ctx.fillStyle = CHIP_BG
    ctx.fillRect(0, 0, chipRect.w, chipRect.h)
    ctx.font = font + 'px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.textBaseline = 'top'
    ctx.fillStyle = CHIP_FG
    ctx.fillText(text, 2, 2)
  }

  return canvas.toDataURL('image/png')
})()`
}
