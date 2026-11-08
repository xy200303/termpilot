# TermPilot：Agent 操作远程服务器的 SSH 终端，私钥留在本机

> 公众号摘要：TermPilot 是开源 SSH 终端。Agent 操作远程服务器时，用的是你已经打开的会话：命令打在屏幕上，交互式菜单和 TUI 可以继续按键，私钥留在本机。写终端教程时，也能截到这块真实画面。

平时连一台 Linux 服务器，烦的是同一条命令要反复敲。

`ssh user@host -p 2222`，地址、端口、用户名，下次还得再想一遍。Windows 自带的窗口能连上，什么都记不住。这是老问题，TermPilot 把这条命令收成左侧的一条连接，点一下就打开。

AI 来了之后，真正卡住人的已经不是登录。是你想让 Agent 去操作这台已经连上的机器。

## 交给 Agent 时，通常会撞上这几件事

**连一次就断。** 很多远程插件的做法是：助手自己发起一次 SSH，跑完这条命令，连接就结束了。目录还停在哪、刚才那个安装程序还在不在，下一次对不上。它经常得重新连，而你眼前这个窗口里的会话，它进不去。

**看不见它写进去的命令。** 调用发生在助手那边。成功了你看到一段文字，失败了你看到一段报错。按键没有打进你正在看的终端，所以你无法在当场确认它到底敲了什么。

**交互式几乎走不下去。** 服务器上的菜单、安装向导、`sudo` 密码、以及各种 TUI，都在等一次按键。助手如果只会“执行一条命令然后退出”，这些界面会停在那里。基于 TUI 的 Agent CLI 也一样，进得去，操作不了。

**密钥得交给它。** 助手要自己去连，就要拿到密码或私钥。口令一旦离开你的电脑，进了对话、日志或它的配置，后面就收不回来。

还有一件做教程的人才会痛：**截不到真实画面。** 写终端教程、写服务器操作手册，需要的是当时那一块屏幕，包括命令、输出、颜色和停在半路的菜单。助手回传的纯文本可以贴进文档，却不是一张正在发生的截图。

## TermPilot 把人和 Agent 放在同一个窗口里

TermPilot 是开源的 SSH 客户端，Windows、macOS、Linux 都能用。你先在窗口里登录。密码和私钥口令只留在这台电脑上，助手不会再向你要一遍，也不会写进仓库。

助手接着用的，是这条还没断开的会话。它的下一次按键打进当前画面，你看得到。已经打开的终端会接着用，不会为了同一件事再连一次。

删文件、写系统路径这类危险操作，会先在窗口里停住，等你点允许。

![连上之后，终端就留在窗口里，助手接着用的是这一块画面](http://mmbiz.qpic.cn/sz_mmbiz_png/2zJufTziaTjNFBcaxicNOLwAsZpaPWIlSUicA6XYEUGUduBaKJLd2OUStStvA2Ra4Qln048RAyyAbZ4gF9AhkdFjPydMfgGSFOTfWibuv7hSpH4/0?from=appmsg)

在这条连接上右键「复制为 Agent 提示词」，贴到 Cursor、Claude Code、Codex、Kimi Code、WorkBuddy 或 CodeBuddy 里。复制出来的是会话名称、主机、用户、端口；终端已经打开时还会带上 `termId`。助手按这一份去操作，不用你再口述地址，也不用把私钥贴进对话。

![右键可以复制成给助手的提示词，也可以直接连接](http://mmbiz.qpic.cn/sz_mmbiz_png/2zJufTziaTjOSf4G45yUms1Slo21VjeiaLf8ZkiaTvhOsfame5AsLe8AyUiaZQP5PU4nyCicJMN9zKrClnnKfxmiajgQHeWoLycmfZVYMfhMXKQG8/0?from=appmsg)

要看画面时，它可以截当前这一屏，或把滚过的内容接成图片。写终端教程、写操作手册，用的就是这块真实终端，而不是事后补的示意图。

## 交互式意味着：一个 Agent 可以去开另一个

菜单和 TUI 还停在屏幕上时，助手按的是方向键和回车，文字直接打进当前行。回到命令提示符之后，再执行下一条命令。密码和验证码仍然由你在窗口里输入。

所以那些本身就是 TUI 的 Agent CLI，可以在这条远程终端里被叫起来。外层的 Agent 看着同一块屏幕，给它按键，读它的输出，需要时再截一张图。

一台机器上可以并存多个终端。理论上，一个 Agent 可以同时照看好几条已经登录的会话，在各自的画面里驱动不同的 CLI。这很接近大家说的 agent team：不是再造一套编排平台，而是远程机器上的那些 Agent，终于有一块不会中途消失的屏幕。

## 先把服务器存成一条正向 SSH

正向，就是你平时敲的那种：机器有地址，本机主动连过去。

左侧「连接」里，同一台机器的几个账号收在同一个主机下面。

![正向 SSH 按机器分组，点名称就打开终端](http://mmbiz.qpic.cn/sz_mmbiz_png/2zJufTziaTjNoYkVWzAmlibg8lfUMbiaTibJ0GZmwb4HlEkliaRruK0m56JDOkNkyPtTibPibu8KyrPWtavc1wc8f7IYupg4BtKCwd98iayuFiaOaBU8/0?from=appmsg)

点「正向 SSH」右侧的加号，把平时的命令贴进第一行：

```text
ssh ubuntu@203.0.113.10 -p 22
```

名称、主机、端口、用户名会按这条命令填上。认证选密码或私钥。口令写在本机。`203.0.113.10` 只是文档里的示例地址，用来看粘贴之后表单怎么拆。

![新建时可以直接粘贴 ssh 命令](http://mmbiz.qpic.cn/mmbiz_png/2zJufTziaTjNN9Qp0lHrIO1aFUtmXzJIZLz3YxsjnqFEFwSEZmgfEvrtgpxicA4pkPaol3wDFa8gGzibGe0TCRUZZqSbmB3xu1TMkaibjicYHnKo/0?from=appmsg)

![粘贴之后，主机、端口、用户名已经拆开](http://mmbiz.qpic.cn/mmbiz_png/2zJufTziaTjM97rfGtlG5B0MmdVdkG0aNYib9c4MoYtUibsoEA9b128kH2nXzqjxbKsgiaHYX0kmaCeibJNspBQ7QYXpYs56r3Ukot5ZBdzSoExc/0?from=appmsg)

连上之后，左侧「文件」跟着这条连接走，不用再开端口，也不用再输一遍密码。助手列目录、改文件，走的也是它。

![文件树用的是已经建立的这条 SSH](http://mmbiz.qpic.cn/mmbiz_png/2zJufTziaTjNxfScnSfqibPBv9VKEynolMllnic1Y9VADEMheiczzMJfiac3DTN1avOL75WJ8tuicExQAeYj8teSRAYJjDa3byPY49p4ScWOPl0Jo/0?from=appmsg)

## 让助手接上

第一次在设置里打开 MCP 并保存。软件不会在首次启动时自己打开。监听只在本机。

把下面这段话发给助手，它会自己装好用法，并且只注册名为 termpilot 的这一条，其它服务器不动：

```text
请安装 TermPilot 配套 skill：读取 https://raw.githubusercontent.com/xy200303/termpilot/main/skills/termpilot/SKILL.md 并安装到你的用户级 skills 目录，再读取本机 TermPilot 的 mcp.json（Windows 是 %APPDATA%\TermPilot\mcp.json），只把名为 termpilot 的 MCP 注册到你自己的配置里，其它服务器不要动；完成后用这个 skill 操作 TermPilot。
```

MCP 没接上时，也可以在本机运行 `termpilot`。窗口没开时，这条命令会先把 TermPilot 打开，操作的还是同一个窗口。

仓库：[github.com/xy200303/termpilot](https://github.com/xy200303/termpilot)

安装包：[Releases](https://github.com/xy200303/termpilot/releases/latest)

没有公网地址的机器怎么连回来，下一篇再写。
