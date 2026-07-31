# Finding Log Files

Scope: every log file the Cards extension and its plugins produce, by subsystem — path, format, and path resolution.

## Quick Discovery

```bash
# Workspace-scoped logs
find "$(git rev-parse --show-toplevel)/.cards/logs" -name "*.log" -type f 2>/dev/null

# Global logs — resolveGlobalCardsConfigDir()
find ~/.cards -name "*.log" -type f 2>/dev/null

# VS Code extension host logs
find ~/.config/Code/logs ~/Library/Application\ Support/Code/logs -name "Cards.log" -type f 2>/dev/null
```

## Log File Inventory

### VS Code Extension

| Field | Value |
|-------|-------|
| **Path** | Output → Cards channel (View → Output, select "Cards") |
| **Persisted** | `{vscode-userdata}/logs/{date}/window{N}/exthost/goodfoot.cards/Cards.log` |
| **Format** | Plain text (VS Code manages persistence, not the extension) |
| **Child channels** | `Cards.Git`, `Cards.Router`, `Cards.Runtime`, `Cards.Server` |
| **Source** | `packages/vscode-logging/src/logger.ts`::`createLogger()` — `window.createOutputChannel(name, { log: true })` |
| **Note** | The extension does NOT write this channel to disk — VS Code persists it depending on log level and user settings. An in-memory ring buffer (last 500 entries, `logBuffer.ts`) is pre-filled into `cards-extension issue` reports automatically. |

### Claude API Hooks

| Field | Value |
|-------|-------|
| **Path** | `{workspace}/.cards/logs/claude-code-cards-api-hooks.log` |
| **Format** | JSON Lines — one JSON object per line |
| **Env var** | `CARDS_CLAUDE_CODE_HOOKS_LOG_FILE` |
| **Set by** | `ClaudeSettingsService.installPlugin()` writes env key into Claude settings; `ActionDispatcher` also sets it directly in launch env |
| **Source** | `packages/extension/src/services/ClaudeSettingsService.ts`::`cardsApiHooksLogPath()`, `packages/extension/src/runtime/ActionDispatcher.ts` (line ~1356) |
| **JSON schema** | `{timestamp, level, hookType, message, input?, context?, error?}` |

### Claude Runtime Hooks

| Field | Value |
|-------|-------|
| **Path** | `{workspace}/.cards/logs/claude-code-cards-runtime-hooks.log` |
| **Format** | JSON Lines |
| **Env var** | `CLAUDE_CODE_RUNTIME_HOOKS_LOG_FILE` |
| **Set by** | `ActionDispatcher` (line ~1361) |
| **Source** | `packages/extension/src/runtime/ActionDispatcher.ts` (line ~1361) |

### Claude Assistant Hook

| Field | Value |
|-------|-------|
| **Path** | `$CLAUDE_CODE_ASSISTANT_HOOKS_LOG_FILE` — **user-set. Cards does not set it, so no file exists by default.** Set it before launch: the Logger reads it at construction |
| **Format** | JSON Lines |
| **Set by** | Compiled hook binary — `session-start.mjs` line 8: `process.env['CLAUDE_CODE_HOOKS_LOG_ENV_VAR'] = "CLAUDE_CODE_ASSISTANT_HOOKS_LOG_FILE"` |
| **Source** | `public/claude/cards-assistant/hooks/bin/session-start.mjs` (compiled from `public/packages/agent-hooks/src/claude/assistant/session-start.ts`) |

### Codex Hooks

| Field | Value |
|-------|-------|
| **Path** | `$CODEX_HOOKS_LOG_FILE` — **user-set. Cards does not set it, so no file exists by default.** |
| **Format** | JSON Lines |
| **Source** | `@goodfoot/codex-hooks/dist/logger.js` — `const DEFAULT_LOG_ENV_VAR = "CODEX_HOOKS_LOG_FILE"` |

### Handler (Compiled .mjs)

| Field | Value |
|-------|-------|
| **Path** | `{workspace}/.cards/logs/{subsystem}.log` or `$CARDS_HOOKS_LOG_FILE` |
| **Format** | JSON Lines |
| **Source** | `public/packages/sdk/src/config/logger.ts` |
| **Resolution order** | 1. `config.logFilePath` (explicit) — 2. `$CARDS_HOOKS_LOG_FILE` env var — 3. `$CARDS_LOG_DIR/{subsystem}.log` — 4. `{mainRepoRoot}/.cards/logs/{subsystem}.log` (computed via `git rev-parse --path-format=absolute --git-common-dir`) — 5. `null` (file output disabled) |

### Branch Cleanup Watcher

| Field | Value |
|-------|-------|
| **Path** | `{workspace}/.cards/logs/cards-default-configuration-hooks.log` |
| **Format** | JSON Lines |
| **Source** | `public/packages/default-configuration/src/lib/branch-cleanup-watcher.ts` (hardcoded path) |

### Session Stderr

| Field | Value |
|-------|-------|
| **Path** | `~/.cards/sessions/{sanitizedCardId}/stderr.log` |
| **Format** | Plain text |
| **Source** | `packages/extension/src/utils/paths.ts`::`getSessionStderrLogPath()` |

## Reading JSON Lines Logs

```bash
LOG={workspace}/.cards/logs/claude-code-cards-api-hooks.log

# Live tail, filtered — swap the predicate for any field, e.g. .hookType == "SessionStart"
tail -f "$LOG" | jq 'select(.level == "error")'

# Filter + project the fields that matter
jq 'select(.level == "error") | {timestamp, message, error: .error?.message}' "$LOG" | tail -20

# Aggregate (-s slurps the whole file)
jq -s 'group_by(.level) | map({level: .[0].level, count: length})' "$LOG"
```

## Log Format

Every entry carries `timestamp`, `level`, `message`, and optionally `hookType`, `input`, `context`. Entries from `logError` add a nested `error`:

```json
{
  "timestamp": "2026-06-26T14:45:16.374Z",
  "level": "error",
  "hookType": "SessionStart",
  "message": "Failed to spawn claude",
  "input": { "source": "startup" },
  "context": { "sessionId": "abc123" },
  "error": { "name": "Error", "message": "spawn claude ENOENT", "stack": "...", "cause": null }
}
```

## Out of Scope

- VS Code internal log files (managed by VS Code, not the extension) → VS Code documentation
- Agent CLI internal logs → Claude Code / Codex documentation
- Hook execution lifecycle → `diagnose-hooks.md`
- Server startup logs → `diagnose-server-health.md`
- Log path env var configuration → `inspect-settings.md`
