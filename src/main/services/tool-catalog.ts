import { ZodError, z, type ZodRawShape, type ZodTypeAny } from 'zod'
import { TERM_KEYS } from '../../shared/term-keys'

export interface ToolDef {
  name: string
  description: string
  readOnly?: boolean
  /** 截图类工具把图片附在 MCP 结果里。命令行只返回路径。 */
  images?: 'always' | 'ranged'
  input?: ZodRawShape
}

const sessionFields: ZodRawShape = {
  mode: z.enum(['forward', 'reverse']).optional().describe('forward 主动连服务器；reverse 只在 127.0.0.1 监听'),
  host: z.string().optional().describe('正向 SSH 的主机'),
  port: z.number().int().min(1).max(65535).optional().describe('正向 SSH 端口，默认 22'),
  username: z.string().optional().describe('登录用户'),
  authType: z.enum(['password', 'key']).optional().describe('password 或 key'),
  keyPath: z.string().optional().describe('私钥文件的本机绝对路径'),
  secret: z
    .string()
    .optional()
    .describe('密码或私钥口令。加密保存，之后不会再返回。留空表示不修改'),
  listenPort: z.number().int().min(1).max(65535).optional().describe('反向监听端口'),
  group: z.string().optional().describe('侧边栏分组，留空归入未分组'),
  remark: z.string().optional().describe('备注')
}

const lineFields: ZodRawShape = {
  termId: z.string().describe('终端 id'),
  startLine: z.number().int().min(0).optional().describe('起始行，包含。0 是最旧的一行'),
  endLine: z.number().int().min(0).optional().describe('结束行，包含')
}

/** MCP 注册和命令行 tools / schema / call 共用这一份。 */
export const TOOLS: readonly ToolDef[] = [
  {
    name: 'session_list',
    description: '列出已保存的连接。不含密码和私钥口令。',
    readOnly: true
  },
  {
    name: 'session_connect',
    description: '按 id 或名称连接一条正向 SSH，并在界面打开终端。返回 termId。',
    input: { session: z.string().describe('会话 id 或名称') }
  },
  {
    name: 'session_disconnect',
    description: '断开某个会话下所有终端，并关掉它的文件连接。',
    input: { session: z.string().describe('会话 id 或名称') }
  },
  {
    name: 'session_create',
    description: '新建并保存一条 SSH 连接。密码和私钥口令加密存在本机。创建后会出现在侧边栏，再用 session_connect 打开。',
    input: { name: z.string().describe('显示名称，不能和已有连接重名'), ...sessionFields }
  },
  {
    name: 'session_update',
    description: '修改已保存的 SSH 连接。只填要改的字段。secret 留空则保留原密码。已经打开的终端不会自动重连。',
    input: { session: z.string().describe('会话 id 或名称'), name: z.string().optional().describe('新的显示名称'), ...sessionFields }
  },
  {
    name: 'session_delete',
    description: '删除一条已保存的 SSH 连接，并断开它打开的终端。开启危险确认时会先询问。',
    input: { session: z.string().describe('会话 id 或名称') }
  },
  {
    name: 'term_list',
    description: '列出当前打开的终端。',
    readOnly: true
  },
  {
    name: 'term_exec',
    description: '在 shell 提示符下执行一条命令，等到输出安静后返回文本。菜单、安装向导和 TUI 还在跑时不要用它，改用 term_write。',
    input: {
      termId: z.string().describe('终端 id'),
      command: z.string().describe('要执行的命令。末尾没有换行时会自动补上'),
      timeoutMs: z.number().int().min(500).max(120_000).optional().describe('等待毫秒，默认 20000')
    }
  },
  {
    name: 'term_write',
    description:
      '向当前终端发送按键或文字，用于上下左右选择、输入内容、回车确认和 TUI。keys 按顺序先发，然后输入 text，submit 为 true 时最后回车。发完返回当前画面。密码和验证码不要代填。',
    input: {
      termId: z.string().describe('终端 id'),
      keys: z.array(z.enum(TERM_KEYS)).max(40).optional().describe('按键名，按顺序发送'),
      text: z.string().max(4096).optional().describe('紧接在 keys 后面输入的文字'),
      submit: z.boolean().optional().describe('输入后再补一次回车'),
      data: z.string().max(65_536).optional().describe('原始字节，只在 keys 无法表达时使用')
    }
  },
  {
    name: 'term_read',
    description: '读取终端最近输出，已去掉 ANSI 控制符。',
    readOnly: true,
    input: {
      termId: z.string().describe('终端 id'),
      maxChars: z.number().int().min(200).max(50_000).optional().describe('最多返回多少字符，默认 8000')
    }
  },
  {
    name: 'term_close',
    description: '断开并关闭一个终端标签。',
    input: { termId: z.string().describe('终端 id') }
  },
  {
    name: 'local_term_open',
    description: '打开一个本机终端标签，返回 termId。之后用 term_exec 执行命令。'
  },
  {
    name: 'term_lines',
    description: '读出终端缓冲里的文字，每行带行号。不填范围就是当前画面。0 是最旧的一行。先用它确定行号，再交给 term_screenshot。',
    readOnly: true,
    input: lineFields
  },
  {
    name: 'term_screenshot',
    description:
      '截取终端画面。不填行号就截当前这一屏。填了 startLine 和 endLine（两端都包含，0 是最旧的一行）就只返回这一段裁好的图。行号用 term_lines 查。设置里打开「合成算法」时按缓冲拼图，不滚动正在看的画面；关闭时拍摄已经画出来的画面。',
    readOnly: true,
    images: 'always',
    input: lineFields
  },
  {
    name: 'term_screenshot_scrollback',
    description:
      '把终端缓冲接成长图。startLine / endLine 两端都包含，0 是最旧的一行；填了范围就只返回裁好的这一段。设置里打开「合成算法」时按缓冲拼图，不滚动正在看的画面；关闭时逐屏拍摄再接上。',
    readOnly: true,
    images: 'ranged',
    input: lineFields
  },
  {
    name: 'sftp_list',
    description: '列出正向 SSH 会话的远端目录。',
    readOnly: true,
    input: {
      session: z.string().describe('会话 id 或名称'),
      path: z.string().optional().describe('远端目录，默认家目录')
    }
  },
  {
    name: 'sftp_mkdir',
    description: '在正向 SSH 上新建远端目录。path 是完整远端路径。',
    input: { session: z.string().describe('会话 id 或名称'), path: z.string().describe('完整远端路径') }
  },
  {
    name: 'sftp_upload',
    description: '把本机绝对路径的文件上传到远端路径。',
    input: {
      session: z.string().describe('会话 id 或名称'),
      localPath: z.string().describe('本机绝对路径'),
      remotePath: z.string().describe('远端路径')
    }
  },
  {
    name: 'sftp_download',
    description: '把远端文件下载到本机绝对路径。',
    input: {
      session: z.string().describe('会话 id 或名称'),
      remotePath: z.string().describe('远端路径'),
      localPath: z.string().describe('本机绝对路径')
    }
  },
  {
    name: 'sftp_rename',
    description: '重命名或移动远端文件。from 和 to 都是远端路径。',
    input: {
      session: z.string().describe('会话 id 或名称'),
      from: z.string().describe('原远端路径'),
      to: z.string().describe('新远端路径')
    }
  },
  {
    name: 'sftp_remove',
    description: '删除远端文件或目录。目录会连同里面的内容一起删除。',
    input: {
      session: z.string().describe('会话 id 或名称'),
      path: z.string().describe('远端路径'),
      kind: z.enum(['file', 'dir', 'link']).describe('file、dir 或 link')
    }
  }
]

export function findTool(name: string): ToolDef {
  const tool = TOOLS.find((item) => item.name === name)
  if (!tool) throw new Error(`未知命令: ${name}`)
  return tool
}

export function parseToolArgs(name: string, raw: Record<string, unknown>): Record<string, unknown> {
  const tool = findTool(name)
  if (!tool.input) return {}
  try {
    return z.object(tool.input).parse(raw)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(error.issues.map((issue) => `${issue.path.join('.') || name}: ${issue.message}`).join('\n'))
    }
    throw error
  }
}

export function toolsText(): string {
  return JSON.stringify(
    TOOLS.map((tool) => ({ name: tool.name, description: tool.description })),
    null,
    2
  )
}

export function schemaText(name?: string): string {
  if (!name) return JSON.stringify(TOOLS.map(toolSchema), null, 2)
  return JSON.stringify(toolSchema(findTool(name)), null, 2)
}

function toolSchema(tool: ToolDef) {
  const properties: Record<string, JsonField> = {}
  const required: string[] = []
  for (const [key, field] of Object.entries(tool.input ?? {})) {
    const json = fieldJson(field)
    properties[key] = json.schema
    if (json.required) required.push(key)
  }
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: { type: 'object', properties, required }
  }
}

interface JsonField {
  type: string
  description?: string
  enum?: readonly string[]
  items?: { type: string; enum?: readonly string[] }
  minimum?: number
  maximum?: number
}

function fieldJson(field: ZodTypeAny): { required: boolean; schema: JsonField } {
  let current = field
  let required = true
  if (current instanceof z.ZodOptional) {
    required = false
    current = current.unwrap()
  }
  const description = field.description || current.description
  const schema: JsonField = { type: jsonType(current) }
  if (description) schema.description = description
  if (current instanceof z.ZodEnum) schema.enum = current.options
  if (current instanceof z.ZodArray && current.element instanceof z.ZodEnum) {
    schema.items = { type: 'string', enum: current.element.options }
  }
  if (current instanceof z.ZodNumber) {
    for (const check of current._def.checks) {
      if (check.kind === 'min') schema.minimum = check.value
      if (check.kind === 'max') schema.maximum = check.value
    }
  }
  return { required, schema }
}

function jsonType(field: ZodTypeAny): string {
  if (field instanceof z.ZodString || field instanceof z.ZodEnum) return 'string'
  if (field instanceof z.ZodNumber) return 'integer'
  if (field instanceof z.ZodBoolean) return 'boolean'
  if (field instanceof z.ZodArray) return 'array'
  return 'string'
}
