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

Returns: workspace path, name, type (`single-folder`, `multi-folder`, `workspace-file`), folder count, and current active editor for each registered workspace.

---

## editor

### info

Return the current active editor state.

```
cards-extension editor info [--workspace <path>]
```

Returns: file path, cursor position (line and character), and selection bounds (if text is selected).

### open

Open a file in the editor, optionally at a specific line and character.

```
cards-extension editor open <filePath> [--line <number>] [--character <number>] [--preview] [--focus=false] [--workspace <path>]
```

Flags:
- `--line <number>` — Jump to this line (1-based)
- `--character <number>` — Jump to this character offset on the line
- `--preview` — Open in preview mode (tab closes on next file open)
- `--focus=false` — Open in background without stealing focus

Exit codes: non-zero with "file not found" error when `<filePath>` does not exist on disk.

Example: `cards-extension editor open src/auth.ts --line 42`

### select

Select a range of text in the active editor.

```
cards-extension editor select <filePath> --start <line>:<char> --end <line>:<char> [--workspace <path>]
```

Highlights text from `startLine:startChar` to `endLine:endChar` and moves the cursor to the selection.

Example: `cards-extension editor select src/index.ts --start 10:0 --end 15:20`

---

## execute-command

Execute a VS Code command by ID and return its result.

```
cards-extension execute-command <commandId> [--save] [--workspace <path>] < args.json
```

Flags:
- `<commandId>` — VS Code command ID (e.g. `editor.action.formatDocument`)
- `--save` — Save all dirty files after the command executes
- stdin — Optional JSON array of arguments to pass to the command

Returns the command's return value serialized as JSON. Non-JSON-serializable values are coerced (`functions` → `[Function]`, etc.); when coercion occurs a warning is written to stderr (`lossyCoercion`).

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

Exit codes: non-zero with an error when `--config <name>` is specified but no matching configuration exists in `launch.json`, or when no `launch.json` is present.

### stop

Stop the active debug session.

```
cards-extension debug stop [--workspace <path>]
```

Returns whether the debugger was successfully stopped.

### state

Check whether the debugger is currently running.

```
cards-extension debug state [--workspace <path>]
```

Returns: debug state and the name of the active launch configuration (if any).

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
