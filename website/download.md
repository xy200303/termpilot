---
title: 下载
description: TermPilot 三端安装包下载：Windows x64、macOS（Apple Silicon）、Linux x64。MIT 开源，安装包未做代码签名。
---

<script setup>
import { VERSION } from './.vitepress/data/site'
</script>

# 下载

当前版本 **v{{ VERSION }}**。所有安装包发布在 [GitHub Releases](https://github.com/xy200303/termpilot/releases/latest)，版本说明见[更新日志](/changelog)。

<DownloadTable />

## 安装提示

安装包**未做代码签名**，系统会按未知发布者处理：

- **Windows**：SmartScreen 弹窗里点「更多信息 → 仍要运行」。
- **macOS**：第一次打开在访达里右键 →「打开」。官方只发布 Apple Silicon 包；Intel Mac 需要[从源码构建](#从源码运行)。
- **Linux**：AppImage 下载后 `chmod +x` 直接运行；deb 用 `sudo dpkg -i` 安装。

Windows 安装程序是 per-user 安装，默认不要求管理员权限；安装目录可以改。

## 数据与备份

所有数据都在本机，没有账号体系：

| 内容 | 位置（Windows） |
| --- | --- |
| 连接、终端布局、设置、凭据密文 | `%APPDATA%\TermPilot\termpilot.db` |
| Agent 连接令牌与注册信息 | `%APPDATA%\TermPilot\mcp.json` |
| 终端截图 | `%APPDATA%\TermPilot\screenshots\` |

macOS 对应 `~/Library/Application Support/TermPilot/`，Linux 对应 `~/.config/TermPilot/`。

备份就复制整个目录。注意 `termpilot.db` 里的口令密文由本机系统钥匙串加密，**换机器或换系统账号后口令需要重新输入**；主机、端口、跳板等连接参数不受影响。Windows 卸载程序默认保留数据目录（`deleteAppDataOnUninstall: false`）。

## 从源码运行

CI 使用 Node.js 22。先装依赖，再启动开发窗口：

```bash
git clone https://github.com/xy200303/termpilot.git
cd termpilot
npm install
npm run dev
```

打包当前平台：

```bash
npm run dist:win   # Windows
npm run dist:mac   # macOS（Apple Silicon）
npm run dist:linux # Linux x64
```

构建产物在 `release/`。源码、更新日志和贡献说明都在 [GitHub 仓库](https://github.com/xy200303/termpilot)。
