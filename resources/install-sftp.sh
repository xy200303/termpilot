#!/bin/sh
# 在已经连上的 SSH 里补上 SFTP。不新开端口。
# 外部 sftp-server 即使文件存在，也可能以 127 退出。那时改用 internal-sftp。
# 只有程序确实不存在时才装软件包。
set -e
echo "先看这台机器有没有 SFTP。Ubuntu 的 SSH 一般自带，有就不安装"
echo "用户 $(id -un) uid=$(id -u)"
run() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo -n "$@"
  fi
}
# 系统自己的更新经常占着锁。锁还在就等，别的错误不等。
apt_retry() {
  n=0
  log=/tmp/termpilot-apt.$$
  while true; do
    if "$@" >"$log" 2>&1; then
      cat "$log"
      rm -f "$log"
      return 0
    fi
    status=$?
    if ! grep -E -q 'Could not get lock|Unable to lock directory|Resource temporarily unavailable' "$log"; then
      cat "$log"
      if grep -E -q 'Unmet dependencies|fix-broken|held broken packages' "$log"; then
        echo broken >/tmp/termpilot-apt-reason.$$
      else
        rm -f /tmp/termpilot-apt-reason.$$
      fi
      rm -f "$log"
      return "$status"
    fi
    n=$((n + 1))
    if [ "$n" -eq 1 ]; then
      cat "$log"
      echo "软件源正被其他安装占用，等待它结束"
    elif [ $((n % 7)) -eq 0 ]; then
      echo "软件源仍被占用，继续等待"
    fi
    if [ "$n" -ge 60 ]; then
      echo "等了大约三分钟，软件源仍被其他安装占用" >&2
      rm -f "$log"
      return "$status"
    fi
    sleep 3
  done
}
export DEBIAN_FRONTEND=noninteractive
if ! command -v sshd >/dev/null 2>&1; then
  echo "没有 sshd，无法改子系统"
  exit 1
fi
enable_subsystem() {
  use=$1
  cfg=/etc/ssh/sshd_config
  if [ ! -w "$cfg" ]; then
    echo "无法写入 $cfg"
    exit 1
  fi
  comment_sftp() {
    f=$1
    if [ ! -f "$f" ] || [ ! -w "$f" ]; then
      return 0
    fi
    sed -i.termpilot.bak -E 's/^([[:space:]]*)[Ss]ubsystem[[:space:]]+[sS][fF][tT][pP][[:space:]].*/# termpilot: &/' "$f"
  }
  comment_sftp "$cfg"
  if [ -d /etc/ssh/sshd_config.d ]; then
    for f in /etc/ssh/sshd_config.d/*.conf; do
      [ -f "$f" ] || continue
      comment_sftp "$f"
    done
  fi
  printf '\nSubsystem sftp %s\n' "$use" >> "$cfg"
  if ! sshd -t >/dev/null 2>&1; then
    echo "sshd 配置无效，正在还原"
    for f in /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf; do
      [ -f "$f.termpilot.bak" ] || continue
      mv "$f.termpilot.bak" "$f"
    done
    exit 1
  fi
  rm -f /etc/ssh/sshd_config.termpilot.bak /etc/ssh/sshd_config.d/*.conf.termpilot.bak
  if command -v systemctl >/dev/null 2>&1; then
    systemctl reload sshd >/dev/null 2>&1 || systemctl reload ssh >/dev/null 2>&1 || true
  fi
  if [ -f /var/run/sshd.pid ]; then
    kill -HUP "$(cat /var/run/sshd.pid)" >/dev/null 2>&1 || true
  fi
  echo "已重载 sshd，SFTP 子系统改为 $use"
}
target=$(sshd -T 2>/dev/null | awk 'tolower($1)=="subsystem" && tolower($2)=="sftp" { print $3; exit }')
echo "当前 SFTP 子系统: ${target:-未配置}"
if [ "$target" = "internal-sftp" ]; then
  echo "已经在用 sshd 自带的 internal-sftp，再安装软件包也打不开文件通道"
  exit 1
fi
# 能执行不等于子系统能跑起来。缺动态库、解释器或 chroot 时，外部程序会以 127 退出。
if [ -n "$target" ] && [ -x "$target" ]; then
  echo "子系统程序已经存在: $target"
  echo "文件通道仍然打不开，改为 sshd 内置的 internal-sftp，不安装软件包"
  use=internal-sftp
  enable_subsystem "$use"
  exit 0
fi
if [ -n "$target" ]; then
  echo "配置指向的程序不存在: $target"
  ls -l "$target" 2>&1 || true
fi
found=""
for p in /usr/libexec/openssh/sftp-server /usr/lib/openssh/sftp-server /usr/lib/ssh/sftp-server; do
  if [ -x "$p" ]; then
    found=$p
    break
  fi
done
if [ -z "$found" ]; then
  echo "机器上没有 sftp-server，才开始安装"
  if command -v apt-get >/dev/null 2>&1; then
    echo "使用 apt-get 安装 openssh-sftp-server"
    apt_opts="-o DPkg::Lock::Timeout=180 -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold"
    apt_retry run apt-get $apt_opts update -qq
    rm -f /tmp/termpilot-apt-reason.$$
    if ! apt_retry run apt-get $apt_opts install -y -qq openssh-sftp-server; then
      if [ ! -f /tmp/termpilot-apt-reason.$$ ]; then
        exit 1
      fi
      echo "已有软件包的依赖不完整，先修复再安装"
      apt_retry run apt-get $apt_opts -y -f install
      apt_retry run apt-get $apt_opts install -y -qq openssh-sftp-server
    fi
    rm -f /tmp/termpilot-apt-reason.$$
  elif command -v dnf >/dev/null 2>&1; then
    echo "使用 dnf 安装 openssh-server"
    run dnf install -y openssh-server
  elif command -v yum >/dev/null 2>&1; then
    echo "使用 yum 安装 openssh-server"
    run yum install -y openssh-server
  elif command -v apk >/dev/null 2>&1; then
    echo "使用 apk 安装 openssh-sftp-server"
    run apk add --no-cache openssh-sftp-server
  elif command -v zypper >/dev/null 2>&1; then
    echo "使用 zypper 安装 openssh"
    run zypper --non-interactive install openssh
  elif command -v pacman >/dev/null 2>&1; then
    echo "使用 pacman 安装 openssh"
    run pacman -Sy --noconfirm openssh
  else
    echo "找不到包管理器，无法安装 SFTP" >&2
    exit 1
  fi
  found=""
  for p in /usr/libexec/openssh/sftp-server /usr/lib/openssh/sftp-server /usr/lib/ssh/sftp-server; do
    if [ -x "$p" ]; then
      found=$p
      break
    fi
  done
fi
use=internal-sftp
if [ -n "$found" ]; then
  echo "找到程序: $found"
fi
echo "改用 sshd 内置 internal-sftp，不依赖外部 sftp-server"
enable_subsystem "$use"
exit 0
