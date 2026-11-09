import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(process.cwd(), 'vendor', 'iron-remote-desktop-rdp')
const bundle = join(dir, 'iron-remote-desktop-rdp.js')
const wasm = join(dir, 'ironrdp_web_bg.wasm')
const marker = '__TERMPILOT_IRONRDP_WASM__'

if (!existsSync(bundle)) {
  console.error(`missing ${bundle}`)
  process.exit(1)
}

const source = readFileSync(bundle, 'utf8')
if (source.includes(marker)) {
  console.log('vendor already patched')
  process.exit(0)
}

const match = source.match(/const kA = "data:application\/wasm;base64,([A-Za-z0-9+/=]+)";/)
if (!match) {
  console.error('cannot find the inlined wasm data URL; upstream layout changed')
  process.exit(1)
}

const bytes = Buffer.from(match[1], 'base64')
if (bytes.length < 1024 || bytes[0] !== 0x00 || bytes[1] !== 0x61 || bytes[2] !== 0x73 || bytes[3] !== 0x6d) {
  console.error(`decoded payload is not a wasm module (${bytes.length} bytes)`)
  process.exit(1)
}

writeFileSync(wasm, bytes)
const patched = source.replace(match[0], `const kA = globalThis.${marker};`)
writeFileSync(bundle, patched)
console.log(`extracted ${wasm} (${bytes.length} bytes) and patched ${bundle}`)
