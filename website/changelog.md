---
title: 更新日志
description: TermPilot 最近三个版本的更新内容，与仓库 CHANGELOG.md 同步。
---

<script setup>
import { VERSION } from './.vitepress/data/site'
</script>

# 更新日志

当前版本 **v{{ VERSION }}**。这里只同步最近三个版本，完整历史见仓库 [CHANGELOG.md](https://github.com/xy200303/termpilot/blob/main/CHANGELOG.md)。安装包均未做代码签名。

## 0.7.7

- 不再写回 `~/.ssh/config`，修复使用 TermPilot 后本机 `ssh` 命令报 `Bad owner or permissions on ~/.ssh/config` 的问题。
- 启动时不再自动导入；新建连接时在表单里手动「从 ssh_config 导入」，选中一个 `Host` 自动填好主机、端口、用户、私钥和跳板。
- 注意：旧版本里编辑或新建连接仍可能再次写回并破坏权限，请尽快升级。

## 0.7.6

- 每条连接新增「文件通道」设置（编辑连接 → 高级）：自动（默认）、复用终端连接、总是单独拨号。
- 跳板只授权一次转发的堡垒机改成「复用终端连接」后，SFTP 走终端那条已授权的连接，不再拨第二次。
- MCP 同步支持：`connection_create` / `connection_update` 新增 `sftpMode` 参数，`connection_list` 输出带上。

## 0.7.5

- 修复 `term_pty` 在本机 Windows 终端发命令不执行的问题：行尾从 LF 改为 CR，PowerShell（PSReadLine）不再把它当成续行。
- 修复用中文输入法在 TUI 里打字时终端内容左移、左边一截被裁的问题：根节点和终端容器改用 `overflow: clip`。

[下载最新版](/download){ .vp-button }
