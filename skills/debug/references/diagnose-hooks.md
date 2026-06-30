# Diagnosing Hook Failures

Scope: hook enablement, registration, execution, and logging for both Claude Code and Codex plugins. Covers SessionStart, SessionEnd, Stop, SubagentStart, SubagentStop, PostToolUse, PreToolUse. Agent-retrieval keywords: hook not firing, SessionStart missing, hooks.json, plugin not enabled, trusted_hash, trust interstitial, hook binary, CLAUDE_PLUGIN_ROOT, PLUGIN_ROOT, sessionStartHook.

Source of truth: this file owns the hook plugin inventory (which plugins ship which hooks) and the hook command format. Log paths → `find-logs.md`. Plugin enablement → `inspect-settings.md`. Plugin cache → `inspect-plugin-cache.md`.

Completeness: covers all hooks shipped by the Cards extension in both Claude Code and Codex plugins as of version 1.0.x. Excludes hook API reference (see `@goodfoot/claude-code-hooks` and `@goodfoot/codex-hooks` SDK docs).

Cross-refs: `inspect-settings.md` (plugin enablement in settings), `inspect-plugin-cache.md` (how plugins reach the cache), `find-logs.md` (hook log locations), `find-session-state.md` (what hooks persist).

Parent: `../SKILL.md`

## Evidence to Collect

Before diagnosing:
- Hook log file at `{workspace}/.cards/logs/claude-code-cards-api-hooks.log` (or runtime equivalent)
- Plugin cache directory listing: `find ~/.claude/plugins/cache ~/.codex/plugins/cache -name "hooks.json" -type f`
- Settings file for plugin enablement: `jq '.enabledPlugins' .claude/settings.json`
- Agent CLI output for hook-related errors during startup

## Quick Diagnostics

```bash
# Verify hook binaries are installed in plugin cache
find ~/.claude/plugins/cache ~/.codex/plugins/cache -name "session-start.mjs" -type f 2>/dev/null

# Check Claude plugin hooks registration
find ~/.claude/plugins/cache/cards.management -name "hooks.json" -type f 2>/dev/null | head -5

# Check Codex plugin hooks registration
find ~/.codex/plugins/cache/local -name "hooks.json" -type f 2>/dev/null | head -5

# Verify SessionStart hook fired
jq 'select(.hookType == "SessionStart")' \
  "$(git rev-parse --show-toplevel 2>/dev/null)/.cards/logs/claude-code-cards-api-hooks.log" 2>/dev/null | head -3
```

## Hook Plugins Shipped with Cards

### Claude Code (`public/claude/`)

| Plugin | Hook events | Status |
|--------|-------------|--------|
| `cards` | SessionStart, SessionEnd, UserPromptSubmit, EnterWorktree, WorktreeCreate, WorktreeRemove, SubagentStart | current |
| `cards-assistant` | SessionStart | current |
| `runtime` | SessionStart, SessionEnd, Stop, SubagentStart, SubagentStop, PostToolUse, PreToolUse (and compact/clear variants) | current |

### Codex (`public/codex/`)

| Plugin | Hook events | Status |
|--------|-------------|--------|
| `cards` | (currently no hooks — plugin provides skills/agents only) | current |
| `cards-assistant` | SessionStart | current |
| `runtime` | SessionStart, SubagentStart, Stop, SubagentStop | current |

## Hook Command Format

### Claude Code

```
ELECTRON_RUN_AS_NODE=1 "$(cat $HOME/.cards/VSCODE_NODE 2>/dev/null || echo node)" \
  "$CLAUDE_PLUGIN_ROOT"/hooks/bin/<hook>.mjs
```

`$CLAUDE_PLUGIN_ROOT` is set by the Claude Code CLI to the plugin's install directory in the cache. The `$HOME/.cards/VSCODE_NODE` fallback reads the persisted interpreter path from the extension activation file.

### Codex

```
ELECTRON_RUN_AS_NODE=1 "$(cat $HOME/.cards/VSCODE_NODE 2>/dev/null || echo node)" \
  "${PLUGIN_ROOT}/hooks/<hook>.mjs
```

`${PLUGIN_ROOT}` (not `$CLAUDE_PLUGIN_ROOT`) is set by the Codex CLI.

## Hook Input/Output Protocol

**Input**: JSON from stdin. Schema depends on hook event type. Common fields: `session_id`, `transcript_path`, `cwd`, `source` (for SessionStart: `"startup"` | `"resume"` | `"clear"` | `"compact"`).

**Output**: JSON to stdout with `{ continue: boolean, stopReason?: string, systemMessage?: string, decision?: string, reason?: string }`. SessionStart may also include `hookSpecificOutput.additionalContext`.

**Exit codes**: 0 = success, 1 = error, 2 = block.

**Source**: `@goodfoot/claude-code-hooks/dist/runtime.js` (Claude), `@goodfoot/codex-hooks/dist/runtime.js` (Codex).

## Codex Hook Trust

Codex requires all command hooks to be trusted before execution. The Cards extension prevents the trust interstitial by **pre-computing** the exact same hash Codex would compute at discovery time and writing it into the profile config **before Codex starts** — so when Codex discovers the hooks, the hash matches and they appear as Trusted immediately.

The flow: `writeCodexProfileConfig()` calls `buildPluginHooksState()` (`public/packages/default-configuration/src/lib/codex-hook-trust.ts`), which mirrors Codex's internal hash algorithm. For each command-type hook handler in every enabled plugin's `hooks.json`, it SHA-256 hashes the exact command string (respecting `commandWindows` on Windows, `command` elsewhere), normalizes the hook identity object (recursively sorted keys, compact JSON), and writes `trusted_hash = "sha256:<hex>"` into `cards.config.toml` under `[hooks.state]`. The `${PLUGIN_ROOT}` token is left literal in the hashed command — Codex substitutes the actual install path only after hashing, so the trusted hash is install-path independent.

If the hook binary changes (new version) and the hash isn't regenerated, Codex will prompt the user with a trust interstitial — it won't execute silently. The `buildPluginHooksState()` function includes an `assertHandlerFieldsModeled()` guard: if a future Codex version adds a new hook field that the trust hash doesn't model, the launch is **aborted** with a clear error rather than silently seeding a wrong hash.

## The SessionStart Hook (Cards Assistant)

Both Claude and Codex versions are identical in logic:

```typescript
export const ANNOUNCEMENT = `I can help you:
- create or update a card
- start work on an existing card
- use the extension
- send feedback or file a bug report`;

export default sessionStartHook({}, async (input) => {
  if (input.source !== 'startup') {
    return sessionStartOutput({});  // silent on resume, clear, compact
  }
  return sessionStartOutput({ systemMessage: ANNOUNCEMENT });
});
```

**Source**: `public/packages/agent-hooks/src/claude/assistant/session-start.ts` (Claude), `public/packages/agent-hooks/src/codex/assistant/session-start.ts` (Codex).

## Failure Modes

Based on symptom, ranked by probability:

### Hook Binary Not Found (HIGH probability)

**Evidence**: Hook log has no entries at all, or agent log shows "command not found" for the hook `.mjs` path. `find ~/.claude/plugins/cache -name "session-start.mjs"` returns empty.

**Cause**: The plugin wasn't staged into the cache. `populateCodexPluginCache()` didn't run (Codex), or the Claude plugin store wasn't materialized.

**Recovery**: Re-run the agent launch — the pre-spawn setup stages the plugin cache. For Claude background sessions, run `claude plugin install cards@cards.management` to materialize the store.
**Risk**: **safe**.

**Post-fix verification**: `find ~/.claude/plugins/cache -name "session-start.mjs"` returns at least one path.

### Plugin Not Enabled (HIGH probability)

**Evidence**: Hook log has no entries. Settings file doesn't list the plugin in `enabledPlugins` (Claude) or `plugins."name@local".enabled` (Codex).

**Recovery**: Run the agent install flow (setup wizard or manual `ClaudeInstaller.install()`). Load `inspect-settings.md` to verify the settings file contains the correct keys.
**Risk**: **safe**.

### Hook Binary Won't Execute (MEDIUM probability)

**Evidence**: Hook log shows error entry for the hook, or agent log shows non-zero exit code from hook process.

**Cause**: The interpreter at `~/.cards/VSCODE_NODE` is missing or wrong. On Windows: `node.exe` not found (not `Code.exe`). On macOS: path with spaces not double-quoted.

**Recovery**: Verify `cat ~/.cards/VSCODE_NODE` contains a valid interpreter path. Reload the VS Code window to re-persist it.
**Risk**: **safe** (reloading rewrites the file).

**Post-fix verification**: `"$(cat ~/.cards/VSCODE_NODE)" -e "console.log('ok')"` succeeds.

### No Log Output (MEDIUM probability)

**Evidence**: Hook seems to work (announcement appears, session state is written) but no log file exists.

**Cause**: The log env var isn't set. For Claude Cards hooks, `CARDS_CLAUDE_CODE_HOOKS_LOG_FILE` must be in `settings.json` env. For Codex hooks, `CODEX_HOOKS_LOG_FILE` is not set by Cards — the Logger falls back to no file output.

**Recovery**: For Claude: verify `env.CARDS_CLAUDE_CODE_HOOKS_LOG_FILE` in the settings file. For Codex: set `CODEX_HOOKS_LOG_FILE` manually.
**Risk**: **safe**.

### Codex Trust Interstitial (LOW probability)

**Evidence**: Codex prompts "Review hook" for a Cards hook on first launch.

**Cause**: The trusted hash in the profile config doesn't match the staged hook binary. The binary changed (new version) and the hash wasn't regenerated.

**Recovery**: Re-run the launch to regenerate the cache and profile. `writeCodexProfileConfig()` rebuilds both.
**Risk**: **safe** (user can approve the hook; it's the Cards hook, not malicious).

**Looks like, but isn't**: A genuinely modified hook binary would also trigger this. Verify the plugin cache content hash matches the bundle.

### SessionStart Log Entry Missing (MEDIUM probability)

**Evidence**: Other hooks fire (Stop, PostToolUse) but SessionStart log entry is absent.

**Cause**: The plugin doesn't ship a SessionStart hook, or it crashed before logging. Check the hook events table above — only `cards`, `cards-assistant`, and `runtime` have SessionStart hooks.

**Recovery**: Check the agent log for hook crash output. Check `hooks.json` for the SessionStart event.
**Risk**: **safe**.

## Escalation

File via `cards-extension issue`. Load `references/interview-issue-report.md` (interview process) and `references/issue-report-guide.md` (report template and evidence collection) before filing.

Escalate if:
- **Hook binary exists and is executable but agent still can't find it**: Include `find ~/.claude/plugins/cache ~/.codex/plugins/cache -name 'hooks.json' -type f` and the relevant `hooks.json` content.
- **Trust interstitial appears on every launch despite unchanged binary**: Include `cat ~/.codex/cards.config.toml` (the profile config with trusted hashes) and `sha256sum` of the staged hook `.mjs` file.
- **Hook log shows repeated crash entries with same error**: Include `tail -100 ${WORKSPACE}/.cards/logs/claude-code-cards-api-hooks.log | jq 'select(.level == "error")'`.
- **No hooks fire for any plugin**: Include the agent settings file showing plugin enablement and the hook log showing zero SessionStart entries.

## Out of Scope

- Hook API reference → `@goodfoot/claude-code-hooks` and `@goodfoot/codex-hooks` SDK docs
- Plugin enablement in settings files → `inspect-settings.md`
- Plugin cache staging → `inspect-plugin-cache.md`
- Session state written by hooks → `find-session-state.md`
- Agent launch (hooks run after agent starts) → `diagnose-agent-launch.md`
