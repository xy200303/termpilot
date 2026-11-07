---
title: 更新日志
description: TermPilot 最近三个版本的更新内容，与仓库 CHANGELOG.md 同步。
---

# 更新日志

这里只同步最近三个版本。完整历史见仓库 [CHANGELOG.md](https://github.com/xy200303/termpilot/blob/main/CHANGELOG.md)。安装包均未做代码签名。

## 0.8.0

- 新增 VNC / RDP 图形桌面：VNC 使用内嵌 noVNC，RDP 默认内嵌 IronRDP，也可切换 FreeRDP 原生窗口。
- 每个桌面连接只保留一个窗口；标签栏和侧边栏区分终端与桌面。
- MCP 新增 10 个桌面工具：截图网格、点击、按键、文字输入、滚动、等待、批量操作、AT-SPI 无障碍和性能指标，工具总数 37。
- VNC / 内嵌 RDP 支持双向文本剪贴板；VNC 支持标点、中文和 Emoji 输入。
- 新增自动 / 画质 / 平衡 / 流畅性能模式、后台降载、缩放防抖、桥接合包与背压。
- Agent 接入改为复制完整指引，由 Agent 安装 Skill 并注册 MCP。
- 修复窗口重绘后的桌面残留连接和启动白屏恢复。

## 0.7.8

- 侧边栏顶部改为品牌头；串口路径可以直接从下拉里选；连接右键可关闭全部窗口。
- MCP 新增 `app_screenshot` 和 `app_record`，工具总数 27。

## 0.7.7

- 修复使用 TermPilot 后本机 `ssh` 命令全部失效（`Bad owner or permissions on ~/.ssh/config`）的问题：写回配置时用临时文件替换，新文件继承目录 ACL、混进其他账号的修改权，OpenSSH 拒绝权限过宽的 config。现在 TermPilot 完全不再写 `~/.ssh/config`，也不再有启动时的自动导入——改为新建连接时在表单里手动「从 ssh_config 导入」，选中一个 `Host` 自动填好主机、端口、用户、私钥和跳板。
- 注意：升级前在旧版本里编辑或新建连接会再次触发写回、重新破坏权限，请尽快升级。

[下载最新版](/download){ .vp-button }
