<p align="center">
  <img src="resources/icon.svg" width="96" alt="TermPilot" />
</p>

<h1 align="center">TermPilot</h1>

<p align="center">连远程电脑的终端。你来操作，助手也能接着用。</p>

<p align="center">
  <a href="#产品介绍">产品介绍</a>
  ·
  <a href="#交给助手">交给助手</a>
  ·
  <a href="#功能">功能</a>
  ·
  <a href="#010">0.1.0</a>
  ·
  <a href="#快速开始">快速开始</a>
</p>

## 产品介绍

TermPilot 用来登录远程电脑，在一个窗口里敲命令、看结果、翻文件。

你先把服务器和账号存在左边。助手用的就是这些已经保存好的连接，不用再向你要一遍密码。密码和私钥口令只留在你自己的电脑上。需要输入密码或验证码时，你在窗口里敲，助手再接着往下做。你们看的是同一块屏幕。

一台机器可以存多个账号。机器没有公网地址时，可以让它主动连回你的电脑。

远程文件按文件夹一层层展开，图标能看出文件类型。双击文本就能改，`Ctrl+S` 保存回服务器。窗口颜色和终端颜色可以分开调。截图截的是窗口里已经显示出来的内容：可以截当前这一屏，也可以把往上滚过的内容拼成一张长图。

## 交给助手

先打开 TermPilot，在设置里允许助手连接。然后把下面这段话发给 Claude Code、Kimi Code、Codex、Cursor 或 WorkBuddy：

```text
请安装 TermPilot 配套 skill：读取 https://raw.githubusercontent.com/xy200303/termpilot/main/skills/termpilot/SKILL.md 并安装到你的用户级 skills 目录，再读取本机 TermPilot 的 mcp.json（Windows 是 %APPDATA%\TermPilot\mcp.json），只把名为 termpilot 的 MCP 注册到你自己的配置里，其它服务器不要动；完成后用这个 skill 操作 TermPilot。
```

助手会自己装好用法说明，并接上 TermPilot。之后直接说连哪台机器、做什么就行。连接用的口令写在你电脑上的 `mcp.json`，不会放进代码仓库。

## 功能

- 用密码或私钥登录远程电脑。密码加密后只保存在本机。
- 没有公网地址的机器可以主动连回你的电脑，而且只接受本机连入。
- 本机终端和远程终端排在同一行标签里。
- 连接按机器分组，一台机器下可以有多个账号。
- 远程文件按文件夹展开。双击文本文件编辑，`Ctrl+S` 写回。
- 窗口主题和终端颜色分开设置。
- 可以截当前这一屏、指定的几行，或把滚过的内容接成长图。截完可以打开所在文件夹，或复制图片。
- 终端里右键可以复制、截图、粘贴。有选中文字时 `Ctrl+C` 是复制，没选中时是中断当前命令；`Ctrl+V` 粘贴。
- 助手通过本机接口操作 TermPilot，地址是 `http://127.0.0.1:3927/mcp`。删除文件和危险命令会先在窗口里请你点允许。
- 在某条连接或某台服务器上右键「复制为 Agent 提示词」，把这一条发给助手。已经打开的终端会接着用，不会再新开一个。

## 0.1.0

第一个公开版本。用来登录远程电脑：你来用，助手也能接着用你已经保存的连接。你们看的是同一个窗口。

### 可以做什么

- 把服务器和账号存在左边，打开远程终端，也可以开一个本机终端。
- 密码和验证码由你在窗口里输入。助手接着同一块屏幕继续，不用再配一套主机和密码。
- 遇到菜单，或需要上下左右选择的界面，助手可以选、可以打字、可以回车，不只是执行一条命令。
- 按文件夹浏览远程文件。双击文本就能改，`Ctrl+S` 保存回服务器。
- 截当前这一屏、指定的几行，或把滚过的内容接成一张长图。助手看到的是屏幕上实际显示的内容。
- 在某条连接或某台服务器上右键，复制一段话发给助手。已经打开的终端会接着用。

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
