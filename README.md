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
- 终端截图和滚动长图。截完可以打开目录，或复制图片。
- 内置 MCP，默认 `http://127.0.0.1:3927/mcp`。删除和危险命令会先在窗口里请人确认。

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

## 许可

MIT
