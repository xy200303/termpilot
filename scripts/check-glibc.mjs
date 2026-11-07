import { execFileSync } from 'node:child_process'
import { openSync, readSync, closeSync, readdirSync, statSync } from 'node:fs'
import { basename, extname, join } from 'node:path'

const root = process.argv[2] || 'release/linux-unpacked'
const targetText = process.argv[3] || '2.35'
const target = targetText.split('.').map(Number)

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const file = join(dir, name)
    return statSync(file).isDirectory() ? walk(file) : [file]
  })
}

function compare(a, b) {
  return a[0] - b[0] || a[1] - b[1]
}

function isElf(file) {
  const fd = openSync(file, 'r')
  try {
    const magic = Buffer.alloc(4)
    return readSync(fd, magic, 0, 4, 0) === 4 && magic.toString('latin1') === '\x7fELF'
  } finally {
    closeSync(fd)
  }
}

function format(version) {
  return version.join('.')
}

let checked = 0
let highest = [0, 0]
const failures = []

for (const file of walk(root)) {
  if (extname(file) !== '.node' && basename(file) !== 'spawn-helper') continue
  if (!isElf(file)) continue
  let output
  try {
    output = execFileSync('objdump', ['-T', file], { encoding: 'utf8' })
  } catch (error) {
    throw new Error(`无法检查 ${file}：${error instanceof Error ? error.message : String(error)}`)
  }
  const versions = [...output.matchAll(/GLIBC_(\d+)\.(\d+)/g)].map((match) => [Number(match[1]), Number(match[2])])
  if (versions.length === 0) continue
  checked += 1
  const max = versions.reduce((a, b) => (compare(b, a) > 0 ? b : a), [0, 0])
  if (compare(max, highest) > 0) highest = max
  console.log(`${file}：GLIBC ${format(max)}`)
  if (compare(max, target) > 0) failures.push(`${file}（最高 GLIBC ${format(max)}）`)
}

if (checked === 0) throw new Error(`在 ${root} 中没有找到需要检查的原生模块`)
if (failures.length > 0) {
  console.error(`以下原生模块要求的 GLIBC 高于 ${targetText}：`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log(`已检查 ${checked} 个原生模块，最高 GLIBC ${format(highest)}，兼容目标 ${targetText}`)
