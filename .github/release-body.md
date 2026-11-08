## 0.8.6

- 图形桌面新增「中文键盘」接管，解决 VNC 下手动输入中文到不了远端的问题：用透明文本框接住本机输入法，合成结束逐字发 Unicode keysym，普通键、组合键和方向键照常转发，Esc 退出。
- 新增「发送文字」：本机打完字整段写进远端剪贴板再粘贴，可选普通粘贴或终端粘贴（`ctrl-shift-v`）。两个入口都收进标签栏右侧图标行。

安装包没有代码签名。

## 0.8.5

- 合并重复工具：`term_screenshot_scrollback` 并入 `term_screenshot`（`scope=buffer` 截整段缓冲，给 `startLine` / `endLine` 仍只裁那一段）；`term_read` 并入 `term_lines`（不填范围就是当前画面）。工具总数 37 → 35。
- `app_screenshot` 默认叠加 100px 坐标网格，传 `grid=false` 关闭，或填 20–500 自定义间距。
- 终端截图不加网格：终端按行定位、没有点击坐标，叠网格只会挡住文字。
- `desktop_type` 新增 `method=clipboard`：先把整段文字写进远端剪贴板，再发粘贴快捷键（`pasteKeys` 默认 `ctrl-v`，终端用 `ctrl-shift-v`），避免 VNC 下中文被远端输入法拦截。默认仍是逐字发按键。

安装包没有代码签名。

## 0.8.4

- 桌面点击和滚动支持尺寸换算：`desktop_screenshot` 返回 `shotId`，`desktop_click` / `desktop_scroll` 传回它就按那张截图的坐标空间等比换算，截图后窗口缩放、VNC 分辨率切换或 RDP 重新协商都不会点偏。
- 不传 `shotId` 时用该桌面最近一张截图，也可以显式传 `imageWidth` / `imageHeight`；截图编号失效或属于别的桌面会明确报错，不会按错基准点。

安装包没有代码签名。

## 0.8.3

- `desktop_screenshot` 新增 `region`：只截 `{x,y,width,height}` 这块区域返回，左上角角标标出这块图在原画面里的起点坐标，刻度仍是整屏坐标，可以直接拿去 `desktop_click`。
- 网格合成从主进程移到渲染进程 canvas：文字用系统等宽字体描边，按 32px 小块在 OKLCH 空间给线色重新定明度（浅底深色、深底浅色），再用 APCA（|Lc| ≥ 45）和 WCAG（≥ 3）双轨校验。
- 细网格只画线不标数字（刻度最多每 100px 一个），格子越密线越淡；原生 RDP 窗口截图也支持网格。
- 修正原生 RDP 窗口的坐标说明：截图与点击都用窗口外框（含系统标题栏）。

安装包没有代码签名。

## 0.8.2

- `desktop_screenshot` 默认叠加 100px 坐标网格，Agent 不传参数也能直接按刻度算点击坐标。
- 需要干净画面时传 `grid=false` 关闭，也可传 20–500 自定义间距；`desktop_actions` 里的截图步骤同样生效。

安装包没有代码签名。

## 0.8.1

- 修复 Ubuntu 22.04 上 Linux 包因原生模块要求 GLIBC 2.42 而无法启动。Linux 构建固定到 Ubuntu 22.04，并自动检查 GLIBC 不超过 2.35。
- 打包只重建 `node-pty` 和串口模块，跳过 ssh2 可选模块 `cpu-features`，避免 Electron 44 下编译失败。
- 修复没有系统钥匙串的 Linux 桌面无法保存凭据的问题，改用权限 0600 的本机 AES-256-GCM 密钥文件降级。
- CI 固定 Ubuntu 22.04 构建环境。

安装包没有代码签名。

## 0.8.0

- 新增 VNC / RDP 图形桌面：VNC 使用内嵌 noVNC，RDP 默认内嵌 IronRDP，也可切换 FreeRDP 原生窗口。
- 每个桌面连接只保留一个窗口；标签栏和侧边栏区分终端与桌面。
- MCP 新增 10 个桌面工具：截图网格、点击、按键、文字输入、滚动、等待、批量操作、AT-SPI 无障碍和性能指标，工具总数 37。
- VNC / 内嵌 RDP 支持双向文本剪贴板；VNC 逐字输入支持标点、中文和 Emoji。
- 新增自动 / 画质 / 平衡 / 流畅性能模式、后台降载、缩放防抖、桥接合包与背压。
- Agent 接入改为复制完整指引，由 Agent 安装 Skill 并注册 MCP。
- 修复窗口重绘后的桌面残留连接和启动白屏恢复。

安装包没有代码签名。
