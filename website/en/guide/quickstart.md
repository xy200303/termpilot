---
title: Quick start
description: Install TermPilot, create a connection and hand the session to an agent.
---

# Quick start

## Install

Download the package for your platform from [Downloads](/en/download). Packages are not code-signed: on Windows choose "More info → Run anyway", on macOS right-click the app and choose "Open".

## Create a connection

1. In the sidebar choose a protocol: SSH, Telnet, Serial, VNC or RDP.
2. Fill in host, port and credentials. SSH supports password or private key, plus a jump host.
3. Double-click the connection (or use the plus button) to open a terminal or desktop tab.
4. For VNC / RDP the desktop appears directly in the tab; VNC uses embedded noVNC, RDP uses embedded IronRDP.

## Hand the session to an agent

1. Open Settings → MCP server, enable it and keep the Bearer token private.
2. Open Settings → Agent access and click "Copy agent guide".
3. Send the guide to your agent (Claude Code, Kimi Code, Codex, Cursor, WorkBuddy, CodeBuddy). The agent registers the MCP server and installs the Skill itself.
4. Tell the agent the target host and what to do. It continues on the session you already signed in to.

## Without MCP

Run the local `termpilot` command: `tools` lists tools, `schema` shows parameters, `call` runs a call. If the window is closed the command starts TermPilot first.

## Build from source

```bash
npm install
npm run dev
```

The session database is `%APPDATA%\TermPilot\termpilot.db` on Windows.
