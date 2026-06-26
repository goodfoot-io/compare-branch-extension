# Platform Reference

Scope: cross-platform path differences, IPC mechanisms, Node interpreter selection, and shell variable syntax for Linux, macOS, and Windows. Agent-retrieval keywords: os.homedir, USERPROFILE, APPDATA, XDG, Unix socket, named pipe, junction, ELECTRON_RUN_AS_NODE, VSCODE_NODE, cross-spawn, win32, sun_path.

Source of truth: this file owns all platform-specific path tables and mechanism descriptions. All other reference files link here for platform details rather than restating them.

Completeness: every platform-differentiated behavior in the Cards extension as of version 1.0.x. Excludes platform-specific behavior of agent CLIs (Claude Code, Codex) not touched by Cards.

Cross-refs: every other hub — this is the cross-cutting reference for path computation on all platforms.

Parent: `../SKILL.md`

## Home Directory Resolution

Node's `os.homedir()` is the canonical resolver throughout the codebase.

| Platform | `os.homedir()` reads | Typical value |
|----------|---------------------|---------------|
| Linux | `$HOME` | `/home/user` |
| macOS | `$HOME` | `/Users/user` |
| Windows | `%USERPROFILE%` | `C:\Users\user` |

**Critical**: `os.homedir()` ignores `$HOME` on Windows. Code that sets only `process.env.HOME` works on POSIX but silently reads the real `%USERPROFILE%` on Windows. Tests and demo infrastructure that override home must set BOTH `HOME` and `USERPROFILE`.

**Source**: `packages/cards/git-hooks/test/helpers/home.ts`::`overrideHome()`.

## Path Tables

### Cards Config (`~/.cards/`)

Resolution: `$CARDS_HOME` → `$XDG_DATA_HOME/.cards` → `$XDG_CONFIG_HOME/.cards` → `~/.cards`.

| Platform | Default | Status |
|----------|---------|--------|
| Linux | `~/.cards` (XDG-aware) | current |
| macOS | `~/.cards` | current |
| Windows | `%USERPROFILE%\.cards` | current |

### Claude Code Config

Resolution: `$CLAUDE_CONFIG_DIR` → `~/.claude`.

| Platform | Default | Status |
|----------|---------|--------|
| Linux | `~/.claude` (or `~/.config/claude` if `plugins/` dir exists) | current |
| macOS | `~/.claude` | current |
| Windows | `%USERPROFILE%\.claude` | current |

### Codex Config

Resolution: `$CODEX_HOME` → `~/.codex`.

| Platform | Default | Status |
|----------|---------|--------|
| Linux | `~/.codex` | current |
| macOS | `~/.codex` | current |
| Windows | `%USERPROFILE%\.codex` | current |

### VS Code User Data

| Platform | Path | Status |
|----------|------|--------|
| Linux | `~/.config/Code/` | current |
| macOS | `~/Library/Application Support/Code/` | current |
| Windows | `%APPDATA%\Code\` | current |

### VS Code globalStorage

| Platform | Path | Status |
|----------|------|--------|
| Linux | `~/.config/Code/User/globalStorage/{publisher}.{name}/` | current |
| macOS | `~/Library/Application Support/Code/User/globalStorage/{publisher}.{name}/` | current |
| Windows | `%APPDATA%\Code\User\globalStorage\{publisher}.{name}\` | current |

### VS Code Extension Host Logs

| Platform | Path | Status |
|----------|------|--------|
| Linux | `~/.config/Code/logs/{date}/window{N}/exthost/goodfoot.cards/Cards.log` | current |
| macOS | `~/Library/Application Support/Code/logs/{date}/window{N}/exthost/goodfoot.cards/Cards.log` | current |
| Windows | `%APPDATA%\Code\logs\{date}\window{N}\exthost\goodfoot.cards\Cards.log` | current |

## IPC

### Action Wrapper Sockets

| Platform | Path | Mechanism | Status |
|----------|------|-----------|--------|
| Linux | `~/.cards/a-{pid}-{8hex}.sock` | Unix domain socket | current |
| macOS | `~/.cards/a-{pid}-{8hex}.sock` | Unix domain socket (104-byte `sun_path` limit) | current |
| Windows | `\\.\pipe\cards-a-{pid}-{hash}` | Named pipe | current |

**macOS constraint**: The full `sun_path` (directory + filename) must not exceed 104 bytes. This is why demo infrastructure anchors on `/tmp` (resolved to `/private/tmp`) rather than macOS's long per-user `$TMPDIR` (`/var/folders/.../T`, ~54 chars).

**Cleanup**: On POSIX, stale `.sock` files in `~/.cards/` are cleaned up during ActionDispatcher startup. On Windows, named pipes auto-cleanup on process exit.

**Source**: `packages/extension/src/runtime/ActionDispatcher.ts` (socket creation), `public/packages/sdk/src/config/ipc-endpoint.ts` (IPC endpoint format).

### SDK IPC Endpoints (POSIX)

Path: `os.tmpdir()/{name}.sock`. Same `sun_path` constraint applies. **Status**: current.

## Node Interpreter Selection

| Platform | Interpreter | Why | Status |
|----------|-------------|-----|--------|
| Linux | `process.execPath` (Electron binary) | No PE subsystem concept — Electron works as Node via `ELECTRON_RUN_AS_NODE=1` | current |
| macOS | `process.execPath` (Electron binary) | Same. Path contains spaces: `/Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper (Plugin).app/Contents/MacOS/Code Helper (Plugin)` | current |
| Windows | Console-subsystem `node.exe` from PATH | `Code.exe` is a GUI-subsystem image that cannot attach to a ConPTY or run as a console process | current |

**Source**: `packages/extension/src/utils/nodeRuntime.ts` (line ~67). The resolved interpreter is persisted to `~/.cards/VSCODE_NODE` on every extension activation.

## Shell Variable Syntax

| Context | POSIX | Windows (cmd.exe) | Status |
|---------|-------|-------------------|--------|
| `--settings` command string | `"$VSCODE_NODE" ./bin/handler.mjs` | `"%VSCODE_NODE%" ./bin/handler.mjs` | current |
| Hook command | `"$CLAUDE_PLUGIN_ROOT"/hooks/bin/hook.mjs` | `"%CLAUDE_PLUGIN_ROOT%"\hooks\bin\hook.mjs` | current |
| Interpreter reference | Double-quoted — macOS path has spaces | Double-quoted | current |

**Source**: `public/packages/sdk/src/config/env.ts`::`vscodeNodeCommandRef()`: `'%VSCODE_NODE%'` on win32, `'$VSCODE_NODE'` elsewhere.

## Symlinks

| Platform | Symlink type for directories | Status |
|----------|----------------------------|--------|
| Linux | Native symlink | current |
| macOS | Native symlink | current |
| Windows | Directory junction (`'junction'` type in `fs.symlink()`) | current |

Used for marketplace and codex symlinks in `globalStorage`. The `'junction'` type is silently ignored on POSIX.

**Source**: `packages/extension/src/services/marketplaceSymlink.ts` (line ~60).

## Temp Directories

| Platform | `os.tmpdir()` | Demo anchor | Why different |
|----------|--------------|-------------|---------------|
| Linux | `/tmp` | `/tmp` | Same |
| macOS | `/var/folders/{x}/{y}/T` (~54 chars) | `/tmp` (realpath → `/private/tmp`) | `sun_path` 104-byte limit |
| Windows | `%TEMP%` (expanded to long form via `GetLongPathName`) | `%TEMP%` | No `/tmp` on Windows |

**Source**: `packages/demo-scripter/src/kernel/paths.ts` (line ~54).

## OneDrive (Windows)

`%USERPROFILE%` on Windows may be synced by OneDrive. Files under `%USERPROFILE%\.cards\` can be affected. The extension does not take special precautions against this. **Status**: known limitation.

## Path Normalization

- Worktree paths: `git` emits forward-slash paths even on Windows. All consumers normalize via `path.resolve()`.
- Windows temp paths: expanded from 8.3 short names using `GetLongPathName` Win32 API to match VS Code's canonical `fsPath`.
- `path.posix.join()` used for forward-slash paths embedded in `settings.json` command strings — these are consumed by the wrapper's shell on POSIX and by Node on Windows (which accepts forward slashes).

## Out of Scope

- Agent CLI platform-specific behavior → Claude Code / Codex documentation
- VS Code platform-specific installation paths → VS Code documentation
- Node.js platform-specific APIs → Node.js documentation
