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
  protocol: z
    .enum(['ssh', 'telnet', 'serial', 'rdp', 'vnc'])
    .optional()
    .describe('Connection protocol, ssh by default. telnet/serial carry a terminal stream only; rdp/vnc are standalone desktops with no exec or SFTP'),
  mode: z.enum(['forward', 'reverse']).optional().describe('SSH only: forward dials the server; reverse listens on 127.0.0.1 only'),
  host: z.string().optional().describe('Host for SSH, Telnet, RDP or VNC'),
  port: z.number().int().min(1).max(65535).optional().describe('SSH 22，Telnet 23，RDP 3389，VNC 5900'),
  username: z.string().optional().describe('SSH login user'),
  authType: z.enum(['password', 'key']).optional().describe('password 或 key'),
  keyPath: z.string().optional().describe('私钥文件的本机绝对路径'),
  secret: z
    .string()
    .optional()
    .describe('Password or key passphrase. Stored encrypted and never returned; leave empty to keep the current one'),
  serialPath: z.string().optional().describe('Serial device path (protocol = serial), e.g. COM3 or /dev/ttyUSB0. Use serial_list to see local ports first'),
  baudRate: z.number().int().optional().describe('Serial baud rate, default 115200'),
  dataBits: z.number().int().min(5).max(8).optional().describe('Serial data bits, default 8'),
  stopBits: z.number().int().min(1).max(2).optional().describe('Serial stop bits, default 1'),
  parity: z.enum(['none', 'even', 'odd', 'mark', 'space']).optional().describe('Serial parity, default none'),
  listenPort: z.number().int().min(1).max(65535).optional().describe('Reverse listener port (SSH only)'),
  sftpMode: z
    .enum(['auto', 'shared', 'fresh'])
    .optional()
    .describe(
      'Forward SSH only: which SSH carries the file channel (sftp_*). auto (default) switches the target to internal-sftp and dials separately when SFTP is missing; shared reuses the terminal connection without touching sshd or dialing again (use it when the jump host authorizes a single forwarding); fresh always dials separately'
    ),
  viewOnly: z.boolean().optional().describe('VNC only: view only, do not send mouse or keyboard'),
  width: z.number().int().min(320).max(7680).optional().describe('Desktop width for RDP / VNC; leave empty to follow the window'),
  height: z.number().int().min(240).max(4320).optional().describe('Desktop height for RDP / VNC; leave empty to follow the window'),
  nativeClient: z.boolean().optional().describe('RDP only: true uses the FreeRDP native window; false (default) uses embedded IronRDP'),
  clipboard: z.boolean().optional().describe('VNC / embedded RDP only: share the text clipboard both ways with this machine, default true'),
  performance: z.enum(['auto', 'quality', 'balanced', 'speed']).optional().describe('VNC / RDP only: auto, quality, balanced or speed; default balanced'),
  group: z.string().optional().describe('Sidebar group; leave empty for ungrouped'),
  remark: z.string().optional().describe('Note')
}

const connId = z.string().describe('Connection id, starts with conn-. Do not pass a name, a note, or a term- id')
const termId = z.string().describe('Terminal id, starts with term-')
const viewId = z.string().describe('Desktop id, starts with view-. Get it from desktop_list or connection_open')

const lineFields: ZodRawShape = {
  termId,
  startLine: z.number().int().min(0).optional().describe('Start line, inclusive. 0 is the oldest line'),
  endLine: z.number().int().min(0).optional().describe('End line, inclusive')
}

/** MCP 注册和命令行 tools / schema / call 共用这一份。 */
export const TOOLS: readonly ToolDef[] = [
  {
    name: 'connection_list',
    description:
      'List saved connections. id is the conn- id used for calls. name and remark only help you recognise a connection; do not pass them as parameters. Passwords are not included. Each connection reports protocol (ssh / telnet / serial) and capabilities: only ssh has an exec channel (term_exec), SFTP (sftp_*) and concurrent channels; telnet and serial only carry a terminal byte stream, so use term_pty / term_write / term_lines / term_screenshot for them.',
    readOnly: true
  },
  {
    name: 'connection_open',
    description: 'Open a connection by conn- id. SSH / Telnet / serial open a new terminal and return termId; RDP / VNC keep one desktop tab per connection and reuse the existing viewId when already open.',
    input: { connection: connId }
  },
  {
    name: 'connection_close',
    description: 'Close every terminal or desktop window of a connection and drop its file channel.',
    input: { connection: connId }
  },
  {
    name: 'connection_create',
    description:
      'Create and save a connection, returning its conn- id. protocol is ssh (default), telnet, serial, rdp or vnc. ssh needs host/username/secret; telnet needs host (port defaults to 23); serial needs serialPath; rdp defaults to 3389 and vnc to 5900. Desktop protocols only show a picture and have no exec/SFTP; RDP uses embedded IronRDP unless nativeClient=true (FreeRDP). Passwords and key passphrases are stored encrypted on this machine.',
    input: { name: z.string().describe('显示名称，不能和已有连接重名'), ...sessionFields }
  },
  {
    name: 'connection_update',
    description: 'Update a saved connection. connection is the conn- id; remark writes the note. Names and notes are not used for lookup. Open terminals are not reconnected automatically.',
    input: { connection: connId, name: z.string().optional().describe('新的显示名称'), ...sessionFields }
  },
  {
    name: 'connection_delete',
    description: 'Delete a saved connection and close the terminals it opened. Asks first when dangerous-action confirmation is on.',
    input: { connection: connId }
  },
  {
    name: 'serial_list',
    description:
      'List available local serial ports (path, manufacturer, serial number) to prepare a serial connection. Create one with connection_create, protocol = serial and serialPath set to one of these paths.',
    readOnly: true
  },
  {
    name: 'term_list',
    description: 'List opened terminals that are not closed. status connected means still connected; disconnected or error means it is gone. Ids, titles and notes survive a restart, and lines already drawn are written back; new sessions start on the next line. Use term_reconnect for a disconnected terminal instead of connection_open. termId is the term- id.',
    readOnly: true
  },
  {
    name: 'term_exec',
    description:
      'Default tool for running commands (formerly term_exec2). Runs on a separate exec channel without occupying the terminal, can run concurrently, and needs no open terminal. Returns JSON: stdout and stderr separately, both raw byte streams (no wrapping, no echo, no ANSI); exitCode comes from protocol events; plus duration (seconds), timedOut and truncated. The command is passed to remote bash (or sh) as-is; multi-line, heredoc and quoting are supported, so do not escape it yourself. Reusing the same session name carries cd and export across calls (stored under ~/.cache/termpilot/exec/ on the remote); omit it for a fresh environment each time. prelude is injected before every run. Use term_pty for interactive work, TUIs, or when you need the terminal picture or a screenshot.',
    input: {
      connection: connId,
      command: z.string().describe('要执行的命令，原样嵌入远端脚本，不需要转义'),
      session: z.string().optional().describe('环境会话名。填了就在同名会话间承接 cd 和 export；不填每次全新环境'),
      prelude: z.string().optional().describe('每次执行前先注入的片段，比如 source 环境脚本。固定不变的环境配置放这里'),
      timeout: z
        .number()
        .int()
        .min(1)
        .max(3600)
        .optional()
        .describe('最多等多少秒，默认 20。到点后断开通道（timedOut 为 true）并返回已经收到的内容，远端进程可能已被挂断。命令预计要跑很久时，把这个值调大。'),
      maxBytes: z
        .number()
        .int()
        .min(1000)
        .max(1_000_000)
        .optional()
        .describe('stdout 和 stderr 各自最多返回多少字符，默认 50000。超出时保留开头和结尾，truncated 为 true')
    }
  },
  {
    name: 'term_pty',
    description:
      'Type a command into an opened terminal (formerly term_exec). Waits until it finishes (the prompt returns) and returns only the new output; POSIX shells also report the exit code. Output is what the terminal renders: echoed, wrapped to the window width, possibly coloured; do not parse it in programs — use term_exec for that. If it is still running at timeout, returns what has arrived so far and the command keeps running remotely. Do not use it while menus, installers or TUIs are running; use term_write instead. Stop a foreground command with term_write and keys ["ctrl-c"].',
    input: {
      termId,
      command: z.string().describe('要执行的命令。末尾没有换行时会自动补上'),
      timeout: z
        .number()
        .int()
        .min(1)
        .max(3600)
        .optional()
        .describe('这次调用最多等多少秒，默认 20。不是命令的时限。到点后还没回到提示符，就先把已经回来的内容交出去，命令还在远端跑。命令预计要跑很久时，把这个值调大。')
    }
  },
  {
    name: 'term_write',
    description:
      'Send keys or text to the current terminal: arrow-key selection, typing, Enter, TUIs. PTY terminals only. keys are sent in order, then text, and a final Enter when submit is true. Returns the current screen. Never fill in passwords or verification codes.',
    input: {
      termId,
      keys: z.array(z.enum(TERM_KEYS)).max(40).optional().describe('按键名，按顺序发送'),
      text: z.string().max(4096).optional().describe('紧接在 keys 后面输入的文字'),
      submit: z.boolean().optional().describe('输入后再补一次回车'),
      data: z.string().max(65_536).optional().describe('原始字节，只在 keys 无法表达时使用')
    }
  },
  {
    name: 'term_reconnect',
    description: 'Reconnect a disconnected terminal. Id, title and note are kept, and lines drawn before the disconnect are written back. Returns immediately when already connected. Do not call connection_open for this.',
    input: { termId }
  },
  {
    name: 'term_close',
    description: 'Disconnect and close a terminal tab.',
    input: { termId }
  },
  {
    name: 'term_update',
    description: 'Write a note on an opened terminal so you can recognise it later. The id does not change.',
    input: { termId, remark: z.string().describe('这扇终端正在做什么。空字符串表示清掉') }
  },
  {
    name: 'term_open_local',
    description: 'Open a local terminal and return its termId. There is no connection. Then run commands with term_pty and add a note with term_update.'
  },
  {
    name: 'term_lines',
    description: 'Read terminal buffer text, one line per row with line numbers, ANSI stripped. PTY terminals only. Without a range it returns the current screen; pass startLine 0 to read from the oldest output. Use it to find line numbers, then pass them to term_screenshot.',
    readOnly: true,
    input: lineFields
  },
  {
    name: 'term_screenshot',
    description:
      'Capture the terminal screen. PTY terminals only. Defaults to the current screen; scope=buffer stitches the whole scrollback into one long image. With startLine and endLine (both inclusive, 0 is the oldest line) only that range is returned, already cropped. About 20 screens per call; longer ranges keep the tail and report the total buffer and the captured lines. Find line numbers with term_lines. With "compose" enabled in Settings, images are stitched from the buffer without scrolling the view; otherwise the visible screen is captured.',
    readOnly: true,
    images: 'always',
    input: {
      ...lineFields,
      scope: z.enum(['viewport', 'buffer']).optional().describe('viewport 只截当前屏（默认），buffer 截整段缓冲')
    }
  },
  {
    name: 'sftp_list',
    description: 'List a remote directory over the current SSH session.',
    readOnly: true,
    input: {
      connection: connId,
      path: z.string().optional().describe('远端目录，默认家目录')
    }
  },
  {
    name: 'sftp_mkdir',
    description: 'Create a remote directory over the current SSH session. path is the full remote path.',
    input: { connection: connId, path: z.string().describe('完整远端路径') }
  },
  {
    name: 'sftp_upload',
    description: 'Upload a local file to a remote path. Files over 512MB are rejected.',
    input: {
      connection: connId,
      localPath: z.string().describe('本机绝对路径'),
      remotePath: z.string().describe('远端路径')
    }
  },
  {
    name: 'sftp_download',
    description: 'Download a remote file to a local absolute path. Files over 512MB are rejected; keep multi-GB files on the remote machine.',
    input: {
      connection: connId,
      remotePath: z.string().describe('远端路径'),
      localPath: z.string().describe('本机绝对路径')
    }
  },
  {
    name: 'sftp_rename',
    description: 'Rename or move a remote file. from and to are remote paths.',
    input: {
      connection: connId,
      from: z.string().describe('原远端路径'),
      to: z.string().describe('新远端路径')
    }
  },
  {
    name: 'sftp_remove',
    description: 'Delete a remote file or directory. Directories are removed recursively.',
    input: {
      connection: connId,
      path: z.string().describe('远端路径'),
      kind: z.enum(['file', 'dir', 'link']).describe('file、dir 或 link')
    }
  },
  {
    name: 'desktop_list',
    description: 'List open desktops (viewId, connection, protocol, embedded or native window). Each VNC / RDP connection keeps one desktop tab. Call it before desktop operations to get viewId.',
    readOnly: true
  },
  {
    name: 'desktop_screenshot',
    description:
      'Capture a desktop and return a PNG. The reply includes a shotId. A 100px coordinate grid is drawn by default; grid units are image pixels, so coordinates can be passed straight to desktop_click. Pass grid=false to disable, or 20–500 for custom spacing. region captures only that area; the top-left corner shows where the crop starts in the full picture and grid labels stay in full-picture coordinates, so they still work with desktop_click. Line colours are generated per block in OKLCH with APCA contrast checks; denser grids are fainter. Native RDP captures the window frame including the system title bar, the same basis used for clicks.',
    images: 'always',
    input: {
      viewId,
      grid: z.union([z.boolean(), z.number().int().min(20).max(500)]).optional().describe('默认 100px 网格；false 关闭，或自定义间距'),
      region: z
        .object({
          x: z.number().int().min(0),
          y: z.number().int().min(0),
          width: z.number().int().min(8),
          height: z.number().int().min(8)
        })
        .optional()
        .describe('只截这块区域（整屏像素坐标），缺省截整屏')
    }
  },
  {
    name: 'desktop_click',
    description:
      'Click a desktop. x/y are pixels in the image returned by desktop_screenshot: canvas coordinates for VNC / embedded RDP, window-frame coordinates for native RDP (the picture includes the system title bar, the same basis as clicks). Pass back the shotId from the screenshot so coordinates are scaled when the window was resized, the VNC resolution changed or RDP renegotiated; without shotId the latest screenshot for that desktop is used, and imageWidth/imageHeight can be passed explicitly. button defaults to left, double=true double-clicks. View-only VNC rejects input.',
    input: {
      viewId,
      x: z.number().int().min(0).describe('图片横坐标'),
      y: z.number().int().min(0).describe('图片纵坐标'),
      button: z.enum(['left', 'middle', 'right']).optional().describe('默认 left'),
      double: z.boolean().optional().describe('是否双击'),
      imageWidth: z.number().int().min(1).optional().describe('截图时的图片宽度，缺省用最近一张截图'),
      imageHeight: z.number().int().min(1).optional().describe('截图时的图片高度'),
      shotId: z.string().optional().describe('desktop_screenshot 返回的截图编号，按那张图的坐标换算')
    }
  },
  {
    name: 'desktop_key',
    description:
      'Send a key or key combination, e.g. enter, tab, esc, up/down/left/right, ctrl-c, ctrl-shift-t, alt-tab. Punctuation can be named minus, slash, comma, period, etc.',
    input: { viewId, keys: z.string().describe('按键组合，用 - 连接') }
  },
  {
    name: 'desktop_type',
    description:
      'Type text into a desktop. The default method=keys sends characters one by one (VNC uses Unicode keysyms, embedded RDP uses Unicode key events); Chinese may be intercepted by the remote input method. For longer Chinese text use method=clipboard: the whole text is written to the remote clipboard and a paste shortcut is sent. pasteKeys defaults to ctrl-v; terminals usually need ctrl-shift-v. Native Windows windows always paste through the local clipboard. Ask the user before typing passwords or sensitive text.',
    input: {
      viewId,
      text: z.string().describe('要输入的文字'),
      method: z.enum(['keys', 'clipboard']).optional().describe('keys 逐字按键（默认）；clipboard 写远端剪贴板后粘贴'),
      pasteKeys: z.string().optional().describe('clipboard 模式用的粘贴快捷键，默认 ctrl-v；终端用 ctrl-shift-v')
    }
  },
  {
    name: 'desktop_scroll',
    description: 'Scroll a desktop. deltaY is positive downwards, negative upwards; x/y are optional and use the same image coordinates; coordinates are scaled when the size changed, like clicks.',
    input: {
      viewId,
      x: z.number().int().min(0).optional(),
      y: z.number().int().min(0).optional(),
      deltaY: z.number().int().describe('滚动量，正负均可'),
      imageWidth: z.number().int().min(1).optional().describe('截图时的图片宽度，缺省用最近一张截图'),
      imageHeight: z.number().int().min(1).optional().describe('截图时的图片高度'),
      shotId: z.string().optional().describe('desktop_screenshot 返回的截图编号，按那张图的坐标换算')
    }
  },
  {
    name: 'desktop_wait',
    description: 'Wait for a fixed time, or until the picture is stable. ms defaults to 500; stableMs > 0 waits for a stable picture, timeoutMs defaults to 10000. Native windows only support a fixed wait.',
    input: {
      viewId,
      ms: z.number().int().min(0).max(60000).optional().describe('固定等待毫秒'),
      stableMs: z.number().int().min(0).max(60000).optional().describe('连续稳定多少毫秒后返回'),
      timeoutMs: z.number().int().min(100).max(60000).optional().describe('稳定检测超时时间')
    }
  },
  {
    name: 'desktop_actions',
    description: 'Run desktop operations in order to save round trips. Each item takes the parameters of screenshot/click/key/type/scroll/wait plus an action; execution stops at the first failure and returns the error.',
    images: 'always',
    input: {
      viewId,
      actions: z.array(z.record(z.string(), z.unknown())).min(1).max(50).describe('最多 50 个操作')
    }
  },
  {
    name: 'desktop_perf',
    description: 'Read accumulated traffic, current up/down kbps and packet rate for a desktop. Use it to tell whether a slow desktop is limited by bandwidth, quality or the desktop itself.',
    readOnly: true,
    input: { viewId: z.string().optional().describe('留空返回所有已打开桌面') }
  },
  {
    name: 'desktop_a11y',
    description:
      'Read the AT-SPI control tree of a Linux VNC desktop, or click a control by its path. Uses an existing forward SSH connection to the same host; does not install dependencies. operation=tree returns name, role, coordinates, actions and path; operation=click needs path, and action is optional.',
    input: {
      viewId,
      operation: z.enum(['tree', 'click']).optional().describe('默认 tree'),
      path: z.string().optional().describe('tree 返回的控件路径，例如 0/1/2'),
      action: z.string().optional().describe('无障碍动作名，默认依次尝试 click、press、activate')
    }
  },
  {
    name: 'app_screenshot',
    description:
      'Capture the whole TermPilot window: sidebar, tab bar and terminal together, saved as a PNG and returned with a path; the image is attached to the result. A 100px coordinate grid is drawn by default; pass grid=false to disable or 20–500 for custom spacing. Useful to confirm UI state or record demo material. Nothing is captured while the window is minimised. Only this app window is captured, not other system windows.',
    images: 'always',
    input: {
      grid: z.union([z.boolean(), z.number().int().min(20).max(500)]).optional().describe('默认 100px 网格；false 关闭，或自定义间距')
    }
  },
  {
    name: 'app_record',
    description:
      'Record the TermPilot window to WebM. action=start begins (fps defaults to 15, maxSeconds to 120, at most 600); action=stop ends and returns the file path. Only one recording at a time; it stops and saves automatically at maxSeconds, and a later stop returns the saved file. Useful for demos; only the app window is recorded, without other system windows or sound.',
    input: {
      action: z.enum(['start', 'stop']).describe('start 开始录制，stop 结束并保存'),
      fps: z.number().int().min(5).max(30).optional().describe('帧率，默认 15'),
      maxSeconds: z
        .number()
        .int()
        .min(5)
        .max(600)
        .optional()
        .describe('最长录制秒数，默认 120，超过自动停止并保存')
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
