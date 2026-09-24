<table>
<tr>
<td valign="top">

<img src="resources/icon.svg" width="64" alt="TermPilot" />

# TermPilot

**你的终端，助手可以接着用。**

登录远程电脑用的窗口。账号存在本机，你在这里登上去，助手继续操作这个还没断开的会话。

<a href="https://github.com/xy200303/termpilot/releases/latest"><img alt="release" src="https://img.shields.io/github/v/release/xy200303/termpilot?style=flat-square"></a>
<img alt="Windows" src="https://img.shields.io/badge/-Windows-blue?style=flat-square&logo=windows&logoColor=white">
<img alt="macOS" src="https://img.shields.io/badge/-macOS-black?style=flat-square&logo=apple&logoColor=white">
<img alt="Linux" src="https://img.shields.io/badge/-Linux-yellow?style=flat-square&logo=linux&logoColor=white">
<a href="#许可"><img alt="license" src="https://img.shields.io/badge/license-MIT-green?style=flat-square"></a>

</td>
<td width="28%" align="right" valign="middle">

<a href="https://github.com/xy200303/termpilot/releases/latest"><b>下载</b></a>

Windows · macOS · Linux

</td>
</tr>
</table>

## 从登录到下一条命令

对比的是同一次操作会停在哪，不是功能清单。

| | 登录 | 跑到一半要输入 | 接着做下一件 |
| --- | --- | --- | --- |
| 你自己的远程终端 | 你在软件里输入密码 | 菜单、安装向导、sudo 密码都只有你能碰 | 会话还在，助手进不了这个窗口 |
| 助手自己去连 | 它要拿到密码或私钥 | 这次调用结束，提示已经不在了 | 经常重新连接，目录和正在跑的程序对不上 |
| TermPilot | 你在窗口里登录，口令留在本机 | 助手的下一次按键打进当前画面，你看得到 | 还是这个终端，不用再连一次 |

要删除或执行危险命令时，TermPilot 会先停住，等你在窗口里点允许。

## 交给助手

先打开 TermPilot，在设置里允许助手连接。然后把下面这段话发给 Claude Code、Kimi Code、Codex、Cursor、WorkBuddy 或 CodeBuddy：

```text
请安装 TermPilot 配套 skill：读取 https://raw.githubusercontent.com/xy200303/termpilot/main/skills/termpilot/SKILL.md 并安装到你的用户级 skills 目录，再读取本机 TermPilot 的 mcp.json（Windows 是 %APPDATA%\TermPilot\mcp.json），只把名为 termpilot 的 MCP 注册到你自己的配置里，其它服务器不要动；完成后用这个 skill 操作 TermPilot。
```

助手会自己装好用法说明，并接上 TermPilot。之后直接说连哪台机器、做什么就行。连接用的口令写在你电脑上的 `mcp.json`，不会放进代码仓库。

助手如果接不上，也可以直接运行 TermPilot 放好的命令，不必再要一遍口令。Windows 是 `%APPDATA%\TermPilot\bin\termpilot.cmd`。用 `tools` 看有哪些，`schema` 看参数，`call` 来执行。先看文字，需要看画面时再截图。已经打开的终端会接着用，不会再新开一个。

## 功能

- 用密码或私钥登录。一台机器可以存多个账号，按机器分组。没有公网地址的机器可以主动连回你的电脑，而且只接受本机连入。
- 本机终端和远程终端排在同一行标签里。右键可以复制、截图、粘贴。有选中文字时 `Ctrl+C` 是复制，没选中时是中断当前命令；`Ctrl+V` 粘贴。
- 远程文件按文件夹展开。双击文本就能改，`Ctrl+S` 写回服务器。
- 可以截当前这一屏、指定的几行，或把滚过的内容接成一张长图。截的是窗口里已经显示出来的内容。
- 在某条连接或某台服务器上右键「复制为 Agent 提示词」，把这一条发给助手。
- 窗口颜色和终端颜色分开设置。

## 下载

最新版在 [Releases](https://github.com/xy200303/termpilot/releases/latest)。当前是 [v0.1.0](https://github.com/xy200303/termpilot/releases/tag/v0.1.0)，安装包没有代码签名。

| 平台 | 文件 |
| --- | --- |
| Windows x64 | `TermPilot.Setup.0.1.0.exe`、`TermPilot-0.1.0-win.zip` |
| macOS（Apple Silicon） | `TermPilot-0.1.0-arm64.dmg`、`TermPilot-0.1.0-arm64-mac.zip` |
| Linux x64 | `TermPilot-0.1.0.AppImage`、`termpilot_0.1.0_amd64.deb` |

## 从源码运行

```bash
npm install
npm run dev
```

会话数据库在 `%APPDATA%\TermPilot\termpilot.db`。

```bash
npm run typecheck
npm run build
```

推送到 `main` 会做类型检查和构建。打上和 `package.json` 里 `version` 一致的标签，例如 `v0.1.0`，会在 Windows、macOS、Linux 上各打一个安装包，并发到 GitHub Release。发布说明来自 [`.github/release-body.md`](.github/release-body.md)。本机只打当前系统：`npm run dist:win`、`npm run dist:mac` 或 `npm run dist:linux`。

## 许可

MIT
