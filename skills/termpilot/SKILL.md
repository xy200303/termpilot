---
name: termpilot
description: >-
  通过 TermPilot 操作同一套 SSH 连接、终端、远程文件和截图。用户要求安装 TermPilot、
  注册 MCP、连接服务器、执行命令、上传或修改远程文件、接管会话或做人机协同时使用。
---

# TermPilot

TermPilot 是本机的 SSH 终端。人和 Agent 使用同一套已保存的连接。密码和私钥口令只留在 TermPilot 里，不要向用户索取，也不要写进回复。

## 安装

用户把 README 里的那句话发给你时，按下面做完，不要改其它 MCP 服务器。

1. 把本文件安装到你自己的用户级 skills 目录，目录名用 `termpilot`：
   - Claude Code：`~/.claude/skills/termpilot/SKILL.md`
   - Codex：`~/.codex/skills/termpilot/SKILL.md`
   - Kimi Code：`~/.kimi-code/skills/termpilot/SKILL.md`
   - Cursor：`~/.cursor/skills/termpilot/SKILL.md`
   - WorkBuddy：`~/.workbuddy/skills/termpilot/SKILL.md`
2. 读取本机 TermPilot 写下的端点文件。Windows 是 `%APPDATA%\TermPilot\mcp.json`，macOS 是 `~/Library/Application Support/TermPilot/mcp.json`，Linux 是 `~/.config/TermPilot/mcp.json`。
3. 文件不存在时，请用户先打开一次 TermPilot。没有 `enabled: true` 时，请用户在 TermPilot 设置里启用 MCP 后再注册。
4. 只把名为 `termpilot` 的这一条写进你自己的 MCP 配置。`Authorization` 的值是 `Bearer ` 加上文件里的 `token`。不要在回复、日志或仓库里打印令牌。
   - Claude Code 的 `~/.claude.json`：`mcpServers.termpilot` 为 `{ "type": "http", "url", "headers": { "Authorization" } }`
   - Codex 的 `~/.codex/config.toml`：`[mcp_servers.termpilot]`，字段是 `url` 和 `http_headers`
   - Kimi Code 的 `~/.kimi-code/mcp.json`：`mcpServers.termpilot` 为 `{ "url", "headers": { "Authorization" } }`
   - Cursor 的 `~/.cursor/mcp.json`：同样写入 `mcpServers.termpilot`
   - WorkBuddy 的 `~/.workbuddy/mcp.json`：`mcpServers.termpilot` 为 `{ "transport": "streamable-http", "url", "headers": { "Authorization" } }`
5. 注册后重新加载 MCP，再用下面的工具操作。不要另建 SSH 客户端，也不要使用 SSH Agent。

## 操作

先 `session_list` 确认连接。用名称连接，例如 `session_connect` 的 `session` 填用户说的那一台。`term_exec` 的命令末尾带换行。改远程文件前先确认目录；用户没有明确要求删除时，不要 `sftp_remove`，也不要在命令里使用 `rm`。危险操作会在 TermPilot 窗口里等用户点允许。

可用工具：`session_list`、`session_connect`、`session_disconnect`、`session_create`、`session_update`、`session_delete`、`term_list`、`term_exec`、`term_write`、`term_read`、`term_close`、`local_term_open`、`sftp_list`、`sftp_mkdir`、`sftp_upload`、`sftp_download`、`sftp_rename`、`sftp_remove`、`term_lines`、`term_screenshot`、`term_screenshot_scrollback`。

要截指定行时，先 `term_lines` 看行号（不填范围就是当前画面），再把 `startLine` 和 `endLine` 传给 `term_screenshot`。两端都包含，返回的是这一段已经裁好的一张图，不要自己按像素裁。整段历史才用 `term_screenshot_scrollback`。

## 人机协同

用户给的提示词里如果有会话名或 `termId`，接管的是 TermPilot 里已经存在的那一个终端。你和用户看的是同一个画面。

- 提示词里已经有 `termId` 时直接用它，不要再 `session_connect`。没有时才按会话名连接。
- 密码、私钥口令、验证码只由用户在 TermPilot 窗口里输入。看到这类提示就停下来说明，等用户说操作完了，再 `term_lines` 继续。不要索取，也不要代填。
- 菜单、安装向导、编辑器和其它 TUI：用 `term_write`。上下选择用 `keys: ["up"]` 或 `["down"]`，左右用 `left` / `right`，输入内容用 `text`，确认用 `submit: true`。一次可以组合，例如先 `keys: ["down", "down"]`，看返回的画面，再 `text` 加 `submit`。方向键会按程序当前的光标模式发出。不要自己拼转义序列。
- `term_exec` 只用于已经回到 shell 提示符的普通命令。交互程序还在跑时不要用它。

新建或修改测试用的连接可以删掉。服务器上的已有文件不要删。需要试文件时，单独建一个测试目录。
