---
title: 更新日志
description: TermPilot 最近三个版本的更新内容，与仓库 CHANGELOG.md 同步。
---

# 更新日志

这里只同步最近三个版本。完整历史见仓库 [CHANGELOG.md](https://github.com/xy200303/termpilot/blob/main/CHANGELOG.md)。安装包均未做代码签名。

## 0.7.7

- 修复使用 TermPilot 后本机 `ssh` 命令全部失效（`Bad owner or permissions on ~/.ssh/config`）的问题：写回配置时用临时文件替换，新文件继承目录 ACL、混进其他账号的修改权，OpenSSH 拒绝权限过宽的 config。现在 TermPilot 完全不再写 `~/.ssh/config`，也不再有启动时的自动导入——改为新建连接时在表单里手动「从 ssh_config 导入」，选中一个 `Host` 自动填好主机、端口、用户、私钥和跳板。
- 注意：升级前在旧版本里编辑或新建连接会再次触发写回、重新破坏权限，请尽快升级。

## 0.7.6

- 每条连接新增「文件通道」设置（编辑连接 → 高级）：自动（默认，目标机缺 SFTP 子系统时自动改 internal-sftp 再单独拨号）、复用终端连接、总是单独拨号。跳板只授权一次转发的堡垒机（单独拨号会被 platform authorization denied 拒绝）改成「复用终端连接」后，SFTP 走终端那条已授权的连接，不再拨第二次。
- 复用模式下目标机没有 SFTP 子系统时报错会明确说明原因和恢复办法，不会静默失败或去改 sshd；自动模式下单独拨号被跳板拒绝时，错误信息会给出改成复用的指引。
- MCP 同步支持：`connection_create` / `connection_update` 新增 `sftpMode` 参数（auto / shared / fresh），`connection_list` 输出带 `sftpMode`。

## 0.7.5

- 修复 agent 用 `term_pty` 在本机 Windows 终端发命令不执行的问题：命令行尾补的是 LF，PowerShell（PSReadLine）把它当 Shift+Enter 续行，命令全堆在 `>>` 续行提示符里，要人工按一次真回车才全部涌出。现在行尾改用 CR（真终端回车发的就是 CR，SSH / Telnet / 串口也都认 CR）。
- 修复用中文输入法在 TUI（如 Kimi Code）里打字时整个终端内容左移、左边一截被裁掉的问题：IME 组字时浏览器会对光标处的隐藏输入框做 scrollIntoView，而 `overflow: hidden` 的容器仍可被程序滚动，页面被向左推且没有滚动条可回退。根节点和终端容器改为 `overflow: clip`，从机制上杜绝这个推移。

[下载最新版](/download){ .vp-button }
