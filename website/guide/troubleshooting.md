---
title: 故障排查
description: TermPilot 常见问题：连不上、跳板拒绝、SFTP 打不开、串口找不到、终端卡死，以及数据存放位置。
---

# 故障排查

按「症状 → 原因 → 怎么办」组织。数据位置在最后。

## 连接与登录

**一直停在「连接中」，最后超时**

按顺序查：网络能不能通（本机 `ping` / `telnet 主机 端口`）、端口对不对、跳板每一跳的账号对不对。连接超时默认 15 秒，编辑连接 →「高级」可以调大。

**私钥登录失败**

确认三处：私钥路径是不是本机绝对路径（表单里有「浏览」按钮直接选）；私钥有口令的话口令填了没有；服务器 `authorized_keys` 里是不是这把公钥。支持 RSA 和 ed25519。

**跳板报 `Channel open failure: platform authorization denied`**

这类堡垒机只授权一次转发，第二次拨号必被拒。编辑这条连接 →「高级」→ **文件通道**改成「复用终端连接」，SFTP 走终端那条已授权的连接，不再拨第二次。

**无公网 IP 的机器怎么连**

用反向监听：新建「反向监听」连接，本机只在 `127.0.0.1` 监听，公网地址用 cpolar 把端口映射出去，目标机主动连回来。反向 shell 只接受本机连入。

## 文件面板（SFTP）

**提示「文件通道没有打开」**

目标机的 sshd 没有可用的 SFTP 子系统。默认（自动模式）下 TermPilot 会在目标机上跑安装脚本把它改成 internal-sftp——这需要该账号有 root 或免密 sudo。改不了的时候会把脚本输出原样显示出来。如果你不想让它动 sshd，把文件通道设为「复用终端连接」，并确保 sshd 原本就有 SFTP。

**传输中途卡住**

跳板上 SSH 通道窗口被打满时，大文件传输会停住。TermPilot 已把传输并发压到 4 路缓解；仍然卡就先断连重开，传输会重新拨号。

**双击文件不进编辑器**

两种可能：文件超过 1.5MB，或检测到是二进制（内容里有 NUL）。这两类都不在内置编辑器里打开，请下载后本地处理。

## 终端

**闲置一段时间后终端没反应**

0.7.2 之后一般不会：心跳 15 秒一次，4 次无响应（约 1 分钟）判死并透明重拨。还在旧版本请先升级。

**串口连不上 / `serial_list` 是空的**

Windows 上确认设备管理器里能看到 COM 口、驱动已装；Linux 上确认当前用户在 `dialout` 组。波特率、数据位、停止位、校验要和设备手册一致，不对的表现通常是能连上但满屏乱码。

**终端画面里 TUI 显示错乱**

先确认窗口尺寸不是极端窄；再试 `term_reconnect` 重绘。本机 Windows 终端里跑 TUI 有已知的历史问题（PSReadLine 续行、IME 组字偏移），0.7.5 已修，请升级到最新版。

## Agent / MCP

**Agent 连不上 MCP**

查三项：设置 →「MCP 服务」的开关是否打开；端口（默认 3927）有没有被占；请求头里的 Bearer 令牌和 `%APPDATA%\TermPilot\mcp.json` 里的是否一致。MCP 只绑 `127.0.0.1`，从别的机器连不进来是设计如此。

**某次调用失败想查原因**

设置 →「调用记录」里有最近的工具调用，失败的标红，带错误摘要。

## 数据都在哪

| 内容 | Windows 路径 |
| --- | --- |
| 连接、终端布局、设置、凭据密文 | `%APPDATA%\TermPilot\termpilot.db` |
| MCP 令牌与注册信息 | `%APPDATA%\TermPilot\mcp.json` |
| 截图 / 录屏产物 | `%APPDATA%\TermPilot\screenshots\` |

macOS 是 `~/Library/Application Support/TermPilot/`，Linux 是 `~/.config/TermPilot/`。卸载不会删这些数据（NSIS 配置 `deleteAppDataOnUninstall: false`），要彻底清理手动删目录。

都没有解决？到 [GitHub Issues](https://github.com/xy200303/termpilot/issues) 提问题，附上版本号（设置 → 关于）和「调用记录」里相关的失败条目。
