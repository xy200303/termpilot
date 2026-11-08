<table>
<tr>
<td valign="top">

<img src="resources/icon.svg" width="64" alt="TermPilot" />

# TermPilot

**Terminals and remote desktops your assistant can keep using.**

Local SSH / Telnet / serial terminals plus VNC / RDP desktops. Credentials stay on this machine. After you sign in in the window, your agent continues on the same unbroken session or the same desktop picture.

<a href="https://github.com/xy200303/termpilot/releases/latest"><img alt="release" src="https://img.shields.io/github/v/release/xy200303/termpilot?style=flat-square"></a>
<img alt="Windows" src="https://img.shields.io/badge/-Windows-blue?style=flat-square&logo=windows&logoColor=white">
<img alt="macOS" src="https://img.shields.io/badge/-macOS-black?style=flat-square&logo=apple&logoColor=white">
<img alt="Linux" src="https://img.shields.io/badge/-Linux-yellow?style=flat-square&logo=linux&logoColor=white">
<a href="#license"><img alt="license" src="https://img.shields.io/badge/license-MIT-green?style=flat-square"></a>

</td>
<td width="28%" align="right" valign="middle">

<a href="https://github.com/xy200303/termpilot/releases/latest"><b>Download</b></a>

Windows · macOS · Linux

</td>
</tr>
</table>

English · [中文](README.zh.md)

## Linux compatibility

The official Linux x64 packages are built on Ubuntu 22.04 and require `glibc >= 2.35`, so Ubuntu 22.04 / 24.04 work. The release pipeline scans `node-pty`, serial and SSH crypto native modules and blocks packages that would require a newer GLIBC.

When no system keychain is available (for example a minimal XFCE session), passwords, key passphrases and the MCP token fall back to local AES-256-GCM encryption with `userData/local-secrets.key` (mode `0600`). A system keychain is still preferred when present.

## Terminals and desktops

- **Terminals**: SSH, Telnet, serial, local terminals and reverse shells share one tab row. SSH reuses a single session for PTY, exec and SFTP; Telnet and serial carry a terminal byte stream only.
- **Desktops**: VNC uses embedded noVNC; RDP uses embedded IronRDP by default and can switch to the FreeRDP native window. Each connection keeps one desktop tab.
- **Desktop capabilities**: screenshot grid, pixel-coordinate clicks, character-by-character Chinese and Emoji input, keys, scrolling, batch operations, waiting for a stable picture; VNC / embedded RDP share the text clipboard with this machine in both directions.
- **Agent**: a built-in MCP server with 35 tools covering connections, terminals, exec, SFTP, graphical desktops and app window screenshot / recording. Desktop tools can also read the Linux AT-SPI control tree and live traffic metrics.

## Session model

The table compares where a task breaks, not a feature list.

| | Sign-in | Input needed midway | Continuing |
| --- | --- | --- | --- |
| Standalone remote terminal | The user types the password in the app | Menus, installers and sudo passwords are user-only | The session stays, but the agent cannot enter that window |
| Agent connects itself | The agent must obtain the password or key | The prompt is gone when the call ends | Frequent reconnects with mismatched cwd and running programs |
| TermPilot | The user signs in in the window; secrets stay local | The agent's keystrokes land in the current screen, visible to the user | The same terminal, no reconnect |

Before deleting files or running dangerous commands, TermPilot pauses and waits for the user to confirm in the window.

## Handing over to an agent

Open TermPilot, enable the MCP server in Settings, then open “Agent access” and click “Copy agent guide”. Send the copied guide to Claude Code, Kimi Code, Codex, Cursor, WorkBuddy or CodeBuddy. It contains the MCP endpoint, Bearer token, local client config paths and the Skill location, so the agent can register the MCP server and install the Skill itself.

The guide contains a local token: send it only to trusted local agents, never to repositories, public chats or screenshots. Once connected, just tell the agent the target host and what to do.

When MCP is unavailable, run the local `termpilot` command. If the window is not open, the command starts TermPilot first. `tools` lists tools, `schema` shows parameters, `call` runs a call. Prefer text; take a screenshot only when you need to see the picture. Reuse open terminals instead of opening another one for the same task.

## Agent tools

35 tools in seven families. Calls only accept ids: `conn-` for a connection, `term-` for a terminal, `view-` for a graphical desktop; names and notes only help you recognise them. Connections come in three protocols: SSH (terminal, exec channel, SFTP, concurrent channels), Telnet and serial (terminal byte stream only; `term_exec` and `sftp_*` return a capability message, while the screen tools behave the same for all three).

### Connection management (6)

| Tool | What it does |
| --- | --- |
| `connection_create` | Create and save a connection (SSH / Telnet / serial; passwords and key passphrases encrypted locally), returns a `conn-` id |
| `connection_list` | List saved connections (no passwords) with `protocol` and `capabilities` |
| `connection_update` | Change connection parameters or write a note |
| `connection_delete` | Delete a connection (closes its terminals too) |
| `connection_open` | Open a connection by `conn-` id and start a terminal |
| `connection_close` | Close every terminal and file channel of a connection |

### Local discovery (1)

- `serial_list`: list local serial ports (path, manufacturer, serial number) before creating a serial connection.

### Running commands (2)

- **`term_exec`**: the workhorse for automation. Runs on a separate SSH exec channel without occupying the terminal, can run concurrently and needs no open terminal. Returns structured JSON: `stdout` / `stderr` separately (raw byte streams, no wrapping, no echo), protocol-level `exitCode`, `duration` (seconds), `timedOut`, `truncated`. Reusing a `session` name carries `cd` / `export`; `prelude` injects fixed environment setup before each run (e.g. `source set_env.sh`); `timeout` up to 3600 seconds; `maxBytes` controls truncation.
- **`term_pty`**: types a command into an open shared terminal, so the environment (cwd, sourced variables) keeps accumulating there. Output is what the terminal renders (echoed, wrapped, coloured): good for interaction and human reading, not for parsing.

### Terminal screen and tabs (10, PTY only)

- `term_write`: send keys (arrows, Enter, `ctrl-c`, …) and text — TUIs, menus and installers rely on it
- `term_lines`: read the buffer by line number (to locate screenshot ranges)
- `term_screenshot`: capture the current screen or a line range
- `term_reconnect`: reconnect the same terminal after a drop (id, note and drawn lines are kept)
- `term_list` / `term_update` / `term_close` / `term_open_local`: list terminals, write notes, close tabs, open a local terminal

### File transfer (6, SFTP)

`sftp_list` / `sftp_mkdir` / `sftp_upload` / `sftp_download` / `sftp_rename` / `sftp_remove`. Files are limited to 512MB; keep multi-GB files on the remote machine.

### Graphical desktop (10)

- `desktop_list`: list open desktops and return `viewId`
- `desktop_screenshot`: capture the VNC / embedded RDP canvas or a Windows native client window; a 100px image-coordinate grid is on by default, `grid=false` disables it, `region` captures only an area
- `desktop_click`: click by image pixel coordinates, left/right button and double-click
- `desktop_key`: send arrows, Enter, `ctrl-c` and other combinations
- `desktop_type`: type text (Unicode); for long Chinese text use `method=clipboard` to paste through the remote clipboard
- `desktop_scroll`: scroll the desktop
- `desktop_wait`: wait a fixed time or until the picture is stable
- `desktop_actions`: run clicks, typing, keys, scrolling, waiting and screenshots in order
- `desktop_a11y`: read the Linux AT-SPI control tree over SSH to the same host and click by control path; returns a clear message when accessibility is missing
- `desktop_perf`: read desktop resolution, performance mode, accumulated traffic and live up/down rates

### App UI (2)

- `app_screenshot`: capture the whole app window (sidebar, tab bar, terminal), 100px coordinate grid on by default (`grid=false` disables), saved as PNG and returned with a path
- `app_record`: record the app window, `action` is `start` / `stop`; `fps` defaults to 15, `maxSeconds` to 120 (max 600), stops and saves as WebM automatically

### Recommended usage

| Scenario | Use |
| --- | --- |
| Builds, tests, log collection, output feeding script logic | `term_exec` |
| Interactive work, TUIs, terminal pictures for material | `term_pty` + `term_screenshot` |
| Upload code, download results | `sftp_upload` / `sftp_download` |
| Recovering after a server drop | `term_list` for status + `term_reconnect` |
| Recording a demo | start `app_record`, stop when done |

## Features

- Password or private key sign-in. Multiple accounts per host, grouped by host. Hosts without a public address can connect back to this machine, accepting local connections only.
- Telnet and serial connections besides SSH (serial baud rate, data bits, stop bits and parity configurable). These two carry a terminal byte stream only: no exec channel and no file transfer.
- Two standalone graphical desktop protocols: VNC uses embedded noVNC; RDP uses embedded IronRDP (WASM) by default and can switch to the FreeRDP native window. Embedded desktops share the text clipboard both ways and can disable it in the connection form. Desktop connections have no exec / SFTP and do not support `term_*`.
- Four desktop performance modes: auto, quality, balanced and speed. The gauge button in the top bar shows live up/down traffic, packet rate and accumulated traffic. VNC syncs the clipboard only after connecting; window resizing is debounced; background tabs lower quality; auto mode raises and lowers quality from live traffic.
- Local and remote terminals share one tab row. Right-click to copy, screenshot and paste. With a selection, `Ctrl+C` copies; without one it interrupts. `Ctrl+V` pastes.
- Remote files expand by directory. Double-click a text file to edit; `Ctrl+S` writes it back to the server.
- Capture the current screen, a line range, or stitch scrollback into a long image. Captures show what is already drawn in the window.
- Right-click a connection or terminal and choose “Copy as agent prompt” to hand those facts to an agent.
- App theme and terminal theme are configured separately.

## Download

See [Releases](https://github.com/xy200303/termpilot/releases/latest) for the latest packages. Packages are not code-signed. See the [changelog](CHANGELOG.md) for release notes.

| Platform | Files |
| --- | --- |
| Windows x64 | `TermPilot.Setup.<version>.exe`, `TermPilot-<version>-win.zip` |
| macOS (Apple Silicon) | `TermPilot-<version>-arm64.dmg`, `TermPilot-<version>-arm64-mac.zip` |
| Linux x64 | `TermPilot-<version>.AppImage`, `termpilot_<version>_amd64.deb` |

`<version>` matches the release version.

## Running from source

```bash
npm install
npm run dev
```

The session database lives at `%APPDATA%\TermPilot\termpilot.db`.

```bash
npm run typecheck
npm run build
```

Pushing to `main` runs type checking and the build. Creating a tag that matches `version` in `package.json` (for example `v0.5.8`) makes the workflow package on Windows, macOS and Linux and publish to GitHub Releases. Release notes come from [`.github/release-body.md`](.github/release-body.md). Commit messages, changelog and development conventions are in [AGENT.md](AGENT.md). To build only the current system use `npm run dist:win`, `npm run dist:mac` or `npm run dist:linux`.

## License

Released under the [MIT license](LICENSE). See [CONTRIBUTING.md](CONTRIBUTING.md) before contributing.

VNC rendering uses [noVNC](https://github.com/novnc/noVNC) (MPL 2.0). Packages ship its license plus the licences of the fonts and dependencies used under `resources/licenses/novnc/`.

The embedded RDP client uses [IronRDP](https://github.com/electerm/ironrdp-wasm) (MIT); its licence is in `resources/licenses/ironrdp-wasm/`.
