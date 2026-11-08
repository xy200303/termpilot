/* 官网文案表：键路径即组件里的 t('home.…) / tm('home.…) 参数。
   zh-CN 与 en 的键必须完全一致，改一处记得对照另一处。 */
export const messages = {
  "zh-CN": {
    "home": {
      "announcement": "AppImage 包内附带 AppStream 元数据，Linux 应用目录可读取",
      "hero": {
        "lines": [
          "终端与桌面，",
          "助手都能接着用。"
        ],
        "sub": "TermPilot 把 SSH / Telnet / 串口终端与 VNC / RDP 桌面放在同一个窗口。你在窗口里登录后，AI 助手通过内置 MCP Server 接着同一条会话或同一个桌面继续操作——口令不出本机。",
        "alt": "TermPilot 主窗口：左侧连接列表，右侧多标签终端"
      },
      "cta": {
        "download": "下载安装包",
        "docs": "使用文档",
        "github": "GitHub ↗"
      },
      "plat": "Windows · macOS · Linux，MIT 开源",
      "stats": [
        {
          "value": "5",
          "label": "类连接协议",
          "note": "SSH / Telnet / 串口 / VNC / RDP"
        },
        {
          "value": "35",
          "label": "个 Agent 工具",
          "note": "连接 / 终端 / exec / SFTP / 桌面 / 应用"
        },
        {
          "value": "0",
          "label": "遥测上报",
          "note": "没有统计、没有 crash 上报通道"
        },
        {
          "value": "6",
          "label": "个安装包",
          "note": "Windows · macOS · Linux 各两种"
        }
      ],
      "headings": {
        "tracks": "连接、桌面、操作、传输，四件事做扎实",
        "steps": "从新建连接到关掉标签",
        "privacy": "本地优先：口令存哪、谁在监听、何时外联",
        "shots": "界面",
        "compare": "和同类的做法比一比",
        "specs": "技术规格",
        "oss": "MIT 开源，自己构建只要三条命令",
        "changelog": "最近更新",
        "faqs": "常见问题",
        "final": "下载 TermPilot，把终端交给助手接着用"
      },
      "tracks": [
        {
          "key": "connect",
          "title": "连接",
          "summary": "五种协议一张表单。密码和私钥口令用系统钥匙串加密，只存本机。",
          "points": [
            "SSH 支持密码 / 私钥、多跳跳板（ssh -J）、ProxyCommand",
            "Telnet 与串口只有终端字节流，能力模型会提前说明",
            "VNC 默认 5900，RDP 默认 3389；每个桌面连接只开一个窗口",
            "可从 ~/.ssh/config 手动导入已有 Host，应用不写回该文件"
          ]
        },
        {
          "key": "desktop",
          "title": "桌面",
          "summary": "VNC / RDP 内嵌在同一个窗口，剪贴板和 Agent 操作都能直接用。",
          "points": [
            "VNC 使用 noVNC；RDP 默认 IronRDP，也可切 FreeRDP 原生窗口",
            "截图网格、图片坐标点击、中文输入、滚动和批量操作",
            "宿主机与远端双向共享文本剪贴板",
            "Linux 可读 AT-SPI 控件树；性能浮层显示流量与包速率"
          ]
        },
        {
          "key": "operate",
          "title": "操作",
          "summary": "你登录好的会话，助手接着用。不用重连，不用把密码交出去。",
          "points": [
            "exec 通道独立跑命令：stdout / stderr 分流、协议级退出码",
            "同名 session 跨调用承接 cd 和 export，环境不丢",
            "PTY 族工具发按键、读屏幕、截长图，TUI 和安装向导也能走",
            "危险命令和删除操作暂停，在窗口里等你确认"
          ]
        },
        {
          "key": "transfer",
          "title": "传输",
          "summary": "SFTP 文件面板和终端共用同一条 SSH，不掉线、不重登。",
          "points": [
            "上传 / 下载 / 新建目录 / 改名 / 删除，单文件 512MB 以内",
            "双击文本文件在线编辑，Ctrl+S 写回服务器",
            "一次性授权的跳板机：文件通道设为复用，不拨第二次",
            "目标机缺 SFTP 子系统时自动改 internal-sftp（可关）"
          ]
        }
      ],
      "steps": [
        {
          "title": "新建连接",
          "text": "填主机和账号，或从 ~/.ssh/config 导入。口令加密存本机。"
        },
        {
          "title": "打开终端",
          "text": "双击连接即开标签。多跳跳板自动串起，登录只输一次。"
        },
        {
          "title": "日常操作",
          "text": "终端与 VNC / RDP 桌面共用标签栏，右键复制或截图。"
        },
        {
          "title": "交给助手",
          "text": "复制 Agent 指引完成接入；助手可在终端或桌面里继续操作。"
        },
        {
          "title": "传文件",
          "text": "文件面板上传下载，文本文件双击直接在线改。"
        },
        {
          "title": "收工",
          "text": "关掉标签。连接、终端标题和已绘制的行，下次启动还在。"
        }
      ],
      "privacy": [
        {
          "title": "凭据只存本机",
          "text": "密码和私钥口令用 Electron safeStorage 调系统钥匙串加密，写进本机 SQLite（%APPDATA%\\TermPilot\\termpilot.db）。没有服务端，没有账号体系。"
        },
        {
          "title": "MCP 只听回环",
          "text": "内置 MCP Server 只绑定 127.0.0.1，每个请求要带 Bearer 令牌。令牌在本机 mcp.json 里，不给谁，谁就连不上。"
        },
        {
          "title": "没有遥测",
          "text": "源码里没有统计、没有 crash 上报。唯一的外联请求是你在设置页手动点「检查更新」时，读一次 GitHub 发布页。"
        }
      ],
      "shots": [
        {
          "src": "/shots/hero.png",
          "title": "主窗口",
          "text": "左侧连接与文件，右侧多标签终端。"
        },
        {
          "src": "/shots/connection.png",
          "title": "新建连接",
          "text": "五种协议一张表单，跳板和多跳在各自页签。"
        },
        {
          "src": "/shots/sftp.png",
          "title": "文件面板",
          "text": "远程目录按层展开，双击文本直接编辑。"
        },
        {
          "src": "/shots/import.png",
          "title": "从 ssh_config 导入",
          "text": "选中一个 Host，主机、私钥、跳板自动填好。"
        }
      ],
      "compare": {
        "cols": [
          "手工敲 ssh 命令",
          "图形化终端（XShell 类）",
          "TermPilot"
        ],
        "rows": [
          [
            "登录",
            "每次敲完整命令，密码靠 ssh-agent 兜底",
            "保存会话，双击连接",
            "保存连接，双击或由助手代开"
          ],
          [
            "中途交互",
            "菜单、向导、sudo 都要本人",
            "本人操作",
            "本人或助手代按，画面实时可见"
          ],
          [
            "继续下一步",
            "同一窗口继续",
            "同一窗口继续，助手进不来",
            "同一条会话助手接着做，不重连"
          ],
          [
            "批量与脚本",
            "自己写 shell 脚本",
            "基本靠手动",
            "35 个 MCP 工具 + 本机 CLI"
          ],
          [
            "凭据",
            "ssh_config / ssh-agent",
            "软件内保存",
            "系统钥匙串加密，只存本机"
          ]
        ]
      },
      "specs": [
        [
          "连接协议",
          "SSH / Telnet / 串口 / VNC / RDP"
        ],
        [
          "终端",
          "xterm.js + WebGL 渲染；本机与远程同一标签栏；滚轮横滚、右键复制截图"
        ],
        [
          "图形桌面",
          "VNC noVNC、RDP IronRDP 内嵌；RDP 可切 FreeRDP；双向文本剪贴板"
        ],
        [
          "桌面性能",
          "自动 / 画质 / 平衡 / 流畅；后台降载、缩放防抖、桥接合包与背压"
        ],
        [
          "通道",
          "shell / exec（stdout、stderr 分流，协议级退出码）/ SFTP，同一条 SSH 复用"
        ],
        [
          "文件传输",
          "上传、下载、新建目录、改名、删除；单文件 512MB 以内；文本在线编辑"
        ],
        [
          "凭据存储",
          "safeStorage 加密 → 本机 SQLite，不出本机"
        ],
        [
          "Agent 接口",
          "内置 MCP Server（35 个工具，只绑 127.0.0.1 + 令牌）；Go 写的本机 CLI"
        ],
        [
          "平台",
          "Windows x64 / macOS（Apple Silicon）/ Linux x64"
        ],
        [
          "安装包",
          "Windows Setup 146MB · macOS dmg 168MB · AppImage 167MB · deb 129MB"
        ],
        [
          "许可证",
          "MIT"
        ]
      ],
      "changelog": [
        {
          "version": "0.9.1",
          "items": [
            "AppImage 内附带 AppStream 元数据：名称、简介、分类、截图与许可证",
            "Linux 应用目录可直接读取，AppImage 目录测试不再提示缺少 appdata"
          ]
        },
        {
          "version": "0.9.0",
          "items": [
            "界面新增语言设置：跟随系统 / 简体中文 / English，主进程消息一并切换",
            "MCP 工具名、描述与参数说明统一英文，接入指引也固定英文",
            "官网提供中英文页面，首页按系统语言选择落地页"
          ]
        },
        {
          "version": "0.8.6",
          "items": [
            "图形桌面新增「中文键盘」接管，本机输入法可以直接往 VNC 里打中文",
            "新增「发送文字」，整段写远端剪贴板再粘贴；两个入口都收进标签栏图标行"
          ]
        }
      ],
      "faqs": [
        {
          "q": "密码和私钥口令存在哪里？",
          "a": "用 Electron safeStorage 调用系统钥匙串加密后，写进本机 SQLite 数据库（Windows 是 %APPDATA%\\TermPilot\\termpilot.db）。没有服务端同步，connection_list 等接口也不返回口令。"
        },
        {
          "q": "能连跳板机吗？",
          "a": "可以。支持 ssh -J 多跳、ProxyCommand，也能从 ~/.ssh/config 导入现成配置。跳板只授权一次转发时，把这条连接的「文件通道」设为复用终端连接，SFTP 就不会触发第二次拨号。"
        },
        {
          "q": "VNC 和 RDP 能像终端一样交给 Agent 操作吗？",
          "a": "可以。助手可以看桌面截图、按图片坐标点击、输入文字和组合键、滚动、等待画面稳定并批量执行操作；VNC 和内嵌 RDP 还能双向共享文本剪贴板。每个桌面连接只保留一个窗口。"
        },
        {
          "q": "Telnet 和串口能用 exec 通道和 SFTP 吗？",
          "a": "不能。这两种协议只有一条终端字节流，没有通道概念。对它们调用 term_exec 或 sftp_* 会返回明确的能力说明错误；term_pty、term_write、截图等屏幕族工具三种协议行为一致。"
        },
        {
          "q": "串口断了怎么办？",
          "a": "终端断开后用 term_reconnect（或界面上重连）恢复同一扇终端，编号、备注和已显示的内容都保留。建连接前先 serial_list 确认串口路径和参数。"
        },
        {
          "q": "AI 助手能看到我的密码吗？",
          "a": "不能。口令只在拨号时于主进程内存里短暂解密，任何工具接口都不返回。MCP Server 只绑定 127.0.0.1，且每个请求要带本机 mcp.json 里的令牌。"
        },
        {
          "q": "macOS Intel 芯片能用吗？",
          "a": "官方只发布 Apple Silicon（arm64）的 dmg 和 zip。Intel Mac 可以从源码自行构建：npm install 后跑 npm run dist:mac。"
        },
        {
          "q": "安装时提示未签名 / 未知发布者？",
          "a": "安装包没有做代码签名。Windows 在 SmartScreen 里选「仍要运行」，macOS 在访达里右键打开。介意签名的可以自己从源码构建，三条命令。"
        },
        {
          "q": "TermPilot 会上传我的数据吗？",
          "a": "没有遥测、没有统计、没有 crash 上报。唯一的外联是在设置页手动点「检查更新」时读一次 GitHub 发布页，可以在源码 update-check.ts 里核实。"
        }
      ],
      "oss": {
        "lead": "仓库：",
        "tail": "。推送到 main 跑类型检查和构建，打 tag 自动出三端安装包并发布 Release。"
      },
      "links": {
        "changelogMore": "查看完整更新日志",
        "changelogRepo": "仓库 CHANGELOG.md"
      },
      "final": {
        "win": "Windows 版",
        "mac": "macOS 版",
        "linux": "Linux 版",
        "all": "全部下载",
        "fine": "MIT 协议 · Copyright © 2026 xy200303"
      }
    },
    "download": {
      "table": {
        "platform": "平台",
        "installer": "安装包",
        "portable": "免安装",
        "windows": "Windows x64",
        "mac": "macOS（Apple Silicon）",
        "linux": "Linux x64"
      }
    }
  },
  "en": {
    "home": {
      "announcement": "AppImage builds now carry AppStream metadata for Linux app catalogs",
      "hero": {
        "lines": [
          "Terminals and desktops,",
          "ready for your agent."
        ],
        "sub": "TermPilot puts SSH / Telnet / serial terminals and VNC / RDP desktops in one window. You sign in yourself; an AI assistant then continues on the same session or the same desktop through the built-in MCP server — and your secrets never leave this machine.",
        "alt": "TermPilot main window: connections on the left, multi-tab terminals on the right"
      },
      "cta": {
        "download": "Download",
        "docs": "Documentation",
        "github": "GitHub ↗"
      },
      "plat": "Windows · macOS · Linux, MIT licensed",
      "stats": [
        {
          "value": "5",
          "label": "connection protocols",
          "note": "SSH / Telnet / serial / VNC / RDP"
        },
        {
          "value": "35",
          "label": "agent tools",
          "note": "connections / terminal / exec / SFTP / desktop / app"
        },
        {
          "value": "0",
          "label": "telemetry reports",
          "note": "no analytics, no crash reporting"
        },
        {
          "value": "6",
          "label": "installers",
          "note": "two each for Windows · macOS · Linux"
        }
      ],
      "headings": {
        "tracks": "Connect, desktop, operate, transfer — four things done properly",
        "steps": "From a new connection to closing the tab",
        "privacy": "Local first: where secrets live, who listens, when it calls out",
        "shots": "Screens",
        "compare": "How it compares",
        "specs": "Technical details",
        "oss": "MIT licensed — build it yourself in three commands",
        "changelog": "Recent updates",
        "faqs": "Frequently asked",
        "final": "Download TermPilot and hand the session over"
      },
      "tracks": [
        {
          "key": "connect",
          "title": "Connect",
          "summary": "Five protocols, one form. Passwords and key passphrases are encrypted with the system keychain and stored only here.",
          "points": [
            "SSH with passwords or keys, multi-hop jumps (ssh -J) and ProxyCommand",
            "Telnet and serial are a single byte stream, and the capability model says so up front",
            "VNC defaults to 5900, RDP to 3389; one desktop window per connection",
            "Import existing Hosts from ~/.ssh/config; the app never writes back to it"
          ]
        },
        {
          "key": "desktop",
          "title": "Desktop",
          "summary": "VNC and RDP run inside the same window, with the clipboard and agent control ready to use.",
          "points": [
            "VNC through noVNC; RDP through IronRDP by default, or a native FreeRDP window",
            "Screenshot grid, click by image coordinates, CJK input, scrolling and batched actions",
            "Text clipboard shared both ways between your machine and the remote",
            "AT-SPI control trees on Linux; a perf overlay shows traffic and packet rates"
          ]
        },
        {
          "key": "operate",
          "title": "Operate",
          "summary": "The session you signed into keeps going for your agent. No reconnects, no handing over passwords.",
          "points": [
            "A separate exec channel: split stdout / stderr and real protocol exit codes",
            "The same session name carries cd and export across calls",
            "PTY tools send keys, read the screen and capture scrollback, so TUIs and installers work",
            "Dangerous commands and deletions pause and wait for your confirmation in the window"
          ]
        },
        {
          "key": "transfer",
          "title": "Transfer",
          "summary": "The SFTP panel shares one SSH connection with the terminal — no drops, no second login.",
          "points": [
            "Upload, download, mkdir, rename and delete; files up to 512 MB",
            "Double-click a text file to edit it in place and Ctrl+S writes it back",
            "For one-shot jump hosts, set the file channel to reuse and skip the second dial",
            "Switches to internal-sftp automatically when the target lacks the SFTP subsystem (optional)"
          ]
        }
      ],
      "steps": [
        {
          "title": "Create a connection",
          "text": "Enter host and user, or import from ~/.ssh/config. Secrets are encrypted and stored locally."
        },
        {
          "title": "Open a terminal",
          "text": "Double-click to open a tab. Multi-hop jumps chain automatically, so you sign in once."
        },
        {
          "title": "Day-to-day work",
          "text": "Terminals and VNC / RDP desktops share one tab row; right-click to copy or capture."
        },
        {
          "title": "Hand it over",
          "text": "Copy the agent guide to connect; your agent then continues in the terminal or on the desktop."
        },
        {
          "title": "Move files",
          "text": "Upload and download in the file panel; edit text files in place with a double-click."
        },
        {
          "title": "Wrap up",
          "text": "Close the tab. Connections, terminal titles and the lines already drawn are still there next launch."
        }
      ],
      "privacy": [
        {
          "title": "Secrets stay local",
          "text": "Passwords and key passphrases are encrypted by Electron safeStorage through the system keychain, then written to local SQLite (%APPDATA%\\TermPilot\\termpilot.db on Windows). No server, no accounts."
        },
        {
          "title": "MCP listens on loopback only",
          "text": "The built-in MCP server binds 127.0.0.1 and every request must carry a Bearer token. The token lives in your local mcp.json; nobody else can connect."
        },
        {
          "title": "No telemetry",
          "text": "No analytics and no crash reporting in the source. The only outbound request is reading the GitHub release page when you click “Check for updates” in settings."
        }
      ],
      "shots": [
        {
          "src": "/shots/hero.png",
          "title": "Main window",
          "text": "Connections and files on the left, multi-tab terminals on the right."
        },
        {
          "src": "/shots/connection.png",
          "title": "New connection",
          "text": "Five protocols, one form; jumps and multi-hop live in their own tabs."
        },
        {
          "src": "/shots/sftp.png",
          "title": "File panel",
          "text": "Remote directories expand level by level; double-click text to edit it."
        },
        {
          "src": "/shots/import.png",
          "title": "Import from ssh_config",
          "text": "Pick a Host and the host, key and jump are filled in for you."
        }
      ],
      "compare": {
        "cols": [
          "Plain ssh in a shell",
          "GUI terminal (XShell-style)",
          "TermPilot"
        ],
        "rows": [
          [
            "Sign in",
            "Type the full command every time; rely on ssh-agent",
            "Save the session, double-click",
            "Save it, then open it yourself or let the agent do it"
          ],
          [
            "Mid-way prompts",
            "Menus, wizards and sudo are all yours",
            "You do the typing",
            "You or the agent presses keys, with the screen live"
          ],
          [
            "Continuing",
            "Same window",
            "Same window, agent cannot join",
            "The agent continues on the same session, no reconnect"
          ],
          [
            "Batch and scripts",
            "Write your own shell scripts",
            "Mostly manual",
            "35 MCP tools plus a local CLI"
          ],
          [
            "Credentials",
            "ssh_config / ssh-agent",
            "Stored inside the app",
            "System-keychain encrypted, local only"
          ]
        ]
      },
      "specs": [
        [
          "Connection protocols",
          "SSH / Telnet / serial / VNC / RDP"
        ],
        [
          "Terminal",
          "xterm.js with WebGL rendering; local and remote in one tab row; wheel scrolling, right-click copy and capture"
        ],
        [
          "Desktop",
          "VNC through noVNC, RDP through embedded IronRDP (or native FreeRDP); text clipboard both ways"
        ],
        [
          "Desktop performance",
          "Auto / quality / balanced / smooth; background throttling, debounced scaling, coalescing and backpressure"
        ],
        [
          "Channels",
          "shell / exec (split stdout and stderr, protocol exit codes) / SFTP over one shared SSH connection"
        ],
        [
          "File transfer",
          "Upload, download, mkdir, rename and delete; up to 512 MB; in-place text editing"
        ],
        [
          "Credential storage",
          "Encrypted with safeStorage into local SQLite; never leaves the machine"
        ],
        [
          "Agent interface",
          "Built-in MCP server (35 tools, bound to 127.0.0.1 with a token); local CLI written in Go"
        ],
        [
          "Platforms",
          "Windows x64 / macOS (Apple Silicon) / Linux x64"
        ],
        [
          "Installers",
          "Windows Setup 146 MB · macOS dmg 168 MB · AppImage 167 MB · deb 129 MB"
        ],
        [
          "License",
          "MIT"
        ]
      ],
      "changelog": [
        {
          "version": "0.9.1",
          "items": [
            "AppImage builds carry AppStream metadata: name, summary, categories, screenshots and license",
            "Linux app catalogs can read it, and the AppImage catalog test no longer warns about a missing appdata file"
          ]
        },
        {
          "version": "0.9.0",
          "items": [
            "New language setting: follow the system, Simplified Chinese or English, including main-process messages",
            "MCP tool names, descriptions and parameter docs are English, and so is the agent guide",
            "The website has English pages and the homepage follows your system language"
          ]
        },
        {
          "version": "0.8.6",
          "items": [
            "Graphical desktops gain a “Chinese keyboard” takeover, so your local IME can type Chinese into VNC",
            "New “Send text” writes a whole block to the remote clipboard and pastes it; both entries moved into the tab icon row"
          ]
        }
      ],
      "faqs": [
        {
          "q": "Where are passwords and key passphrases stored?",
          "a": "Electron safeStorage encrypts them through the system keychain, then they are written to local SQLite (on Windows, %APPDATA%\\TermPilot\\termpilot.db). Nothing is synced, and tool calls such as connection_list never return secrets."
        },
        {
          "q": "Can I go through a jump host?",
          "a": "Yes. Multi-hop ssh -J, ProxyCommand and importing from ~/.ssh/config all work. If the jump host only authorizes a single forwarding, set that connection’s file channel to reuse the terminal connection so SFTP never dials again."
        },
        {
          "q": "Can an agent operate VNC and RDP like a terminal?",
          "a": "Yes. Your agent can take desktop screenshots, click by image coordinates, type text and key chords, scroll, wait for the screen to settle and run batched actions; VNC and embedded RDP also share the text clipboard both ways. Each desktop connection keeps a single window."
        },
        {
          "q": "Do Telnet and serial support the exec channel and SFTP?",
          "a": "No. Those protocols are one byte stream with no channel concept. Calling term_exec or sftp_* returns a clear capability error, while the screen family (term_pty, term_write, screenshots) behaves the same across all three protocols."
        },
        {
          "q": "What if a serial connection drops?",
          "a": "Use term_reconnect (or reconnect in the UI) to bring back the same terminal: id, remark and the content already drawn are preserved. Run serial_list first to confirm the device path and parameters."
        },
        {
          "q": "Can the assistant see my password?",
          "a": "No. Secrets are decrypted briefly in the main process while dialing and no tool returns them. The MCP server binds 127.0.0.1 and every request must carry the token from your local mcp.json."
        },
        {
          "q": "Does it run on Intel Macs?",
          "a": "Official builds are Apple Silicon (arm64) dmg and zip only. Intel Macs can build from source: npm install, then npm run dist:mac."
        },
        {
          "q": "The installer says unsigned or unknown publisher. What now?",
          "a": "Builds are not code signed. On Windows choose “Run anyway” in SmartScreen; on macOS right-click Open in Finder. If that matters to you, build from source in three commands."
        },
        {
          "q": "Does TermPilot upload my data?",
          "a": "No telemetry, no analytics, no crash reporting. The only outbound request is reading the GitHub release page when you click “Check for updates” in settings, which you can verify in update-check.ts."
        }
      ],
      "oss": {
        "lead": "Repository: ",
        "tail": ". Pushing to main runs typecheck and build; pushing a tag builds installers for three platforms and publishes a release."
      },
      "links": {
        "changelogMore": "Full changelog",
        "changelogRepo": "CHANGELOG.md in the repo"
      },
      "final": {
        "win": "Windows",
        "mac": "macOS",
        "linux": "Linux",
        "all": "All downloads",
        "fine": "MIT licensed · Copyright © 2026 xy200303"
      }
    },
    "download": {
      "table": {
        "platform": "Platform",
        "installer": "Installer",
        "portable": "Portable",
        "windows": "Windows x64",
        "mac": "macOS (Apple Silicon)",
        "linux": "Linux x64"
      }
    }
  }
}
