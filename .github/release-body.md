- 修复 agent 用 `term_pty` 在本机 Windows 终端发命令不执行的问题：命令行尾补的是 LF，PowerShell（PSReadLine）把它当 Shift+Enter 续行，命令全堆在 `>>` 续行提示符里，要人工按一次真回车才全部涌出。现在行尾改用 CR（真终端回车发的就是 CR，SSH / Telnet / 串口也都认 CR）。
- 修复用中文输入法在 TUI（如 Kimi Code）里打字时整个终端内容左移、左边一截被裁掉的问题：IME 组字时浏览器会对光标处的隐藏输入框做 scrollIntoView，而 `overflow: hidden` 的容器仍可被程序滚动，页面被向左推且没有滚动条可回退。根节点和终端容器改为 `overflow: clip`，从机制上杜绝这个推移。

安装包没有代码签名。
