- **不兼容**：`term_exec` 换了实现。现在是独立 exec 通道：stdout 和 stderr 分流返回原始字节流（不折行、无回显、无 ANSI），带协议级退出码，不占终端画面，可以并发，也不需要先开终端。参数从 `termId` 改为 `connection`。同名 `session` 之间承接 `cd` 和 `export`，`prelude` 可注入固定环境，`maxBytes` 控制返回上限。
- **不兼容**：原来的 `term_exec`（打进已打开终端）改名为 `term_pty`。交互式操作、TUI、配合截图用它。
- **不兼容**：时间相关字段统一为秒。`timeoutMs` 改名 `timeout`（秒），返回里的 `durationMs` 改名 `duration`（秒）。
- `term_write`、`term_read`、`term_lines`、截图工具的描述里注明仅作用于 PTY 终端。

安装包没有代码签名。
