<table>
<tr>
<td valign="top">

<img src="resources/icon.svg" width="64" alt="TermPilot" />

# TermPilot

**你的终端，助手可以接着用。**

本机 SSH 终端。凭据保存在本机。用户在窗口中登录后，Agent 继续操作同一条未断开的会话。

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

## 会话模型

下表比较同一次操作的中断点，不是功能清单。

| | 登录 | 中途需要输入 | 继续下一步 |
| --- | --- | --- | --- |
| 独立远程终端 | 用户在软件中输入密码 | 菜单、安装向导和 sudo 密码只由用户操作 | 会话仍在，Agent 不能进入该窗口 |
| Agent 自行连接 | Agent 需要获得密码或私钥 | 本次调用结束后，提示符不再保留 | 经常重新连接，工作目录和正在运行的程序不一致 |
| TermPilot | 用户在窗口中登录，口令留在本机 | Agent 的后续按键进入当前画面，用户可见 | 仍是同一终端，无需再次连接 |

删除或执行危险命令前，TermPilot 会暂停，并在窗口中等待用户确认。

## 交给 Agent

先打开 TermPilot，在设置中启用 Agent 连接。然后将下面这段话发给 Claude Code、Kimi Code、Codex、Cursor、WorkBuddy 或 CodeBuddy：

```text
请安装 TermPilot 配套 skill：读取 https://raw.githubusercontent.com/xy200303/termpilot/main/skills/termpilot/SKILL.md 并安装到你的用户级 skills 目录，再读取本机 TermPilot 的 mcp.json（Windows 是 %APPDATA%\TermPilot\mcp.json），只把名为 termpilot 的 MCP 注册到你自己的配置里，其它服务器不要动；完成后用这个 skill 操作 TermPilot。
```

Agent 会安装使用说明并注册 TermPilot。之后直接说明目标主机和操作。连接口令写在本机 `mcp.json` 中，不进入代码仓库。

MCP 不可用时，可运行本机命令 `termpilot`。窗口未打开时，该命令会先启动 TermPilot。`tools` 列出工具，`schema` 查看参数，`call` 执行调用。优先读取文本；需要查看画面时再截图。已打开的终端继续使用，不为同一操作再打开一个。

## 功能

- 支持密码或私钥登录。同一主机可保存多个账号，并按主机分组。无公网地址的主机可连回本机，且只接受本机连入。
- 本机终端与远程终端使用同一行标签。右键可复制、截图和粘贴。有选中文本时 `Ctrl+C` 为复制，无选中时为中断；`Ctrl+V` 为粘贴。
- 远程文件按目录展开。双击文本文件进行编辑，`Ctrl+S` 写回服务器。
- 可截取当前画面、指定行，或将滚动内容合成为长图。截图内容为窗口中已经显示的画面。
- 在连接或终端上右键「复制为 Agent 提示词」，将该条事实发给 Agent。
- 窗口配色与终端配色分开设置。

## 下载

最新安装包见 [Releases](https://github.com/xy200303/termpilot/releases/latest)。安装包未做代码签名。版本说明见 [更新日志](CHANGELOG.md)。

| 平台 | 文件 |
| --- | --- |
| Windows x64 | `TermPilot.Setup.<version>.exe`、`TermPilot-<version>-win.zip` |
| macOS（Apple Silicon） | `TermPilot-<version>-arm64.dmg`、`TermPilot-<version>-arm64-mac.zip` |
| Linux x64 | `TermPilot-<version>.AppImage`、`termpilot_<version>_amd64.deb` |

`<version>` 与对应 Release 的版本号一致。

## 从源码运行

```bash
npm install
npm run dev
```

会话数据库位于 `%APPDATA%\TermPilot\termpilot.db`。

```bash
npm run typecheck
npm run build
```

推送到 `main` 会执行类型检查和构建。创建与 `package.json` 中 `version` 一致的标签（例如 `v0.5.8`）后，工作流在 Windows、macOS 和 Linux 上打包，并发布到 GitHub Release。发布说明来自 [`.github/release-body.md`](.github/release-body.md)。提交说明、更新日志和开发约定见 [AGENT.md](AGENT.md)。仅构建当前系统时使用 `npm run dist:win`、`npm run dist:mac` 或 `npm run dist:linux`。

## 许可

本软件以 [MIT 协议](LICENSE) 授权。参与开发请阅读 [贡献说明](CONTRIBUTING.md)。
