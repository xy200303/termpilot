# RDP 前端自研（基于 IronRDP 官方 web-client）

目标是用 IronRDP 官方 `web-client` 替换社区包 `ironrdp-wasm`，解决 xrdp 0.9.17 上白屏、登录框不渲染的问题。

## 为什么不用现成包

- `ironrdp-wasm` 是 electerm 对官方 web-client 的社区再打包，1.3.0 重写了会话补丁后，连 xrdp 时 TLS 和能力交换完成后不再有后续 PDU，画面纯白。
- 1.2.0 能出画面但有撕裂；社区包没有 changelog，仓库也没有 release，无法确认改动。
- 官方仓库本身包含完整实现，只是没有发布到 npm：
  - `crates/ironrdp-web`：Rust → WASM 会话层
  - `web-client/iron-remote-desktop`：可复用 Web Component（TS）
  - `web-client/iron-remote-desktop-rdp`：RDP 后端绑定
  - `web-client/iron-svelte-client`：官方演示客户端

## 构建步骤

前置：Rust 工具链、Node 20+、`wasm-pack`。

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --locked

git clone https://github.com/Devolutions/IronRDP.git
cd IronRDP

# 1. 编译 wasm（产物在 crates/ironrdp-web/pkg）
cargo xtask web build

# 2. 构建 Web Component
cd web-client/iron-remote-desktop && npm install && npm run build

# 3. 构建 RDP 后端（wasm 已编译时用 build-alone，避免重复跑 cargo）
cd ../iron-remote-desktop-rdp && npm install && npm run build-alone

# 4. 演示客户端：复制 dist 到 static，起 dev server
cd ../iron-svelte-client && npm install && npm run pre-build-no-wasm && npx vite dev
```

RDCleanPath 代理：浏览器不能直连 TCP，需要一个 WebSocket 代理转发 `TCP → X.224 → TLS`。可以用 IronRDP 仓库里 `web-client` 之外的参考实现（本机调试时用的是 electerm 仓库的 `example/lib/rdp-proxy.js`，端口 8080，WS 路径 `/`）。

演示页里需要填：`hostname`（`42.194.149.138:3389`）、`username`（`rdptest`）、`password`、`gatewayAddress`（`ws://127.0.0.1:8080/`）。

构建注意：这台机器访问不了 GitHub Releases，`wasm-pack` 下载 binaryen 会失败。已在本地 checkout 的 `crates/ironrdp-web/Cargo.toml` 里关掉 wasm-opt：

```toml
[package.metadata.wasm-pack.profile.release]
wasm-opt = false
```

关掉后产物 5.5 MB（未做 wasm-opt 压缩），功能验证不受影响。

## 根因定位（2026-11-09）

用官方 web-client 编出的 wasm + 官方演示客户端 + 社区代理，连同一台 xrdp 0.9.17（42.194.149.138，XFCE）：

- 画面正常渲染出 xrdp 登录框，没有撕裂，也没有白屏
- 点击密码框、开启客户端「Unicode keyboard mode」后键盘输入到达远端，登录成功并显示 XFCE 桌面（面板、图标、时钟都正常）

同一台服务器、同一个代理，换成 `ironrdp-wasm` 1.3.0 就是白屏且能力交换后没有后续 PDU。结论：**问题在社区包的 1.3.0 构建（IronRDP revision 从 `d0e18e3` 升到 `da016ce8`，并重写了 session 补丁），不是 xrdp，也不是我们的 RdpBridge**。

## 验证计划

1. 官方 wasm + 官方代理连 xrdp：能显示 XFCE 桌面 → 说明社区包补丁是根因，直接替换
2. 若官方也白屏 → 对比 `ironrdp-web` 上游 revision，定位到具体改动并在 fork 里打补丁
3. 接入 TermPilot 后复测：`desktop_screenshot` 非空、坐标点击生效、剪贴板双向、断线重连

## 接入 TermPilot 的方式

- 构建产物放在 `vendor/iron-remote-desktop/`、`vendor/iron-remote-desktop-rdp/`，以 `file:` 依赖引入，安装依赖和打包都不需要 Rust 工具链
- 主进程继续用现有的 `src/main/services/desktop/RdpBridge.ts` 做 RDCleanPath 代理（每标签一个回环端口 + 一次性令牌）
- 渲染层新增 `src/renderer/src/desktop/ironRdp.ts`：注册 `<iron-remote-desktop>` 元素、等待 `ready`、拼配置并 `connect()`；`RdpView` 只负责挂载容器和处理状态
- 输入、光标、缩放、剪贴板都交给官方组件（它自己监听 canvas 的鼠标事件和 window 的键盘事件），不再自己维护扫描码表

刷新 vendor 的步骤（在 IronRDP checkout 里）：

```bash
cargo xtask web build
cd web-client/iron-remote-desktop && npm install && npm run build
cd ../iron-remote-desktop-rdp && npm install && npm run build-alone
cp ../iron-remote-desktop/dist/{iron-remote-desktop.js,index.d.ts,package.json,CHANGELOG.md} \
   <termpilot>/vendor/iron-remote-desktop/
cp dist/{iron-remote-desktop-rdp.js,index.d.ts,package.json,CHANGELOG.md} \
   <termpilot>/vendor/iron-remote-desktop-rdp/
```

`crates/ironrdp-web` 打出来的 wasm 有 5.5 MB，`iron-remote-desktop-rdp` 构建时以 base64 内联进 `iron-remote-desktop-rdp.js`（7.7 MB）。这份产物按需加载：`RdpView` 是懒加载路由，`rdpAgent` 又是独立 chunk（约 7.4 MB），不影响首屏。

页面 CSP 要放行 `data:` 的 `connect-src`：wasm-bindgen 用 `fetch('data:application/wasm;base64,...')` 初始化，漏掉会直接报 `Failed to fetch`。`src/renderer/index.html` 里已加上。

## 端到端验证（2026-11-09）

服务器：`42.194.149.138:3389`，xrdp 0.9.17 + XFCE，账号 `rdptest`。TermPilot 开发构建 + MCP：

- 连接后 `desktop_screenshot` 返回 1184×792 的登录框画面，`desktop_click` 点密码框、OK 均生效
- `desktop_type`（method=keys）输入密码后登录进 XFCE 桌面
- `desktop_type`（method=clipboard，pasteKeys=ctrl-shift-v）把中文整段写进远端剪贴板并粘贴，xfce4-terminal 里中文完整到达
- 远端 `xclip -selection clipboard` 写入文本后，本机 Windows 剪贴板同步到同一内容（远端 → 本机）
- 同一连接关闭后重新打开可以再连入（`connection_close`/`connection_open` 多次循环验证）；旧会话已被 xrdp 回收时是全新会话，回收前会命中上面「接回仍然存活的会话」的限制

## 已知限制

- **中文输入要走剪贴板**：xrdp 会丢掉 Unicode 键盘事件里的非 ASCII 字符，用 `desktop_type` 的 keys 方式打中文只留下空格；`method=clipboard` 正常。官方组件的 canvas 不是可编辑元素，也没有处理 `compositionend`，所以本机输入法直接打字同样不适用于中文，界面上用「发送文字」走剪贴板。
- **接回仍然存活的 xrdp 会话会失败**：客户端断开后服务端会话还在时，再次连入有两种表现——回放的首个 fast-path 帧触发 `invalid fastPath_length` 解析错误，或者连上后没有任何 PDU（画面空白）；服务端 `/var/log/xrdp.log` 会记 `++ reconnected session`，有时跟随 sesman 的 `login failed for display 0`。官方 wasm + 官方演示客户端同样如此，不是这次接入引入的。
  - `RdpView` 在 connect/run 失败时会自动关掉桥接、1.5 秒后重试一次；会话已被 xrdp 回收时重试即可恢复。
  - 仍失败时界面会提示「服务器上可能还留着上一次的会话」，等 xrdp 回收（或服务端 `pkill -u <用户>`）后再点「重新连接」即可。
  - 全新会话、以及登录框阶段的断线重连都正常。
- 官方组件把会话藏在元素内部，只有 `Session` 的少量接口外露，Agent 的点击/按键只能通过给 canvas 派发合成 DOM 事件实现（已验证有效）。
- `vendor` 里是未做 `wasm-opt` 的产物，比上游发布流程的产物大一些；本机访问不了 GitHub Releases，暂时保持现状。

## 当前进展

- [x] 官方仓库构建、白屏根因定位（社区包 1.3.0 的构建问题）
- [x] vendor 产物接入，`file:` 依赖，无需 Rust 工具链
- [x] React 面板换成官方自定义元素，复用 RdpBridge
- [x] 截图、坐标点击、键盘输入、剪贴板双向、断线重连端到端验证
- [x] `npm run typecheck`、`npm run build` 通过；首屏 index 约 1.1 MB，RDP chunk 懒加载
