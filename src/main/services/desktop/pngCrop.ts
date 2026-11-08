import { nativeImage } from 'electron'
import { t as mt } from '../../i18n'
import type { DesktopRegion } from '../../../shared/desktop-agent'

export type CroppedPng = {
  png: Buffer
  x: number
  y: number
  width: number
  height: number
  fullWidth: number
  fullHeight: number
}

/** 按 region 裁一块出来，返回裁剪图和它在原画面里的位置。 */
export function cropPng(png: Buffer, region: DesktopRegion): CroppedPng {
  const image = nativeImage.createFromBuffer(png)
  if (image.isEmpty()) throw new Error(mt('crop.decode_failed'))
  const { width, height } = image.getSize()
  const x = Math.round(region.x)
  const y = Math.round(region.y)
  const w = Math.round(region.width)
  const h = Math.round(region.height)
  if (x < 0 || y < 0 || w < 8 || h < 8) throw new Error(mt('crop.bad_region'))
  if (x + w > width || y + h > height) {
    throw new Error(mt('crop.out_of_bounds', { x, y, w, h, width, height }))
  }
  return {
    png: image.crop({ x, y, width: w, height: h }).toPNG(),
    x,
    y,
    width: w,
    height: h,
    fullWidth: width,
    fullHeight: height
  }
}
