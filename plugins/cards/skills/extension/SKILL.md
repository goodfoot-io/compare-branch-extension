---
name: extension
description: Control VS Code via the cards-extension CLI. Use when opening files, navigating to lines, selecting text, running VS Code commands, sending notifications, managing panels, controlling the debugger, checking editor state, listing workspaces, or using execute-command, editor open, editor select, editor info, workspace list, panel show, debug start, debug stop, debug state, notify, attribution.
---

# Cards Extension CLI

`cards-extension` is a CLI for controlling the VS Code extension host from the terminal. All subcommands communicate with the extension over the Cards server relay; the target workspace is identified by `--workspace`.

## Global Flag

**`--workspace <path>`** — Target VS Code workspace. Defaults to `git rev-parse --show-toplevel` from the current directory. Required when cwd is not inside a git repository or when targeting a different workspace.

## Error Cases (all subcommands)

- **401 Unauthenticated** — The request was not authenticated. Ensure the extension is running and the CLI token is valid.
- **404 Workspace not registered** — The resolved workspace path is not open in any VS Code window. Open the workspace in VS Code and retry.

---

## workspace

### list

List all workspaces currently registered with the extension.

```
cards-extension workspace list
```

Returns a JSON array of objects with exactly two fields per workspace: `path` (absolute filesystem path) and `name` (display name).

```
cards-extension workspace list | jq '.[] | {path, name}'
```

---

## editor

### info

Return the current active editor state.

```
cards-extension editor info [--workspace <path>]
```

Returns: file path, cursor position (line and character, **1-based**), and selection bounds (if text is selected). Returns `null` when no editor is active inside `--workspace`.

### open

Open a file in the editor, optionally at a specific line and character.

```
cards-extension editor open <filePath> [--line <number>] [--character <number>] [--preview] [--focus=false] [--workspace <path>]
```

Flags:
- `--line <number>` — Jump to this line (1-based)
- `--character <number>` — Jump to this column on the line (1-based); requires `--line`
- `--preview` — Open in preview mode (tab closes on next file open)
- `--focus=false` — Open in background without stealing focus

`<filePath>` may be relative (resolved against `--workspace`) or absolute (must lie inside `--workspace`; otherwise the request is rejected). Non-existent files exit non-zero with a "file not found" error.

Example: `cards-extension editor open src/auth.ts --line 42 --character 1`

### select

Select a range of text in the active editor.

```
cards-extension editor select <filePath> --start <line>:<char> --end <line>:<char> [--workspace <path>]
```

Highlights text from `startLine:startChar` to `endLine:endChar` (all **1-based**) and moves the cursor to the selection.

Example: `cards-extension editor select src/index.ts --start 10:1 --end 15:20`

---

## execute-command

Execute a VS Code command by ID and return its result.

```
cards-extension execute-command <commandId> [--save] [--workspace <path>] < args.json
```

Flags:
- `<commandId>` — VS Code command ID (e.g. `editor.action.formatDocument`)
- `--save` — Save all dirty editors **before** executing the command, so the command operates on disk state
- stdin — Optional JSON array of arguments to pass to the command. Skipped when stdin is a TTY (interactive shell).

stdout receives the command's return value serialized as JSON (the bare `result`, no envelope). String arguments shaped like URIs (e.g. `file://…`, `vscode://…`, `https://…`) — including those nested inside arrays and plain objects — are converted to `vscode.Uri` before invocation. Other primitives are forwarded unchanged; pass URIs as strings rather than `Position`/`Range`/`Selection` shapes.

Non-JSON-serializable values are coerced (`functions` → `[Function]`, `symbol` → `[Symbol]`, `bigint` → string, `NaN`/`Infinity` → `null`, `undefined` in arrays → `null`); when coercion occurs a `Warning: lossyCoercion` line is written to stderr.

Note: `<commandId>` runs in the active VS Code window; `--workspace` selects which window's adapter receives the call but does not further scope command execution.

Examples:
```
# Format the active document (no arguments)
cards-extension execute-command editor.action.formatDocument

# Open a file (pass arguments via stdin)
echo '["file:///workspace/src/index.ts"]' | cards-extension execute-command vscode.open
```

---

## notify

Send a notification to the VS Code UI.

```
cards-extension notify --type <type> --title <title> --message <message> --source <source> [--workspace <path>]
```

Flags:
- `--type <type>` — Severity: `error`, `warning`, or `info`
- `--title <title>` — Short title shown in the notification header
- `--message <message>` — Detailed notification body
- `--source <source>` — Identifier used to group and filter notifications (e.g. agent name)

All four flags are required.

Example: `cards-extension notify --type info --title "Build complete" --message "All tests pass" --source ci`

---

## panel

### show

Bring a VS Code panel to the front.

```
cards-extension panel show <panelName> [--workspace <path>]
```

`<panelName>` must be one of: `problems`, `terminal`, `debug`, `output`.

Panels are window-scoped in VS Code; `--workspace` selects which window's adapter receives the call but every panel toggles in that window globally.

Example: `cards-extension panel show problems`

---

## debug

### start

Start a debug session using a launch configuration.

```
cards-extension debug start [--config <name>] [--workspace <path>]
```

Flags:
- `--config <name>` — Launch configuration name from `launch.json`. When omitted, the first available configuration is used.

Exit codes: non-zero with an error when `--config <name>` is specified but no matching configuration exists in `launch.json`, when no `launch.json` is present, or when `--workspace` is not open as a folder in any VS Code window. The debug-config picker is never opened — supply `--config` or create `launch.json` first.

### stop

Stop the active debug session.

```
cards-extension debug stop [--workspace <path>]
```

Returns whether the debugger was successfully stopped. `stopped` is `true` only when an active session belonged to the requested `--workspace`. Returns `false` if no session is active OR if the active session belongs to a different workspace; use `cards-extension debug state` to disambiguate.

### state

Check whether the debugger is currently running.

```
cards-extension debug state [--workspace <path>]
```

Returns: debug state and the name of the active launch configuration (if any). `active` is true only when the running session belongs to the requested `--workspace`.

---

## Security

`cards-extension execute-command` is **RCE-equivalent inside the VS Code extension host** — any caller that can invoke a VS Code command can read files, spawn terminals, and run arbitrary tasks.

- The bearer token in `~/.cards/cards-api.json` is the only access control. The file is created with mode `0600` (owner read/write only); preserve those permissions.
- Do not expose `cards-extension execute-command` to untrusted automation, shared CI runners, or processes running as other users.
- There is **no command-id allowlist**. Every VS Code command is reachable. Allowlisting is a deliberate non-goal of this surface; treat the bearer token as the trust boundary.

---

## attribution

Manage the attribution tree comparison mode. One active comparison per server.

### set

Set the active comparison. Pipe a JSON request to stdin. All shapes accept an optional `"title"` field that overrides the derived ref-based title in the attribution tree view sidebar.

**Branch range** — compare two arbitrary refs:
```
cards-extension attribution set <<'EOF'
{ "baseRef": "main", "compareRef": "feature-branch", "title": "My Comparison" }
EOF
```

**Dynamic worktree** — track a worktree's HEAD live:
```
cards-extension attribution set <<'EOF'
{ "baseRef": "main", "repositoryPath": "/workspace/.worktrees/cards/main-4/1", "title": "Card Changes" }
EOF
```

**Fixed attribution** — show pre-computed SHAs against a ref:
```
cards-extension attribution set <<'EOF'
{ "compareRef": "main", "attributionShas": ["abc123", "def456"], "title": "Squash Attribution" }
EOF
```

### get

Return the current comparison:
```
cards-extension attribution get
```

### clear

Clear the active comparison:
```
cards-extension attribution clear
```
