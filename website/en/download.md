---
title: Download TermPilot
description: Download TermPilot for Windows x64, macOS (Apple Silicon) and Linux x64. MIT licensed, packages are not code-signed.
---

# Download

Current version **v0.8.6**. All packages are published on [GitHub Releases](https://github.com/xy200303/termpilot/releases/latest); release notes are in the [changelog](/changelog).

Linux x64 packages are built on Ubuntu 22.04 and require `glibc >= 2.35`; Ubuntu 22.04 / 24.04 work.

| Platform | Installer | Portable |
| --- | --- | --- |
| Windows x64 | [TermPilot.Setup.0.8.6.exe](https://github.com/xy200303/termpilot/releases/latest/download/TermPilot.Setup.0.8.6.exe) | [TermPilot-0.8.6-win.zip](https://github.com/xy200303/termpilot/releases/latest/download/TermPilot-0.8.6-win.zip) |
| macOS (Apple Silicon) | [TermPilot-0.8.6-arm64.dmg](https://github.com/xy200303/termpilot/releases/latest/download/TermPilot-0.8.6-arm64.dmg) | [TermPilot-0.8.6-arm64-mac.zip](https://github.com/xy200303/termpilot/releases/latest/download/TermPilot-0.8.6-arm64-mac.zip) |
| Linux x64 | [termpilot_0.8.6_amd64.deb](https://github.com/xy200303/termpilot/releases/latest/download/termpilot_0.8.6_amd64.deb) | [TermPilot-0.8.6.AppImage](https://github.com/xy200303/termpilot/releases/latest/download/TermPilot-0.8.6.AppImage) |

## Installation notes

Packages are **not code-signed**, so the system treats them as from an unknown publisher:

- **Windows**: in the SmartScreen prompt choose “More info → Run anyway”.
- **macOS**: right-click the app in Finder and choose “Open” the first time. Only Apple Silicon builds are published; Intel Macs can [build from source](/guide/quickstart#从源码运行).
- **Linux**: AppImage needs `chmod +x` before running; install the deb with `sudo dpkg -i`.

## Data and backups

Everything stays on your machine; there is no account system. On Windows the database is `%APPDATA%\TermPilot\termpilot.db` (SQLite, secrets encrypted with the system keychain). macOS uses `~/Library/Application Support/TermPilot/`, Linux `~/.config/TermPilot/`.

To back up, copy the whole directory. Passwords are encrypted with the local keychain, so they must be entered again on another machine; connection parameters are unaffected. On Linux without a system keychain the secrets use `local-secrets.key` in the same directory, so copy that file too.
