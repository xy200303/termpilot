#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { request } from 'node:http'
import { homedir } from 'node:os'
import { join } from 'node:path'

const HELP = `用法:
  termpilot tools
  termpilot schema [工具名]
  termpilot call <工具名> ['<JSON>']
  termpilot call <工具名> --json-stdin
  termpilot call <工具名> --json-file <路径>

先打开 TermPilot。命令自己读取本机配置，不用把令牌贴出来。
MCP 不可用时用这条命令，操作的是同一个窗口。工具和参数与窗口里的 MCP 是同一份。

Windows 的 termpilot.cmd 会拆掉复杂 JSON 里的引号。参数里有引号、反斜杠或 % 时，写进文件或从标准输入传。
加 --json 时，结果是一行 {"ok":true,"text":"..."}，中文写成 \\u 转义。

例子:
  termpilot tools
  termpilot schema term_exec
  termpilot call term_list
  termpilot call term_exec --json-file args.json
  type args.json | termpilot call term_write --json-stdin --json

看文字用 term_lines。截图只在必须看画面时用，返回的是图片路径。`

function configFile() {
  if (process.env.APPDATA) return join(process.env.APPDATA, 'TermPilot', 'mcp.json')
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'TermPilot', 'mcp.json')
  }
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'TermPilot', 'mcp.json')
}

function parseArgs(argv) {
  const rest = []
  let jsonMode = false
  let jsonFile = ''
  let jsonStdin = false
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i]
    if (item === '--json') {
      jsonMode = true
      continue
    }
    if (item === '--json-stdin') {
      jsonStdin = true
      continue
    }
    if (item === '--json-file') {
      const file = argv[i + 1]
      if (!file || file.startsWith('--')) throw new Error('缺少 --json-file 的路径')
      jsonFile = file
      i += 1
      continue
    }
    rest.push(item)
  }
  if (jsonStdin && jsonFile) throw new Error('不要同时用 --json-stdin 和 --json-file')

  const [op, name, inline] = rest
  if (!op || op === 'help' || op === '--help' || op === '-h') return null
  if (op === 'tools') return { op, jsonMode }
  if (op === 'schema') return { op, jsonMode, ...(name ? { tool: name } : {}) }
  if (op !== 'call') throw new Error('用法: termpilot tools | schema [工具名] | call <工具名> [--json-stdin | --json-file 路径]')
  if (!name || name.startsWith('--')) throw new Error('用法: termpilot call <工具名> [--json-stdin | --json-file 路径]')
  if (inline && (jsonStdin || jsonFile)) throw new Error('命令行上的 JSON 不要和 --json-stdin、--json-file 一起用')

  let raw = inline
  if (jsonStdin) raw = readFileSync(0, 'utf8')
  else if (jsonFile) raw = readFileSync(jsonFile, 'utf8')
  if (jsonStdin || jsonFile) {
    if (raw == null || String(raw).trim() === '') throw new Error(`参数必须是 JSON 对象，收到: ${preview(String(raw ?? ''))}`)
    return { op, jsonMode, tool: name, args: parseObject(raw) }
  }
  return { op, jsonMode, tool: name, args: raw == null || String(raw).trim() === '' ? {} : parseObject(raw) }
}

function parseObject(raw) {
  const text = String(raw).replace(/^\uFEFF/, '').trim()
  let args
  try {
    args = JSON.parse(text)
  } catch {
    throw new Error(`参数必须是 JSON 对象，收到: ${preview(text)}`)
  }
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw new Error(`参数必须是 JSON 对象，收到: ${preview(text)}`)
  }
  return args
}

function preview(text) {
  return text.replace(/\s+/g, ' ').slice(0, 200)
}

function asciiJson(value) {
  return JSON.stringify(value).replace(/[\u0080-\uffff]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`)
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

function emit(jsonMode, result) {
  if (jsonMode) {
    process.stdout.write(`${asciiJson(result)}\n`)
    return
  }
  if (!result || result.ok !== true) {
    console.error(result && result.text ? result.text : '失败')
    return
  }
  const text = typeof result.text === 'string' ? result.text : ''
  process.stdout.write(text)
  if (text && !text.endsWith('\n')) process.stdout.write('\n')
}

const jsonMode = process.argv.includes('--json')
try {
  const parsed = parseArgs(process.argv.slice(2))
  if (!parsed) {
    console.log(HELP)
    process.exit(0)
  }
  const result = await call(loadConfig(), { op: parsed.op, ...(parsed.tool ? { tool: parsed.tool } : {}), ...(parsed.args ? { args: parsed.args } : {}) })
  emit(parsed.jsonMode, result)
  if (!result || result.ok !== true) process.exit(1)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  emit(jsonMode, { ok: false, text: message })
  process.exit(1)
}
