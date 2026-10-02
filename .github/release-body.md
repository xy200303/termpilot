- 新增多协议支持：除 SSH 外可建 Telnet 和串口连接。Telnet 用主机 / 端口（默认 23），自处理 IAC 协商（回绝多余选项，接 ECHO / Suppress-Go-Ahead / Terminal-Type），登录在终端里交互完成。串口用 serialport（原生模块，prebuilds 覆盖 Windows / macOS / Linux），路径 + 波特率（默认 115200），数据位 / 停止位 / 校验可配。两种协议只有一条终端字节流。
- 新增能力模型：连接带 `protocol` 和 `capabilities`（pty / exec / sftp / concurrent），`connection_list` 输出可见。对 Telnet / 串口连接调 `term_exec` 或 `sftp_*` 返回明确的能力说明（「该连接是串口协议，只有终端字节流，不支持 exec 通道」），不再瞎报 Not connected。`term_pty` / `term_write` / `term_read` / `term_lines` / 截图五族对三种协议行为一致。
- 新增 MCP 工具 `serial_list`：列出本机可用串口（路径、厂商、序号），建串口连接前探路。工具总数 24 → 25。
- 界面：新建 / 编辑连接可选协议，串口参数在表单里直接填；侧边栏按 正向 SSH / Telnet / 串口 / 反向监听 分组，图标区分；文件树对字节流协议显示「只有终端字节流，没有文件通道」。
- 修复 `connection_delete` 报「不是连接编号」的问题：删除时把内部编号误当 conn- 编号二次解析。
- 内部：本地终端 / SSH / Telnet / 串口 / 反向监听的终端通道统一抽象为 `TerminalChannel`。反向监听接受进来的 socket 收编进终端统一管理，MCP 的屏幕族工具（`term_pty` / `term_write` / `term_read` 等）对反向终端同样可用。
- 修复反弹 shell 画面阶梯状错位：裸管道没有 PTY 的 ONLCR（`\n` → `\r\n`）翻译，反向流进 xterm 前补上回车。

安装包没有代码签名。
