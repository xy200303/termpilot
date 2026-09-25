---
name: termpilot
description: >-
  通过 TermPilot 操作同一套 SSH 连接、终端、远程文件和截图。用户要求安装 TermPilot、
  注册 MCP、连接服务器、执行命令、上传或修改远程文件、接管会话或做人机协同时使用。
---

# TermPilot

TermPilot 是本机 SSH 终端。用户与 Agent 使用同一套已保存连接。密码和私钥口令只保存在 TermPilot 中。不要向用户索取，也不要写入回复。

## 安装

用户把 README 里的那句话发给你时，按下面做完，不要改其它 MCP 服务器。

1. 把本文件安装到你自己的用户级 skills 目录，目录名用 `termpilot`：
   - Claude Code：`~/.claude/skills/termpilot/SKILL.md`
   - Codex：`~/.codex/skills/termpilot/SKILL.md`
   - Kimi Code：`~/.kimi-code/skills/termpilot/SKILL.md`
   - Cursor：`~/.cursor/skills/termpilot/SKILL.md`
   - WorkBuddy：`~/.workbuddy/skills/termpilot/SKILL.md`
   - CodeBuddy：`~/.codebuddy/skills/termpilot/SKILL.md`
2. 读取本机 TermPilot 写下的端点文件。Windows 是 `%APPDATA%\TermPilot\mcp.json`，macOS 是 `~/Library/Application Support/TermPilot/mcp.json`，Linux 是 `~/.config/TermPilot/mcp.json`。
3. 文件不存在时，请用户先打开一次 TermPilot。没有 `enabled: true` 时，请用户在 TermPilot 设置里启用 MCP 后再注册。
4. 只把名为 `termpilot` 的这一条写进下面这份用户级配置。桌面版和命令行不一定读同一个文件，写错位置会在重启后消失。`Authorization` 的值是 `Bearer ` 加上文件里的 `token`。不要在回复、日志或仓库里打印令牌。不要写入 `connectors` 目录，那个文件由程序自己重写。
   - Claude Code 只认 `~/.claude.json` 里的 `mcpServers`，不认 `~/.claude/settings.json`。`termpilot` 为 `{ "type": "http", "url", "headers": { "Authorization" } }`。
   - Codex 的桌面版和命令行共用 `~/.codex/config.toml`。节名是 `[mcp_servers.termpilot]`，字段是 `url` 和 `http_headers`。
   - Kimi Code 的桌面版和命令行共用 `~/.kimi-code/mcp.json`（环境变量 `KIMI_CODE_HOME` 有值时用那个目录）。条目为 `{ "transport": "http", "url", "headers": { "Authorization" } }`。旧的 `~/.kimi` 不是这份配置。项目根目录的 `.mcp.json` 和当前目录的 `.kimi-code/mcp.json` 是另外两份，用户级注册不要写到那里。
   - Cursor 的全局配置是 `~/.cursor/mcp.json`。项目里的 `.cursor/mcp.json` 是另一份。`termpilot` 为 `{ "url", "headers": { "Authorization" } }`。
   - WorkBuddy 桌面版读 `~/.workbuddy/mcp.json`。条目为 `{ "transport": "streamable-http", "url", "headers": { "Authorization" } }`。
   - CodeBuddy 编辑器读 `~/.codebuddy/mcp.json`，不读 `~/.codebuddy/.mcp.json`。条目为 `{ "type": "http", "url", "headers": { "Authorization" } }`。
5. 注册后重新打开对应程序。TermPilot 本身也要开着，关掉之后这些连接都会失败。不要另建 SSH 客户端，也不要使用 SSH Agent。

## 命令行

MCP 工具没有出现、注册失败或调用报错时，改用 TermPilot 放在本机的命令 `termpilot`。它和 MCP 操作同一个窗口，不需要用户把令牌贴给你。命令自己读端点文件里的 `cli` 字段。窗口没开时，这条命令会先启动 TermPilot。

```text
termpilot tools
termpilot schema term_exec
termpilot call term_list
termpilot call term_exec --json-file args.json --json
```

`tools` 列出工具，`schema` 看参数，`call` 用 JSON 调用。这三者和窗口里的 MCP 是同一份定义。

参数可以直接写在命令后面。很长的 JSON 可以写进文件，用 `call <工具名> --json-file <路径>`；或从标准输入传，用 `--json-stdin`。加上 `--json` 时，输出是一行 `{"ok":true,"text":"..."}`，中文用 `\u` 转义。参数不是对象时，报错会带上实际收到的前 200 个字符。

优先读取文本：`term_lines` 比截图快。截图返回本机图片路径，需要查看画面时再读取该文件。已有 `termId` 时继续使用该终端。

## 操作

查找只使用编号。`conn-` 是连接，`term-` 是终端。名称和备注只用于识别，不能作为参数。确认用途后写入备注：连接使用 `connection_update` 的 `remark`，终端使用 `term_update`。

先调用 `connection_list` 或 `term_list`。列表包含编号、名称、备注和 `status`。`connection_open`、`connection_close`、`connection_update`、`connection_delete` 以及 `sftp_*` 的 `connection` 填写 `conn-` 编号。`term_exec`、`term_write`、`term_read`、`term_reconnect`、`term_close`、`term_lines` 和截图的 `termId` 填写 `term-` 编号。

终端在关闭前保持存在。应用重启后，同一编号、备注和上次输出仍在。`status` 不是 `connected` 时，用 `term_reconnect` 恢复这一扇，不要再 `connection_open`。先用 `term_read` 查看已有记录。没有这扇终端时，才用 `connection_open` 新开。`term_exec` 的命令以换行结束。修改远程文件前先确认目录。用户未明确要求删除时，不调用 `sftp_remove`，也不在命令中使用 `rm`。危险操作在 TermPilot 窗口中等待用户确认。

可用工具：`connection_list`、`connection_open`、`connection_close`、`connection_create`、`connection_update`、`connection_delete`、`term_list`、`term_exec`、`term_write`、`term_read`、`term_reconnect`、`term_close`、`term_update`、`term_open_local`、`sftp_list`、`sftp_mkdir`、`sftp_upload`、`sftp_download`、`sftp_rename`、`sftp_remove`、`term_lines`、`term_screenshot`、`term_screenshot_scrollback`。

要截指定行时，先 `term_lines` 看行号（不填范围就是当前画面），再把 `startLine` 和 `endLine` 传给 `term_screenshot`。两端都包含，返回的是这一段已经裁好的一张图，不要自己按像素裁。整段历史才用 `term_screenshot_scrollback`。

人和你看的是同一个终端。密码和验证码由用户在窗口里输入。菜单和 TUI 用 `term_write`：`keys` 取 `up`、`down`、`left`、`right`，文字放 `text`，回车用 `submit: true`。已经回到 shell 提示符时再用 `term_exec`。

新建或修改测试用的连接可以删掉。服务器上的已有文件不要删。需要试文件时，单独建一个测试目录。
