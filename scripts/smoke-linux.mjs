// 用打包后的可执行文件真机启动一次，确认 node-pty / serialport / ssh2 在当前 glibc 上能加载。
// 只用于 Linux，需在 xvfb-run 下执行。
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = process.argv[2] || 'release/linux-unpacked'
const holdMs = Number(process.argv[3] || 12000)
const exe = join(root, 'TermPilot')
const userData = mkdtempSync(join(tmpdir(), 'termpilot-smoke-'))

const child = spawn(
  exe,
  ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', `--user-data-dir=${userData}`],
  { env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' }, stdio: ['ignore', 'pipe', 'pipe'] }
)

let output = ''
const append = (chunk) => {
  output += String(chunk)
  if (output.length > 400000) output = output.slice(-200000)
}
child.stdout.on('data', append)
child.stderr.on('data', append)

const exited = await new Promise((resolve) => {
  const timer = setTimeout(() => resolve(null), holdMs)
  child.on('exit', (code, signal) => {
    clearTimeout(timer)
    resolve({ code, signal })
  })
})

child.kill('SIGTERM')
rmSync(userData, { recursive: true, force: true })

const tail = output.trim().split('\n').slice(-40).join('\n')
const fatal = /NODE_MODULE_VERSION|error while loading shared libraries|GLIBC_2\.\d+ not found|Cannot find module/i
const hit = output.match(fatal)

if (exited || hit) {
  if (tail) console.error(tail)
  if (exited) console.error(`应用启动后 ${Math.round(holdMs / 1000)} 秒内退出：code=${exited.code} signal=${exited.signal}`)
  if (hit) console.error(`输出里出现致命错误：${hit[0]}`)
  process.exit(1)
}

console.log(`打包后的应用在 ${Math.round(holdMs / 1000)} 秒内保持运行，原生模块加载正常`)
if (tail) console.log(tail)
