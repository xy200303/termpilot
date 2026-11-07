---
title: 更新日志
description: TermPilot 最近三个版本的更新内容，与仓库 CHANGELOG.md 同步。
---

# 更新日志

这里只同步最近三个版本。完整历史见仓库 [CHANGELOG.md](https://github.com/xy200303/termpilot/blob/main/CHANGELOG.md)。安装包均未做代码签名。

## 0.8.2

- `desktop_screenshot` 默认叠加 100px 坐标网格，Agent 不传参数也能直接按刻度算点击坐标；需要干净画面时传 `grid=false` 关闭，也可传 20–500 自定义间距。

## 0.8.1

- 修复 Ubuntu 22.04 上 Linux 包因原生模块要求 GLIBC 2.42 而无法启动。Linux 构建固定到 Ubuntu 22.04，并自动检查 GLIBC 不超过 2.35。
- 修复没有系统钥匙串的 Linux 桌面无法保存凭据的问题，改用权限 0600 的本机 AES-256-GCM 密钥文件降级。
- CI 固定 Ubuntu 22.04 构建环境。

## 0.8.0

- 新增 VNC / RDP 图形桌面：VNC 使用内嵌 noVNC，RDP 默认内嵌 IronRDP，也可切换 FreeRDP 原生窗口。
- 每个桌面连接只保留一个窗口；标签栏和侧边栏区分终端与桌面。
- MCP 新增 10 个桌面工具：截图网格、点击、按键、文字输入、滚动、等待、批量操作、AT-SPI 无障碍和性能指标，工具总数 37。
- VNC / 内嵌 RDP 支持双向文本剪贴板；VNC 支持标点、中文和 Emoji 输入。
- 新增自动 / 画质 / 平衡 / 流畅性能模式、后台降载、缩放防抖、桥接合包与背压。
- Agent 接入改为复制完整指引，由 Agent 安装 Skill 并注册 MCP。
- 修复窗口重绘后的桌面残留连接和启动白屏恢复。

[下载最新版](/download){ .vp-button }
