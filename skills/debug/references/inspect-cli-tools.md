# Inspecting CLI Tools

Scope: CLI tool locations, shell shims, workspace discovery, and authentication for all Cards CLIs. Agent-retrieval keywords: cards CLI, cards-extension, create-worktree, remove-worktree, cards-sdk, cards-dev, VSCODE_NODE, EXTENSION_PATH, ELECTRON_RUN_AS_NODE, shell shim, .cmd, workspace discovery, Bearer token.

Source of truth: this file owns the CLI inventory, shell shim patterns, workspace discovery mechanism, and authentication flow. Server discovery → `cards-api-server.md`. Worktree CLIs → `diagnose-worktree.md`.

Completeness: every CLI tool shipped in `{ext}/dist/bin/` as of version 1.0.x. Excludes `cards-sdk` build internals (see SDK reference docs).

Cross-refs: `cards-api-server.md` (discovery file for auth), `diagnose-worktree.md` (`create-worktree` / `remove-worktree`), `inspect-settings.md` (settings.json consumes CLI-built command strings).

Parent: `../SKILL.md`

## Quick Diagnostics

```bash
# Verify extension path file (written by extension on activation)
cat ~/.cards/EXTENSION_PATH 2>/dev/null || echo "EXTENSION_PATH not written"

# List shipped CLIs
EXTDIR=$(cat ~/.cards/EXTENSION_PATH 2>/dev/null)
ls "$EXTDIR/dist/bin/"*.mjs 2>/dev/null

# Verify interpreter
cat ~/.cards/VSCODE_NODE 2>/dev/null || echo "VSCODE_NODE not written"

# Check interpreter is valid
"$(cat ~/.cards/VSCODE_NODE 2>/dev/null || echo node)" -e "console.log('ok')" 2>/dev/null || echo "interpreter broken"
```

## CLI Inventory

All shipped as `{ext}/dist/bin/{name}` (POSIX shell shim), `{name}.cmd` (Windows batch shim), and `{name}.mjs` (ESM bundle). **Status: all current**.

### `cards`

**Purpose**: read, create, list, search, bind, watch, and execute actions on cards.

**Subcommands**: `<card-id>` (get), `create`, `list`, `search`, `bind`, `watch`, `action`.

**Auth**: Bearer token from `~/.cards/cards-api.json`.

**Workspace discovery**: `git rev-parse --show-toplevel` (3s timeout, returns null outside a repo); `--workspace-path <path>` override.

**Exit behavior**: Uses `requestProcessExit()` — sets `process.exitCode`, starts 5s unref'd backstop — to avoid libuv race on Windows (`0xC0000409`).

### `cards-extension`

**Purpose**: communicate with the VS Code extension to control editors, send notifications, manage attribution, and run debug sessions.

**Subcommands**: `attribution`, `editor`, `execute-command`, `issue`, `notify`, `panel`, `workspace`, `debug`.

**Auth**: Bearer token from `~/.cards/cards-api.json`.

**API routes**: `/api/notifications`, `/editor`, `/editor/open`, `/editor/select`, `/workspaces`, `/execute-command`, `/debug/start`, `/debug/stop`, `/debug/state`, `/panel/show`.

### `issue`

Opens a pre-filled card in the `cards.management` repository from the default browser. Reads a JSON object from stdin with required `title` and `body` fields (both non-empty strings). The body is supplemented with system information (extension version, VS Code version, platform, node version) by `generateCardUrl()` — file paths are redacted from the URL.

```bash
cards-extension issue <<'EOF'
{"title": "Login fails on Ubuntu", "body": "## What happened\n\n..."}
EOF
```

Routes through `POST /execute-command` with `{command: "cards.reportIssue", args: [title, body]}`. Unknown JSON fields are rejected. Missing or empty `title`/`body` produce an error to stderr and exit code 1.

### `create-worktree`

**Purpose**: create git worktrees with monorepo symlink wiring, optionally card-bound.

**Usage**: `create-worktree [--card-id <id>] [--parent-branch <name>] <branch|tag|sha>`

**Exit codes**: 0 success, 2 general failure, 3 `.worktreeinclude` processing failure.

**Auth** (with `--card-id`): Bearer token from `~/.cards/cards-api.json`.

**Without `--card-id`**: Fully offline — no API client, no parent branch, no hooks, no attribution.

**Output**: JSON to stdout — `{branch, worktree, baseSha, copiedFromInclude, reroutedSymlinks}`.

### `remove-worktree`

**Purpose**: remove Cards-managed git worktrees with fail-open branch unregistration.

**Usage**: `remove-worktree <path>`. **Exit codes**: 0 success, 2 failure.

**Behavior**: Reads `{worktree}/.cards/CARD_ID` → if bound, unregisters branch via API → removes worktree via `git worktree remove` or `rm -rf` fallback.

### `cards-sdk`

**Purpose**: build Cards configuration (actions, streams) into deployable settings + handler bundles.

**Usage**: `cards-sdk build -c settings.config.ts -o dist [--loader .ext=type]`

**Shipped as**: npm bin (the only `package.json` bin entry for the SDK).

**Output**: `{outdir}/bin/{name}.{hash}.mjs`, `{outdir}/www/{streamName}/`, `{outdir}/settings.json`.

### `cards-dev`

**Purpose**: Puppeteer-based webview interaction with the Cards extension for automation/testing.

**Usage**: `cards-dev screenshot|list-elements|click|type|scroll|read|wait ...`

**Prerequisites**: VS Code running with `--remote-debugging-port=19222`.

### Daemons

| Daemon | Spawned by | Purpose | Status |
|--------|-----------|---------|--------|
| `stream-sync-watcher` | SessionStart/EnterWorktree hooks | Monitors agent PID, syncs manifest-described transcript files → card repo stream files | current |
| `adhoc-cleanup` | EnterWorktree hook | Monitors agent PID, transitions card to `needs_review` on session end | current |
| Branch cleanup watcher | ActionDispatcher (detached) | Cleans up branches after interactive sessions | current |

## Shell Shim Pattern

### POSIX (`{name}`)

```bash
#!/bin/sh
NODE=$(cat "$HOME/.cards/VSCODE_NODE" 2>/dev/null || echo node)
export ELECTRON_RUN_AS_NODE=1
exec "$NODE" "$(dirname "$0")/{name}.mjs" "$@"
```

### Windows (`{name}.cmd`)

```bat
@echo off
setlocal
set "NODE=node"
if exist "%USERPROFILE%\.cards\VSCODE_NODE" (
  for /f "usebackq delims=" %%I in ("%USERPROFILE%\.cards\VSCODE_NODE") do set "NODE=%%I"
)
set "ELECTRON_RUN_AS_NODE=1"
"%NODE%" "%~dp0{name}.mjs" %*
exit /b %ERRORLEVEL%
```

**Key detail**: `$NODE` is double-quoted because the macOS interpreter path contains spaces (`/Applications/Visual Studio Code.app/.../Code Helper (Plugin)`). `ELECTRON_RUN_AS_NODE=1` is required because the bundled "Node" binary is Electron on POSIX.

## Workspace Discovery

All CLIs use: `git rev-parse --show-toplevel` (3s timeout). Explicit override: `--workspace-path <path>`.

Worktree detection (`cards create` / `cards bind`): compares `git rev-parse --git-dir` against `--git-common-dir` — a linked worktree has them distinct.

## Authentication

All CLIs authenticate via Bearer token from the API discovery file.

**Flow** (`discoverApiInfo()` in `public/packages/sdk/src/client/api-discovery.ts`):
1. Resolve discovery path: `$CARDS_DISCOVERY_PATH` (explicit) or `{resolveGlobalCardsConfigDir()}/cards-api.json`
2. Read and validate JSON: must contain `host`, `port`, `accessToken`, `pid`, `startedAt`
3. Construct `CardsClient` with `baseUrl: http://{host}:{port}` and `accessToken`
4. Token sent as `Authorization: Bearer {accessToken}` header

**Test mode**: `API_TEST_MODE=1` forces mock values (`localhost:9999`, token `test-token`).

## Platform-Specific Behavior

- **Win32 detached spawns**: Resolve `node.exe` directly (not through `.cmd` shim) via `resolveDetachedNodeInterpreter()` to prevent console window popups. `windowsHide: true` on all child processes.
- **Exit strategy**: `requestProcessExit()` sets `process.exitCode` + 5s unref'd backstop.
- **Worktree paths**: Git emits forward-slash paths even on Windows. `path.resolve()` normalizes.
- **`$HOME` on Windows**: POSIX shell shims read `$HOME/.cards/VSCODE_NODE`. On Windows, `$HOME` is typically not set — the `.cmd` shim reads `%USERPROFILE%` instead.

## Out of Scope

- Server discovery file schema → `cards-api-server.md`
- Worktree lifecycle → `diagnose-worktree.md`
- Settings build pipeline (`cards-sdk build` internals) → SDK reference docs
- Agent CLI installation → agent-specific documentation
