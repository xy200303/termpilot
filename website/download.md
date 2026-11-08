---
title: 下载
description: TermPilot 三端安装包下载：Windows x64、macOS（Apple Silicon）、Linux x64。MIT 开源，安装包未做代码签名。
---

# 下载

当前版本 **v0.8.5**。所有安装包发布在 [GitHub Releases](https://github.com/xy200303/termpilot/releases/latest)，版本说明见[更新日志](/changelog)。

Linux x64 包在 Ubuntu 22.04 上构建，要求 `glibc >= 2.35`，适用于 Ubuntu 22.04 / 24.04。

| 平台 | 安装包 | 免安装 |
| --- | --- | --- |
| Windows x64 | [TermPilot.Setup.0.8.5.exe](https://github.com/xy200303/termpilot/releases/latest/download/TermPilot.Setup.0.8.5.exe) | [TermPilot-0.8.5-win.zip](https://github.com/xy200303/termpilot/releases/latest/download/TermPilot-0.8.5-win.zip) |
| macOS（Apple Silicon） | [TermPilot-0.8.5-arm64.dmg](https://github.com/xy200303/termpilot/releases/latest/download/TermPilot-0.8.5-arm64.dmg) | [TermPilot-0.8.5-arm64-mac.zip](https://github.com/xy200303/termpilot/releases/latest/download/TermPilot-0.8.5-arm64-mac.zip) |
| Linux x64 | [termpilot_0.8.5_amd64.deb](https://github.com/xy200303/termpilot/releases/latest/download/termpilot_0.8.5_amd64.deb) | [TermPilot-0.8.5.AppImage](https://github.com/xy200303/termpilot/releases/latest/download/TermPilot-0.8.5.AppImage) |

## 安装提示

安装包**未做代码签名**，系统会按未知发布者处理：

- **Windows**：SmartScreen 弹窗里点「更多信息 → 仍要运行」。
- **macOS**：第一次打开在访达里右键 →「打开」。只发布 Apple Silicon 包，Intel Mac 请[从源码构建](/guide/quickstart#从源码运行)。
- **Linux**：AppImage 下载后 `chmod +x` 直接运行；deb 用 `sudo dpkg -i` 安装。

## 数据与备份

所有数据都在本机，没有账号体系：

| 内容 | 位置（Windows） |
| --- | --- |
| 连接、终端布局、设置 | `%APPDATA%\TermPilot\termpilot.db`（SQLite，口令字段已用系统钥匙串加密） |
| Agent 连接令牌 | `%APPDATA%\TermPilot\mcp.json` |

macOS 对应 `~/Library/Application Support/TermPilot/`，Linux 对应 `~/.config/TermPilot/`。

备份就复制整个目录。注意 `termpilot.db` 里的口令密文用本机钥匙串加密，**换机器后口令需要重新输入**，连接参数（主机、端口、跳板）不受影响。Linux 上没有系统钥匙串时（例如最小化桌面），口令改用同目录 `local-secrets.key` 的本机密钥加密，连同这个文件一起备份才能解开。

## 从源码运行

```bash
git clone https://github.com/xy200303/termpilot.git
cd termpilot
npm install && npm run dev
```

打包当前平台的安装包：`npm run dist:win` / `dist:mac` / `dist:linux`。
