---
title: TermPilot — terminals and desktops your agent can keep using
description: Local SSH / Telnet / serial terminals and VNC / RDP desktops with a built-in MCP server. Sign in yourself, then let your agent continue on the same session.
---

# TermPilot

**Terminals and remote desktops your assistant can keep using.**

TermPilot is a local desktop app for SSH, Telnet and serial terminals plus VNC and RDP desktops. Credentials stay on your machine. After you sign in, an AI agent can continue on the same unbroken session or the same desktop picture instead of reconnecting on its own.

[Download](/en/download) · [中文首页](/) · [GitHub](https://github.com/xy200303/termpilot)

## What it does

- **Terminals**: SSH, Telnet, serial, local terminals and reverse shells in one tab row. SSH reuses one session for PTY, exec and SFTP.
- **Desktops**: VNC through embedded noVNC, RDP through embedded IronRDP, or the FreeRDP native window. One desktop tab per connection.
- **Agent control**: a built-in MCP server with 35 tools. Agents can run commands on an exec channel, type into the terminal, transfer files with SFTP, and operate desktops by screenshot coordinates.
- **Desktop agent tools**: screenshots come with a 100px coordinate grid by default, so pixel coordinates can be clicked directly. Grid line colours adapt to the local background in OKLCH with APCA contrast checks.
- **Clipboard**: VNC and embedded RDP share the text clipboard with your machine in both directions.
- **Privacy**: no account system, no telemetry. Everything is stored locally in SQLite; secrets are encrypted with the system keychain, or a local AES-256-GCM key when no keychain is available.

## Why a session survives

| | Sign-in | Input midway | Continuing |
| --- | --- | --- | --- |
| Standalone remote terminal | You type the password | Menus and sudo prompts are yours alone | The session stays, the agent cannot enter |
| Agent connects itself | The agent needs the secret | The prompt disappears after the call | Frequent reconnects, mismatched cwd |
| TermPilot | You sign in, secrets stay local | Agent keystrokes land in the current screen | The same terminal, no reconnect |

Before deleting files or running dangerous commands, TermPilot pauses and asks you to confirm in the window.

## Linux

Official Linux x64 packages are built on Ubuntu 22.04 and require `glibc >= 2.35`, so Ubuntu 22.04 / 24.04 work. Without a system keychain the app falls back to a local key file (`userData/local-secrets.key`, mode `0600`).

## Getting started

1. Install the package for your platform from [Downloads](/en/download).
2. Create a connection: SSH, Telnet, serial, VNC or RDP.
3. Optional: enable the MCP server in Settings → MCP server, then copy the agent guide from Settings → Agent access and hand it to your agent.

The app is MIT licensed. Source and releases live on [GitHub](https://github.com/xy200303/termpilot).
