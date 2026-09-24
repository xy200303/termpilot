import { execFileSync } from 'node:child_process'
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, readlinkSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { app } from 'electron'

const binName = process.platform === 'win32' ? 'termpilot.exe' : 'termpilot'

function cliSource(): string {
  const packaged = join(process.resourcesPath, 'cli', binName)
  if (app.isPackaged && existsSync(packaged)) return packaged
  return join(app.getAppPath(), 'cli', 'dist', binName)
}

/** 把命令放到固定目录，并写进当前用户的 PATH。 */
export function installCli(launch: { app: string; args: string[] }): string {
  const source = cliSource()
  const dir = join(app.getPath('userData'), 'bin')
  mkdirSync(dir, { recursive: true })
  const target = join(dir, binName)
  if (existsSync(source)) {
    try {
      copyFileSync(source, target)
      if (process.platform !== 'win32') chmodSync(target, 0o755)
      for (const stale of ['termpilot.cmd', 'termpilot.mjs']) {
        const file = join(dir, stale)
        if (existsSync(file)) unlinkSync(file)
      }
    } catch (error) {
      console.error('[TermPilot] 没能更新命令', error)
    }
  } else {
    console.error('[TermPilot] CLI binary missing:', source)
  }
  writeFileSync(join(dir, 'launch.json'), `${JSON.stringify(launch, null, 2)}\n`, 'utf8')
  const script = uninstallScript()
  if (script && existsSync(script)) copyFileSync(script, join(dir, 'uninstall-path.ps1'))
  if (process.platform === 'win32') ensureWindowsPath(dir)
  else linkUserBin(target)
  return target
}

function uninstallScript(): string {
  const packaged = join(process.resourcesPath, 'uninstall-path.ps1')
  if (app.isPackaged && existsSync(packaged)) return packaged
  return join(app.getAppPath(), 'resources', 'uninstall-path.ps1')
}

function ensureWindowsPath(dir: string): void {
  const script = `
$dir = $env:TERMPILOT_BIN
if (-not $dir) { exit 0 }
$path = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not $path) { $path = '' }
$norm = $dir.TrimEnd('\\')
$seen = $false
$items = New-Object System.Collections.Generic.List[string]
foreach ($item in $path.Split(';')) {
  if (-not $item) { continue }
  if ($item.TrimEnd('\\').Equals($norm, [StringComparison]::OrdinalIgnoreCase)) { $seen = $true; continue }
  $items.Add($item)
}
if ($seen) { exit 0 }
$items.Add($dir)
[Environment]::SetEnvironmentVariable('Path', ($items -join ';'), 'User')
`
  try {
    execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
      env: { ...process.env, TERMPILOT_BIN: dir },
      windowsHide: true
    })
  } catch (error) {
    console.error('[TermPilot] 没能写入用户 PATH', error)
  }
}

function linkUserBin(target: string): void {
  const dir = join(homedir(), '.local', 'bin')
  mkdirSync(dir, { recursive: true })
  const link = join(dir, 'termpilot')
  let current = ''
  try {
    current = readlinkSync(link)
  } catch {
    current = ''
  }
  if (current !== target) {
    if (existsSync(link) && !current) {
      console.error('[TermPilot] ~/.local/bin/termpilot 已有别的文件，没有覆盖')
    } else {
      if (existsSync(link)) unlinkSync(link)
      symlinkSync(target, link)
    }
  }
  ensureUnixPath()
}

function ensureUnixPath(): void {
  const home = homedir()
  const files = process.platform === 'darwin' ? [join(home, '.zprofile')] : [join(home, '.profile'), join(home, '.bashrc')]
  const line = 'export PATH="$HOME/.local/bin:$PATH" # TermPilot'
  for (const file of files) {
    let text = ''
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      text = ''
    }
    if (text.includes('.local/bin')) continue
    writeFileSync(file, `${text.endsWith('\n') || text.length === 0 ? text : `${text}\n`}${line}\n`, 'utf8')
  }
}
