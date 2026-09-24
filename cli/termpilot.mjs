#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { request } from 'node:http'
import { homedir } from 'node:os'
import { join } from 'node:path'

const HELP = `用法:
  termpilot tools
  termpilot schema [工具名]
  termpilot call <工具名> '<JSON 参数>'

先打开 TermPilot。命令自己读取本机配置，不用把令牌贴出来。
MCP 不可用时用这条命令，操作的是同一个窗口。工具和参数与窗口里的 MCP 是同一份。

例子:
  termpilot tools
  termpilot schema term_exec
  termpilot call term_list
  termpilot call term_exec '{"termId":"...","command":"uname -a"}'
  termpilot call term_write '{"termId":"...","keys":["up"],"submit":true}'

看文字用 term_lines。截图只在必须看画面时用，返回的是图片路径。`

function configFile() {
  if (process.env.APPDATA) return join(process.env.APPDATA, 'TermPilot', 'mcp.json')
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'TermPilot', 'mcp.json')
  }
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'TermPilot', 'mcp.json')
}

function parseArgs(argv) {
  const [op, name, json] = argv
  if (!op || op === 'help' || op === '--help' || op === '-h') return null
  if (op === 'tools') return { op }
  if (op === 'schema') return { op, ...(name ? { tool: name } : {}) }
  if (op !== 'call') throw new Error('用法: termpilot tools | schema [工具名] | call <工具名> \'<JSON>\'')
  if (!name) throw new Error('用法: termpilot call <工具名> \'<JSON>\'')
  if (!json) return { op, tool: name, args: {} }
  let args
  try {
    args = JSON.parse(json)
  } catch {
    throw new Error('参数必须是 JSON 对象')
  }
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('参数必须是 JSON 对象')
  return { op, tool: name, args }
}

function loadConfig() {
  let data
  try {
    data = JSON.parse(readFileSync(configFile(), 'utf8'))
  } catch {
    throw new Error('先打开一次 TermPilot。')
  }
  if (!data || typeof data.url !== 'string' || typeof data.token !== 'string' || !data.token) {
    throw new Error('TermPilot 配置不完整，请先打开一次窗口。')
  }
  if (data.enabled === false) throw new Error('请先在 TermPilot 设置里允许助手连接。')
  const url = new URL(data.url)
  return { hostname: url.hostname, port: Number(url.port || 80), token: data.token }
}

function call(config, body) {
  const payload = JSON.stringify(body)
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: config.hostname,
        port: config.port,
        path: '/cli',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
          authorization: `Bearer ${config.token}`
        },
        timeout: 130_000
      },
      (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          try {
            resolve(JSON.parse(text))
          } catch {
            reject(new Error(text || `请求失败 ${res.statusCode}`))
          }
        })
      }
    )
    req.on('timeout', () => req.destroy(new Error('等待 TermPilot 超时')))
    req.on('error', (error) => {
      if (error && error.code === 'ECONNREFUSED') reject(new Error('TermPilot 没在运行，先打开窗口。'))
      else reject(error)
    })
    req.end(payload)
  })
}

try {
  const parsed = parseArgs(process.argv.slice(2))
  if (!parsed) {
    console.log(HELP)
    process.exit(0)
  }
  const result = await call(loadConfig(), parsed)
  if (!result || result.ok !== true) {
    console.error(result && result.text ? result.text : '失败')
    process.exit(1)
  }
  const text = typeof result.text === 'string' ? result.text : ''
  process.stdout.write(text)
  if (text && !text.endsWith('\n')) process.stdout.write('\n')
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
