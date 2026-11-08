---
title: 更新日志
description: TermPilot 最近三个版本的更新内容，与仓库 CHANGELOG.md 同步。
---

# 更新日志

这里只同步最近三个版本。完整历史见仓库 [CHANGELOG.md](https://github.com/xy200303/termpilot/blob/main/CHANGELOG.md)。安装包均未做代码签名。

## 0.8.6

- 图形桌面新增「中文键盘」接管：用透明文本框接住本机输入法，合成结束逐字发 Unicode keysym，解决 VNC 下手打中文到不了远端的问题；普通键、组合键、方向键照常转发，Esc 退出。
- 新增「发送文字」：整段写远端剪贴板再粘贴，可选普通粘贴或终端粘贴（`ctrl-shift-v`）。两个入口都收进标签栏右侧图标行。

## 0.8.5

- 合并重复工具：`term_read` 并入 `term_lines`，滚动截图并入 `term_screenshot`（`scope=buffer`），工具总数 37 → 35。
- `app_screenshot` 默认叠加 100px 坐标网格；终端截图不加网格，避免挡住文字。
- `desktop_type` 新增 `method=clipboard`：写远端剪贴板再发粘贴快捷键（终端用 `ctrl-shift-v`），中文绕开远端输入法。

## 0.8.4

- 桌面截图返回 `shotId`，`desktop_click` / `desktop_scroll` 传回它就按那张截图的坐标空间等比换算；窗口缩放、VNC 分辨率切换或 RDP 重新协商后不再点偏。
- 不传 `shotId` 时用该桌面最近一张截图，也可以显式传 `imageWidth` / `imageHeight`；编号失效或跨桌面会明确报错。

[下载最新版](/download){ .vp-button }
