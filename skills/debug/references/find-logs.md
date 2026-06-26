# Finding Log Files

Scope: every log file the Cards extension and its plugins produce, organized by subsystem. Covers how each log path is computed, what format it uses, and when it rotates. Agent-retrieval keywords: log file, CARDS_HOOKS_LOG_FILE, CLAUDE_CODE_ASSISTANT_HOOKS_LOG_FILE, CODEX_HOOKS_LOG_FILE, JSON Lines, hook log, runtime log, stderr.log.

Source of truth: this file owns all log file paths and their resolution chains. Hook execution → `diagnose-hooks.md`. Agent launch → `diagnose-agent-launch.md`. Settings (log path env vars) → `inspect-settings.md`.

Completeness: every log file produced by the Cards extension and its plugins as of version 1.0.x. Excludes VS Code-managed logs (extension host output channel persistence is platform-dependent and VS Code-controlled).

Cross-refs: `diagnose-hooks.md` (hook execution lifecycle), `diagnose-agent-launch.md` (handler spawn logs), `inspect-settings.md` (log path env vars in settings).

Parent: `../SKILL.md`

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
| **Status** | current |
| **Child channels** | `Cards.Git`, `Cards.Router`, `Cards.Runtime`, `Cards.Server` |
| **Source** | `packages/vscode-logging/src/logger.ts`::`createLogger()` — `window.createOutputChannel(name, { log: true })` |
| **Note** | The channel output is NOT written to disk by the extension itself. VS Code may persist it based on log level and user settings. The extension maintains an in-memory ring buffer (last 500 entries via `logBuffer.ts`) that is pre-filled into issue reports opened by `cards-extension issue`. For filing a bug report about log-related problems, use the template in `issue-report-guide.md` — the log buffer contents appear automatically in the issue body. |

### Claude API Hooks

| Field | Value |
|-------|-------|
| **Path** | `{workspace}/.cards/logs/claude-code-cards-api-hooks.log` |
| **Format** | JSON Lines — one JSON object per line |
| **Status** | current |
| **Env var** | `CARDS_CLAUDE_CODE_HOOKS_LOG_FILE` |
| **Set by** | `ClaudeSettingsService.installPlugin()` writes env key into Claude settings; `ActionDispatcher` also sets it directly in launch env |
| **Source** | `packages/extension/src/services/ClaudeSettingsService.ts`::`cardsApiHooksLogPath()`, `packages/extension/src/runtime/ActionDispatcher.ts` (line ~1356) |
| **JSON schema** | `{timestamp, level, hookType, message, input?, context?, error?}` |

### Claude Runtime Hooks

| Field | Value |
|-------|-------|
| **Path** | `{workspace}/.cards/logs/claude-code-cards-runtime-hooks.log` |
| **Format** | JSON Lines |
| **Status** | current |
| **Env var** | `CLAUDE_CODE_RUNTIME_HOOKS_LOG_FILE` |
| **Set by** | `ActionDispatcher` (line ~1361) |
| **Source** | `packages/extension/src/runtime/ActionDispatcher.ts` (line ~1361) |

### Claude Assistant Hook

| Field | Value |
|-------|-------|
| **Path** | `$CLAUDE_CODE_ASSISTANT_HOOKS_LOG_FILE` (env var) |
| **Format** | JSON Lines |
| **Status** | experimental (user-set; Cards does not always set this by default) |
| **Set by** | Compiled hook binary — `session-start.mjs` line 8: `process.env['CLAUDE_CODE_HOOKS_LOG_ENV_VAR'] = "CLAUDE_CODE_ASSISTANT_HOOKS_LOG_FILE"` |
| **Source** | `public/claude/cards-assistant/hooks/bin/session-start.mjs` (compiled from `public/packages/agent-hooks/src/claude/assistant/session-start.ts`) |
| **Note** | Defaults to no file if the env var is unset — the `@goodfoot/claude-code-hooks` Logger reads this env var at construction time. |

### Codex Hooks

| Field | Value |
|-------|-------|
| **Path** | `$CODEX_HOOKS_LOG_FILE` (env var, user-set) |
| **Format** | JSON Lines |
| **Status** | experimental (user-configured only — Cards does NOT set this by default) |
| **Source** | `@goodfoot/codex-hooks/dist/logger.js` — `const DEFAULT_LOG_ENV_VAR = "CODEX_HOOKS_LOG_FILE"` |

### Handler (Compiled .mjs)

| Field | Value |
|-------|-------|
| **Path** | `{workspace}/.cards/logs/{subsystem}.log` or `$CARDS_HOOKS_LOG_FILE` |
| **Format** | JSON Lines |
| **Status** | current |
| **Source** | `public/packages/sdk/src/config/logger.ts` |
| **Resolution order** | 1. `config.logFilePath` (explicit) — 2. `$CARDS_HOOKS_LOG_FILE` env var — 3. `$CARDS_LOG_DIR/{subsystem}.log` — 4. `{mainRepoRoot}/.cards/logs/{subsystem}.log` (computed via `git rev-parse --path-format=absolute --git-common-dir`) — 5. `null` (file output disabled) |

### Branch Cleanup Watcher

| Field | Value |
|-------|-------|
| **Path** | `{workspace}/.cards/logs/cards-default-configuration-hooks.log` |
| **Format** | JSON Lines |
| **Status** | current |
| **Source** | `public/packages/default-configuration/src/lib/branch-cleanup-watcher.ts` (hardcoded path) |

### Session Stderr

| Field | Value |
|-------|-------|
| **Path** | `~/.cards/sessions/{sanitizedCardId}/stderr.log` |
| **Format** | Plain text |
| **Status** | current |
| **Source** | `packages/extension/src/utils/paths.ts`::`getSessionStderrLogPath()` |

## Reading JSON Lines Logs

```bash
# Tail with error filtering
tail -f {workspace}/.cards/logs/claude-code-cards-api-hooks.log | jq 'select(.level == "error")'

# Find all SessionStart events
jq 'select(.hookType == "SessionStart")' {workspace}/.cards/logs/claude-code-cards-api-hooks.log | head -5

# Group by level
jq -s 'group_by(.level) | map({level: .[0].level, count: length})' {workspace}/.cards/logs/claude-code-cards-api-hooks.log

# Most recent N errors with messages
jq 'select(.level == "error") | {timestamp, message, error: .error?.message}' {workspace}/.cards/logs/claude-code-cards-api-hooks.log | tail -20
```

## Log Format

Every JSON Lines log entry conforms to:

```json
{
  "timestamp": "2026-06-26T14:45:16.374Z",
  "level": "info",
  "hookType": "SessionStart",
  "message": "Session started",
  "input": { "source": "startup" },
  "context": { "sessionId": "abc123" }
}
```

Error entries (from `logError`) include a nested `error` object:

```json
{
  "timestamp": "...",
  "level": "error",
  "message": "Failed to spawn claude",
  "error": {
    "name": "Error",
    "message": "spawn claude ENOENT",
    "stack": "...",
    "cause": null
  }
}
```

## Out of Scope

- VS Code internal log files (managed by VS Code, not the extension) → VS Code documentation
- Agent CLI internal logs → Claude Code / Codex documentation
- Hook execution lifecycle → `diagnose-hooks.md`
- Server startup logs → `diagnose-server-health.md`
- Log path env var configuration → `inspect-settings.md`
