# TermPilot 工程规范

修改本仓库前先读本文。提交说明使用 Conventional Commits。更新日志和发布说明不用类型前缀。

## 文案

- 使用书面中文和完整句子。写清对象、行为和结果。
- 不使用口语、语气词和拟人化说法。
- 产品口号保持为「你的终端，助手可以接着用。」
- README 中发给 Agent 的安装提示必须逐字保留，不得改写。
- 不在文档、提交说明或回复中写入主机地址、口令、跳板令牌或密钥。

## 提交说明

格式：

```text
feat(scope): 做了什么
fix(scope): 修正了什么
docs: 改了哪份说明
release: x.y.z
```

`scope` 可省略。常用范围：`ui`、`term`、`ssh`、`sftp`、`agent`、`cli`、`build`。

| 类型 | 用途 |
| --- | --- |
| `feat` | 新增或变更用户可感知的能力 |
| `fix` | 修复缺陷 |
| `docs` | 只改说明，不改行为 |
| `release` | 只升版本并更新发布说明 |

规则：

- 标题一行，书面语，说明结果。句末不加句号。
- 需要补充的事实另起一行，前留一个空行。不写口语和实现流水账。
- 功能与修复分开提交。发版单独提交，只包含版本号、`CHANGELOG.md`、`.github/release-body.md` 和锁文件中的版本字段。
- 查找：`git log --grep=^feat`、`git log --grep=^fix`、`git log --grep=^docs`、`git log --grep=^release`。
- 改写已有提交说明只在本地进行。覆盖已发布的远程历史需要明确要求。

## 更新日志与发布说明

- `feat`、`fix`、`docs`、`release` 只用于提交说明，不写入 `CHANGELOG.md` 和 `.github/release-body.md`。
- `.github/release-body.md` 与当前版本的更新日志一致。
- 修正已发布版本的措辞时，不改变事实。
- 每个版本的更新日志末尾保留「安装包没有代码签名。」

## 开发原则

- 改动限于当前任务。不顺手改无关格式、依赖大版本或未要求的功能。
- 连接编号为 `conn-`，终端编号为 `term-`。调用只使用编号。名称和备注只用于识别。
- 密码和私钥口令只在主进程经 `safeStorage` 加密存储，不从 IPC 返回明文。
- 认证方式只有 `password` 和 `key`。不使用 SSH Agent。
- 反向监听只绑定 `127.0.0.1`。
- 危险操作在窗口中等待用户确认。
- 改完执行 `npm run typecheck`。主进程或 preload 的改动需要重启开发进程。

## 技术栈

Electron、React 19、TypeScript、electron-vite。界面使用 shadcn/ui，底层为 Radix（`components.json` 的 `style` 为 `radix-nova`）。不更换为 Base UI。终端网格使用 xterm.js。

```text
src/main/          主进程：SSH、PTY、反向监听、存储、MCP
src/preload/       contextBridge。渲染进程只通过 window.api 访问
src/shared/        共享类型与 IPC 通道名
src/renderer/src/
  components/ui/   shadcn 组件。用 CLI 更新，不手改交互逻辑
  components/      业务界面
  lib/utils.ts     cn 的唯一出口
  stores/          Zustand
  terminal/        xterm 实例池
resources/         安装包资源与独立脚本，例如 install-sftp.sh
```

`@/` 指向 `src/renderer/src`。主进程不引用 `@/`。

## 界面

- 按钮、输入、对话框、菜单、侧边栏、标签和徽章使用 `@/components/ui/*`。
- 新增组件使用 `npx shadcn@latest add <name>`。不从 `base-*` 或 `aria-*` 复制文件。
- 颜色使用主题变量，例如 `bg-background`、`text-muted-foreground`、`bg-sidebar`。不另写一套十六进制工具类。
- 侧边栏收起状态由 `SidebarProvider` 管理，不在 Zustand 中再存一份。
- 终端标签不使用 `Tabs` 包裹终端内容，避免切换时卸载 xterm。
- 备注和重命名使用对话框，不在列表行内编辑。

## 进程与数据

- 渲染进程无 Node。保持 `sandbox` 和 `contextIsolation` 开启。
- 数据库为 userData 下的 `termpilot.db`，使用 `node:sqlite`（WAL）。不引入 `better-sqlite3`。
- 旧的 `sessions.json` 仅在首次启动时导入，并改名为 `.migrated`。

## 连接

- `forward`：本机作为 SSH 客户端连接服务器。
- `reverse`：本机等待 shell 连入，连入后打开终端标签。

## 发布

- 版本号写在 `package.json`。标签为 `v*.*.*`，且与版本号一致。
- 打包由 GitHub Release 工作流执行。未要求时不在本机运行 `electron-builder`。
- 工作流使用 `CSC_IDENTITY_AUTO_DISCOVERY=false`。安装包不签名。
