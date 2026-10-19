---
title: 更新日志
description: TermPilot 最近三个版本的更新内容，与仓库 CHANGELOG.md 同步。
---

# 更新日志

这里只同步最近三个版本。完整历史见仓库 [CHANGELOG.md](https://github.com/xy200303/termpilot/blob/main/CHANGELOG.md)。安装包均未做代码签名。

## 0.7.8

- 侧边栏顶部改为品牌头：应用图标、TermPilot 字标和协议副标题，收纳按钮移到右侧。
- 新建 / 编辑串口连接时自动扫描本机串口，串口路径可以直接从下拉里选；没检测到设备时可切「手动输入」。
- 连接的右键菜单新增「关闭全部窗口」，一次关掉这条连接下挂着的所有终端。
- MCP 新增 `app_screenshot`：截取整个应用窗口（侧边栏、标签栏、终端一起），保存 PNG 并返回路径，图片同时附在结果里。
- MCP 新增 `app_record`：录制应用窗口画面为 WebM，`action=start` / `stop`，`fps` 默认 15，`maxSeconds` 默认 120（最长 600），到点自动停止并保存。工具总数 25 → 27。

## 0.7.7

- 修复使用 TermPilot 后本机 `ssh` 命令全部失效（`Bad owner or permissions on ~/.ssh/config`）的问题：写回配置时用临时文件替换，新文件继承目录 ACL、混进其他账号的修改权，OpenSSH 拒绝权限过宽的 config。现在 TermPilot 完全不再写 `~/.ssh/config`，也不再有启动时的自动导入——改为新建连接时在表单里手动「从 ssh_config 导入」，选中一个 `Host` 自动填好主机、端口、用户、私钥和跳板。
- 注意：升级前在旧版本里编辑或新建连接会再次触发写回、重新破坏权限，请尽快升级。

## 0.7.6

- 每条连接新增「文件通道」设置（编辑连接 → 高级）：自动（默认，目标机缺 SFTP 子系统时自动改 internal-sftp 再单独拨号）、复用终端连接、总是单独拨号。跳板只授权一次转发的堡垒机（单独拨号会被 platform authorization denied 拒绝）改成「复用终端连接」后，SFTP 走终端那条已授权的连接，不再拨第二次。
- 复用模式下目标机没有 SFTP 子系统时报错会明确说明原因和恢复办法，不会静默失败或去改 sshd；自动模式下单独拨号被跳板拒绝时，错误信息会给出改成复用的指引。
- MCP 同步支持：`connection_create` / `connection_update` 新增 `sftpMode` 参数（auto / shared / fresh），`connection_list` 输出带 `sftpMode`。

[下载最新版](/download){ .vp-button }
