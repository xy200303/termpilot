import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const SIZE = 1024
const SCALE = SIZE / 64

const bg = [0x24, 0x30, 0x44, 255]
const ink = [0xe6, 0xed, 0xf5, 255]
const mark = [0xc4, 0xa5, 0x74, 255]

const pixels = Buffer.alloc(SIZE * SIZE * 4)

function set(x, y, color, cover) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || cover <= 0) return
  const i = (y * SIZE + x) * 4
  const a = Math.min(1, cover) * (color[3] / 255)
  const keep = 1 - a
  pixels[i] = pixels[i] * keep + color[0] * a
  pixels[i + 1] = pixels[i + 1] * keep + color[1] * a
  pixels[i + 2] = pixels[i + 2] * keep + color[2] * a
  pixels[i + 3] = pixels[i + 3] * keep + 255 * a
}

function insideRound(px, py, x, y, w, h, r) {
  const cx = Math.min(Math.max(px, x + r), x + w - r)
  const cy = Math.min(Math.max(py, y + r), y + h - r)
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy <= r * r && px >= x && py >= y && px <= x + w && py <= y + h
}

function fillRound(x, y, w, h, r, color) {
  const x0 = Math.max(0, Math.floor(x))
  const y0 = Math.max(0, Math.floor(y))
  const x1 = Math.min(SIZE - 1, Math.ceil(x + w))
  const y1 = Math.min(SIZE - 1, Math.ceil(y + h))
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      let cover = 0
      for (const ox of [0.25, 0.75]) {
        for (const oy of [0.25, 0.75]) {
          if (insideRound(px + ox, py + oy, x, y, w, h, r)) cover += 0.25
        }
      }
      set(px, py, color, cover)
    }
  }
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const len = dx * dx + dy * dy
  const t = len === 0 ? 0 : Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len))
  const qx = ax + t * dx
  const qy = ay + t * dy
  return Math.hypot(px - qx, py - qy)
}

function stroke(points, width, color) {
  let minX = SIZE
  let minY = SIZE
  let maxX = 0
  let maxY = 0
  for (const [x, y] of points) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  const pad = width
  const x0 = Math.max(0, Math.floor(minX - pad))
  const y0 = Math.max(0, Math.floor(minY - pad))
  const x1 = Math.min(SIZE - 1, Math.ceil(maxX + pad))
  const y1 = Math.min(SIZE - 1, Math.ceil(maxY + pad))
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      let cover = 0
      for (const ox of [0.25, 0.75]) {
        for (const oy of [0.25, 0.75]) {
          let dist = Infinity
          for (let i = 0; i < points.length - 1; i++) {
            dist = Math.min(
              dist,
              distToSegment(px + ox, py + oy, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1])
            )
          }
          if (dist <= width / 2) cover += 0.25
        }
      }
      set(px, py, color, cover)
    }
  }
}

const s = (n) => n * SCALE
fillRound(0, 0, SIZE, SIZE, s(16), bg)
stroke(
  [
    [s(20), s(24.5)],
    [s(31), s(32)],
    [s(20), s(39.5)]
  ],
  s(2.6),
  ink
)
fillRound(s(35), s(36.2), s(8), s(3.2), s(0.6), mark)

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const head = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([head, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE)
for (let y = 0; y < SIZE; y++) {
  const row = y * (SIZE * 4 + 1)
  raw[row] = 0
  pixels.copy(raw, row + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8
ihdr[9] = 6
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0))
])
writeFileSync(new URL('../resources/icon.png', import.meta.url), png)
console.log('resources/icon.png', png.length)
