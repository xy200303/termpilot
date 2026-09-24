import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const name = process.platform === 'win32' ? 'termpilot.exe' : 'termpilot'
mkdirSync(join('cli', 'dist'), { recursive: true })
execFileSync('go', ['build', '-ldflags', '-s -w', '-o', join('dist', name), '.'], {
  cwd: join('cli'),
  stdio: 'inherit'
})
