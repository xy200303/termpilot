import { app } from 'electron'
import type { UpdateCheck } from '../shared/types'

const LATEST = 'https://github.com/xy200303/termpilot/releases/latest'

/** 看 GitHub 最新发布页跳到哪个版本，和当前安装比较。不下载安装包。 */
export async function checkUpdate(): Promise<UpdateCheck> {
  const current = app.getVersion()
  let response: Response
  try {
    response = await fetch(LATEST, {
      redirect: 'manual',
      headers: { 'User-Agent': 'TermPilot' },
      signal: AbortSignal.timeout(15_000)
    })
  } catch {
    throw new Error('连不上 GitHub')
  }
  if (response.status === 404) return { current, latest: null, url: null, newer: false }
  const location = response.headers.get('location')
  if (!location) return { current, latest: null, url: null, newer: false }
  const url = releaseUrl(new URL(location, LATEST).toString())
  const latest = url?.match(/\/releases\/tag\/v?([^/]+)\/?$/)?.[1] ?? ''
  if (!url || !latest) throw new Error('GitHub 没有返回发布信息')
  return { current, latest, url, newer: compare(latest, current) > 0 }
}

/** 只打开本仓库的 GitHub 发布页。 */
export function releaseUrl(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') return null
  if (!parsed.pathname.startsWith('/xy200303/termpilot/releases')) return null
  return parsed.toString()
}

function compare(left: string, right: string): number {
  const a = parts(left)
  const b = parts(right)
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return 0
}

function parts(version: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version.trim())
  if (!match) throw new Error('无法识别版本号')
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}
