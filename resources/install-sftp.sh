#!/bin/sh
# 打开文件通道前先确认子系统。不是 internal-sftp 就改成它。不安装软件包。
set -e
as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo -n "$@"
  fi
}
enable_subsystem() {
  cfg=/etc/ssh/sshd_config
  comment_sftp() {
    f=$1
    if [ ! -f "$f" ]; then
      return 0
    fi
    as_root sed -i.termpilot.bak -E 's/^([[:space:]]*)[Ss]ubsystem[[:space:]]+[sS][fF][tT][pP][[:space:]].*/# termpilot: &/' "$f"
  }
  comment_sftp "$cfg"
  if [ -d /etc/ssh/sshd_config.d ]; then
    for f in /etc/ssh/sshd_config.d/*.conf; do
      [ -f "$f" ] || continue
      comment_sftp "$f"
    done
  fi
  printf '\nSubsystem sftp internal-sftp\n' | as_root tee -a "$cfg" >/dev/null
  if ! as_root sshd -t >/dev/null 2>&1; then
    echo "sshd 配置无效，正在还原"
    for f in /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf; do
      [ -f "$f.termpilot.bak" ] || continue
      as_root mv "$f.termpilot.bak" "$f"
    done
    return 1
  fi
  as_root rm -f /etc/ssh/sshd_config.termpilot.bak /etc/ssh/sshd_config.d/*.conf.termpilot.bak
  if command -v systemctl >/dev/null 2>&1; then
    as_root systemctl reload sshd >/dev/null 2>&1 || as_root systemctl reload ssh >/dev/null 2>&1 || true
  fi
  if [ -f /var/run/sshd.pid ]; then
    as_root kill -HUP "$(cat /var/run/sshd.pid)" >/dev/null 2>&1 || true
  fi
}
if ! command -v sshd >/dev/null 2>&1; then
  echo "没有 sshd，不能改成内置 SFTP"
  exit 1
fi
target=$(sshd -T 2>/dev/null | awk 'tolower($1)=="subsystem" && tolower($2)=="sftp" { print $3; exit }')
if [ "$target" = "internal-sftp" ]; then
  echo "TERMPILOT_SFTP already"
  exit 0
fi
echo "当前子系统: ${target:-未配置}"
echo "改为 sshd 自带的 internal-sftp"
if [ "$(id -u)" -ne 0 ] && ! sudo -n true >/dev/null 2>&1; then
  echo "不是 root，也没有免密 sudo，改不了 sshd 配置"
  exit 1
fi
if ! enable_subsystem; then
  echo "内置 SFTP 没有写进 sshd 配置"
  exit 1
fi
echo "已改成 internal-sftp"
echo "TERMPILOT_SFTP switched"
exit 0
