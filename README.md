<p align="center">
  <img src="resources/icon.svg" width="96" alt="TermPilot" />
</p>

<h1 align="center">TermPilot</h1>

<p align="center">给人用的 SSH 终端，Agent 也能操作同一套连接。</p>

<p align="center">
  <a href="#产品介绍">产品介绍</a>
  ·
  <a href="#交给-agent">交给 Agent</a>
  ·
  <a href="#功能">功能</a>
  ·
  <a href="#010">0.1.0</a>
  ·
  <a href="#快速开始">快速开始</a>
</p>

## 产品介绍

TermPilot 把 SSH 终端和 Agent 放在同一个窗口里。人在侧边栏里保存连接、打开终端、浏览远程文件。Agent 通过本机 MCP 使用这些连接，执行命令、传文件、截终端画面。两边看到的是同一批会话，不用各配一套主机和密码。

连接按机器分组。一台机器下面可以有多条账号。正向 SSH 支持密码或私钥，凭据用系统加密存在本机，不走 SSH Agent。没有公网地址的机器可以反向连回本机的 `127.0.0.1`，再由 cpolar 这类工具把端口暴露出去。

远程文件是一棵可展开的目录树，图标按类型区分。双击文本文件用编辑器打开，`Ctrl+S` 写回服务器。应用外观和终端配色分开设置。截图拍的是窗口里已经画出来的终端，可以截当前画面，也可以把滚动内容接成长图。

## 交给 Agent

先打开 TermPilot，并在设置里启用 MCP。然后把下面这句话发给 Claude Code、Kimi Code、Codex、Cursor 或 WorkBuddy：

```text
请安装 TermPilot 配套 skill：读取 https://raw.githubusercontent.com/xy200303/termpilot/main/skills/termpilot/SKILL.md 并安装到你的用户级 skills 目录，再读取本机 TermPilot 的 mcp.json（Windows 是 %APPDATA%\TermPilot\mcp.json），只把名为 termpilot 的 MCP 注册到你自己的配置里，其它服务器不要动；完成后用这个 skill 操作 TermPilot。
```

Agent 会自己装上 skill，并把自己的 MCP 配置写好。之后直接说要连哪台机器、跑什么命令即可。令牌写在本机的 `mcp.json`，不会出现在仓库里。

## 功能

- 正向 SSH，密码或私钥。凭据加密后只保存在本机。
- 反向监听只绑定 `127.0.0.1`。
- 本机终端和远程会话共用一排标签。
- 连接按主机分组，一台机器下可以有多条连接。
- 远程文件树。双击文本文件编辑，`Ctrl+S` 写回。
- 应用主题和终端主题分开配置。
- 终端截图可以拍当前画面、指定行，或把滚动内容接成长图。截完可以打开目录，或复制图片。
- 终端里右键可以复制、截图、粘贴。`Ctrl+C` 在有选区时复制，否则中断；`Ctrl+V` 粘贴。
- 内置 MCP，默认 `http://127.0.0.1:3927/mcp`。删除和危险命令会先在窗口里请人确认。
- 在会话或服务器上右键「复制为 Agent 提示词」，把这一条连接交给 Agent。已打开的终端会接着用。

## 0.1.0

第一个公开发布的版本。给人用的 SSH 终端，Agent 通过本机 MCP 操作同一套已经保存的连接。人和 Agent 看的是同一个窗口。

### 可以做什么

- 在侧边栏保存服务器和账号，打开远程 SSH 终端，也可以开本机终端。
- 密码和验证码由人在窗口里输入。Agent 接着同一块屏幕继续，不用再配一套主机和密码。
- 菜单和 TUI 可以上下左右选择、输入文字、回车确认，不只是执行命令。
- 按目录树浏览远程文件。双击文本文件编辑，`Ctrl+S` 写回服务器。
- 截当前画面、指定行，或把滚动内容接成长图。Agent 看到的是终端里已经画出来的内容。
- 在会话或服务器上右键「复制为 Agent 提示词」，发给 Agent。已经打开的终端会接着用。

### 安装包

| 平台 | 文件 |
| --- | --- |
| Windows x64 | `TermPilot.Setup.0.1.0.exe`、`TermPilot-0.1.0-win.zip` |
| macOS（Apple Silicon） | `TermPilot-0.1.0-arm64.dmg`、`TermPilot-0.1.0-arm64-mac.zip` |
| Linux x64 | `TermPilot-0.1.0.AppImage`、`termpilot_0.1.0_amd64.deb` |

下载页：[v0.1.0 Release](https://github.com/xy200303/termpilot/releases/tag/v0.1.0)。这些包没有代码签名。

## 快速开始

```bash
npm install
npm run dev
```

会话数据库在 `%APPDATA%\TermPilot\termpilot.db`。

```bash
npm run typecheck
npm run build
```

## 打包和发版

推送到 `main` 的改动会做类型检查和构建。打上和 `package.json` 里 `version` 一致的标签，例如 `v0.1.0`，会在 Windows、macOS、Linux 上各打一个安装包，并发到 GitHub Release。发布页的说明来自 [`.github/release-body.md`](.github/release-body.md)，发版前先改这份说明。也可以在 Actions 里手动运行 Release，产物留在那次运行的附件里。

| 平台 | 产物 |
| --- | --- |
| Windows x64 | 安装包和 zip |
| macOS（打包机的架构，GitHub 上是 Apple Silicon） | dmg 和 zip |
| Linux x64 | AppImage 和 deb |

本机只打当前系统：`npm run dist:win`、`npm run dist:mac` 或 `npm run dist:linux`。这些包没有代码签名。

## 许可

MIT
