## 0.7.7

- 修复使用 TermPilot 后本机 `ssh` 命令全部失效（`Bad owner or permissions on ~/.ssh/config`）的问题：写回配置时用临时文件替换，新文件继承目录 ACL、混进其他账号的修改权，OpenSSH 拒绝权限过宽的 config。现在 TermPilot 完全不再写 `~/.ssh/config`，也不再有启动时的自动导入——改为新建连接时在表单里手动「从 ssh_config 导入」，选中一个 `Host` 自动填好主机、端口、用户、私钥和跳板。已被写坏的 config 请修复权限：对该文件执行 `icacls <路径> /inheritance:r`，再 `icacls <路径> /grant:r "<用户名>:(F)" "NT AUTHORITY\SYSTEM:(F)" "BUILTIN\Administrators:(F)"`。
- 注意：升级前在旧版本里编辑或新建连接会再次触发写回、重新破坏权限，请尽快升级。

安装包没有代码签名。
