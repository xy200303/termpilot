<p align="center">
  <img src="resources/icon.svg" width="96" alt="TermPilot" />
</p>

<h1 align="center">TermPilot</h1>

<p align="center">给人用的 SSH 终端，Agent 也能操作同一套连接。</p>

<p align="center">
  <a href="#功能">功能</a>
  ·
  <a href="#快速开始">快速开始</a>
</p>

## 快速开始

```bash
npm install
npm run dev
```

会话保存在 `%APPDATA%\TermPilot\termpilot.db`。密码和私钥口令只在本机加密，不会出现在仓库里。

```bash
npm run typecheck
npm run build
```

## 功能

- 正向 SSH，支持密码或私钥。不使用 SSH Agent。
- 反向监听只绑定 `127.0.0.1`。需要从公网连入时，用 cpolar 这类工具暴露端口。
- 本机终端和远程会话用同一排标签。
- 连接按机器分组，一台机器下面可以有多条连接。
- 远程文件树按类型显示图标。双击文本文件编辑，`Ctrl+S` 写回服务器。
- 终端截图和滚动长图。截完可以打开目录，或把图片复制出来。
- 内置 MCP，默认 `http://127.0.0.1:3927/mcp`。设置里可以写入 Claude Code、Kimi Code、Codex、WorkBuddy。

## 许可

MIT
