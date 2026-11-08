import { app } from 'electron'
import { readdirSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

export function screenshotsDir(): string {
  return join(app.getPath('userData'), 'screenshots')
}

/** 截图只留最近 200 张、7 天内的，其余删掉，避免长期使用把用户目录撑大。 */
const SCREENSHOT_KEEP = 200
const SCREENSHOT_MAX_AGE = 7 * 24 * 60 * 60 * 1000

export function pruneScreenshots(): void {
  const dir = screenshotsDir()
  let names: string[]
  try {
    names = readdirSync(dir)
  } catch {
    return
  }
  const now = Date.now()
  const files: Array<{ file: string; at: number }> = []
  for (const name of names) {
    if (!name.endsWith('.png')) continue
    const file = join(dir, name)
    try {
      files.push({ file, at: statSync(file).mtimeMs })
    } catch {
      /* 刚被别的进程删掉，跳过 */
    }
  }
  files.sort((a, b) => b.at - a.at)
  for (let i = 0; i < files.length; i++) {
    if (i < SCREENSHOT_KEEP && now - files[i].at < SCREENSHOT_MAX_AGE) continue
    try {
      unlinkSync(files[i].file)
    } catch {
      /* 删不掉就留着，下次再试 */
    }
  }
}
