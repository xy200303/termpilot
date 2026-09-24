# TermPilot 工程约定

给后续改这个仓库的人和 agent 用。先读这份，再改代码。

## 栈

Electron + React 19 + TypeScript + electron-vite。界面只用 **shadcn/ui，底层 Radix**（`components.json` 的 `style` 必须是 `radix-*`，当前是 `radix-nova`）。不要换成 Base UI，会话树依赖 Radix 的右键菜单。

终端网格用 xterm.js，不属于 UI 库，不要用组件库去画字符网格。

## 目录

```
src/main/          主进程。SSH、PTY、反向监听、存储、以后的 MCP
src/preload/       contextBridge 白名单，渲染进程只能走 window.api
src/shared/        两边共用的类型和 IPC 通道名
src/renderer/src/
  components/ui/   shadcn 生成的组件，用 CLI 更新，不要手改交互逻辑
  components/      业务界面，只组装 ui/ 里的组件
  lib/utils.ts     cn 的唯一再出口
  stores/          zustand
  terminal/        xterm 单例池
```

路径别名 `@/` 指向 `src/renderer/src`。主进程不要引用 `@/`。

## UI

- 按钮、输入、对话框、菜单、侧边栏、标签、徽章只用 `@/components/ui/*`。
- 新增组件：`npx shadcn@latest add <name>`。不要从别的样式（`base-*`、`aria-*`）拷文件进来。
- 颜色只用主题变量（`bg-background`、`text-muted-foreground`、`bg-sidebar`）。不要再写一套 `#hex` 工具类。
- 侧边栏收纳用 `SidebarProvider`，不要在 zustand 里再记一份开关。
- 终端标签是窗口级标签，不要用 `Tabs` 把终端内容包进去，否则一切走 xterm 就被卸载。

## 进程

- 渲染进程无 Node。`sandbox`、`contextIsolation` 保持打开。
- 密码和私钥口令只在主进程经 `safeStorage` 加密落盘，不从 IPC 返回明文。
- 会话存在 userData 下的 `termpilot.db`，用 Node 内置的 `node:sqlite`（WAL）。旧的 `sessions.json` 首次启动时导入并改名为 `.migrated`。不要再引入 `better-sqlite3`。
- 反向监听只绑 `127.0.0.1`。公网暴露交给 cpolar 这类外部工具，本应用不做端口转发。

## 连接

- `forward`：本机 SSH 客户端，主动连服务器。
- `reverse`：本机等 shell 连入。连上后开一个终端标签。

## 检查

改完跑 `npm run typecheck`。主进程或 preload 改动需要重启 `npm run dev`，渲染进程会热更新。
