## 0.7.6

- 每条连接新增「文件通道」设置（编辑连接 → 高级）：自动（默认，目标机缺 SFTP 子系统时自动改 internal-sftp 再单独拨号）、复用终端连接、总是单独拨号。跳板只授权一次转发的堡垒机（单独拨号会被 platform authorization denied 拒绝）改成「复用终端连接」后，SFTP 走终端那条已授权的连接，不再拨第二次。
- 复用模式下目标机没有 SFTP 子系统时报错会明确说明原因和恢复办法，不会静默失败或去改 sshd；自动模式下单独拨号被跳板拒绝时，错误信息会给出改成复用的指引。
- MCP 同步支持：`connection_create` / `connection_update` 新增 `sftpMode` 参数（auto / shared / fresh），`connection_list` 输出带 `sftpMode`。

安装包没有代码签名。
