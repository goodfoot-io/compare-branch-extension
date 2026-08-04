# Diagnosing Hook Failures

Scope: hook enablement, registration, execution, and logging for the Claude Code and Codex plugins.

## Quick Diagnostics

```bash
# Verify hook binaries are installed in plugin cache
find ~/.claude/plugins/cache ~/.codex/plugins/cache -name "session-start.mjs" -type f 2>/dev/null

# Check Claude plugin hooks registration
find ~/.claude/plugins/cache/cards.management -name "hooks.json" -type f 2>/dev/null | head -5

# Check Codex plugin hooks registration
find ~/.codex/plugins/cache/local -name "hooks.json" -type f 2>/dev/null | head -5

# $HOOKS_LOG_ANCHOR is set by §1 of SKILL.md: the main repo root for a per-repo
# install, $HOME for a user-scope one.

# Verify SessionStart hook fired
jq 'select(.hookType == "SessionStart")' \
  "$HOOKS_LOG_ANCHOR/.cards/logs/claude-code-cards-api-hooks.log" 2>/dev/null | head -3
```

## Hook Plugins Shipped with Cards

### Claude Code (`public/claude/`)

| Plugin | Hook events |
|--------|-------------|
| `cards` | SessionStart, UserPromptSubmit, SubagentStart, WorktreeCreate, WorktreeRemove, PostToolUse (matchers: `Skill`, `EnterWorktree`) |
| `cards-assistant` | SessionStart |
| `runtime` | SessionStart (+ `compact` matcher), SessionEnd, Stop, SubagentStart, SubagentStop, PostToolUse |

### Codex (`public/codex/`)

| Plugin | Hook events |
|--------|-------------|
| `cards` | UserPromptSubmit, PostToolUse (matcher: `Skill`) |
| `cards-assistant` | SessionStart |
| `runtime` | SessionStart (+ `compact` matcher), SubagentStart, Stop, SubagentStop |

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

Codex requires command hooks to be trusted before execution. Cards pre-computes the hash Codex would compute at discovery and writes it into the profile config before Codex starts, so the hooks appear Trusted with no interstitial.

`writeCodexProfileConfig()` calls `buildPluginHooksState()` (`public/packages/default-configuration/src/lib/codex-hook-trust.ts`). For each command-type hook handler in every enabled plugin's `hooks.json`, it SHA-256 hashes the exact command string (`commandWindows` on Windows, `command` elsewhere), normalizes the hook identity object (recursively sorted keys, compact JSON), and writes `trusted_hash = "sha256:<hex>"` into `cards.config.toml` under `[hooks.state]`. `${PLUGIN_ROOT}` stays literal in the hashed command — Codex substitutes the install path only after hashing, so the hash is install-path independent.

A changed hook binary whose hash wasn't regenerated produces a trust interstitial, never silent execution. `assertHandlerFieldsModeled()` **aborts** the launch if a future Codex version adds a hook field the trust hash doesn't model, rather than seeding a wrong hash.

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

**Recovery**: Re-run the agent launch — the pre-spawn setup stages the plugin cache — **safe**. For Claude background sessions, run `claude plugin install cards@cards.management` to materialize the store.

**Post-fix verification**: `find ~/.claude/plugins/cache -name "session-start.mjs"` returns at least one path.

### Plugin Not Enabled (HIGH probability)

**Evidence**: Hook log has no entries. Settings file doesn't list the plugin in `enabledPlugins` (Claude) or `plugins."name@local".enabled` (Codex).

**Recovery**: Run the agent install flow (setup wizard or manual `ClaudeInstaller.install()`) — **safe**. Load `inspect-settings.md` to verify the settings file contains the correct keys.

### Hook Binary Won't Execute (MEDIUM probability)

**Evidence**: Hook log shows error entry for the hook, or agent log shows non-zero exit code from hook process.

**Cause**: The interpreter at `~/.cards/VSCODE_NODE` is missing or wrong. On Windows: `node.exe` not found (not `Code.exe`). On macOS: path with spaces not double-quoted.

**Recovery**: Verify `cat ~/.cards/VSCODE_NODE` contains a valid interpreter path. Reload the VS Code window to re-persist it — **safe**, reloading rewrites the file.

**Post-fix verification**: `"$(cat ~/.cards/VSCODE_NODE)" -e "console.log('ok')"` succeeds.

### No Log Output (MEDIUM probability)

**Evidence**: Hook seems to work (announcement appears, session state is written) but no log file exists **at the path you looked in**. Check the agent's hook output for a `[cards-hooks]` line on stderr before treating the missing file as the whole story — when the bundle has no log file it says so there.

**Cause**: For Claude Cards hooks, check the anchor before the file. A user-scope install logs to `$HOME/.cards/logs/`, not the repository — looking under the repo finds nothing while the hooks are fine. Beyond that the bundle fails closed and writes nothing at all when: no Claude settings file records the install; `git rev-parse --git-common-dir` in the payload `cwd` yields no `/.git` path (bare repo, non-repo `cwd`, submodule, separate-git-dir, missing `git`); or the operator set `CLAUDE_CODE_HOOKS_LOG_FILE` (or the name `CLAUDE_CODE_HOOKS_LOG_ENV_VAR` redirects to) to an empty value, which means "off". For Codex hooks, `CODEX_HOOKS_LOG_FILE` is not set by Cards — the Logger falls back to no file output.

**Read stderr, it is self-explaining.** With no file to write to, the bundle routes two things there rather than guessing a repository to file them in:

- `[cards-hooks] could not resolve a log anchor: git rev-parse <reason>; hook logging is off` — a broken environment (`git` missing, or timed out after the 3 s budget). Note the asymmetry: git exiting 128, meaning "not a repository", is routine and stays **silent**, so a session outside a checkout produces no file and no message. Absence of this line does not mean the anchor resolved.
- `[cards-hooks] error: <message> (no hook log file resolved)` — an error the hook raised before any handler installed a real path, typically while parsing its payload. At that point the invocation cannot know which session it belongs to, so the record goes to the operator instead of into an arbitrary checkout. A healthy invocation writes nothing here, and the mirror stops as soon as a real path is installed.
- `[cards-hooks] could not read <settings file>: <reason>; ignoring it when resolving the hook log anchor` — a settings file exists but is not parseable. Comments and trailing commas are fine (these files are JSONC), so this means genuinely broken syntax. The anchor falls back to the remaining layers, which is why a repo with a broken `settings.json` but a valid `settings.local.json` still logs normally.

**Recovery**: For Claude, re-run §1 of `SKILL.md`, read `HOOKS_LOG_ANCHOR`, and take the branch that matches — the two states have different causes and only one of them is a fault:

- **`unset`** — no anchor resolved, so the bundle wrote nothing anywhere. Confirm the plugin is enabled in one of the settings files (see `inspect-settings.md`) and that `git rev-parse --path-format=absolute --git-common-dir` prints a path ending in `/.git` from the session's working directory.
- **Set, but `$HOOKS_LOG_ANCHOR/.cards/logs/` holds no log** — the path is *recorded, not created*. `setLogFile()` only stores it; the logger `mkdir`s and opens the file on its first actual write, so a session that has logged nothing yet has no file and is not broken. Decide which it is before changing anything: if the SessionStart announcement appears, hooks are running and you are looking at an empty session rather than a logging failure — go back to the failure modes above and diagnose hook execution. If it does not appear, this is not a log-path problem at all.

In both branches, an empty `CLAUDE_CODE_HOOKS_LOG_FILE` means logging is deliberately off; setting it to an explicit path always wins over the computed default. For Codex: set `CODEX_HOOKS_LOG_FILE` manually. **Risk**: **safe**.

### Codex Trust Interstitial (LOW probability)

**Evidence**: Codex prompts "Review hook" for a Cards hook on first launch.

**Cause**: The trusted hash in the profile config doesn't match the staged hook binary. The binary changed (new version) and the hash wasn't regenerated.

**Recovery**: Re-run the launch to regenerate the cache and profile. `writeCodexProfileConfig()` rebuilds both. **Risk**: **safe** — the user can approve the hook; it is the Cards hook.

**Looks like, but isn't**: A genuinely modified hook binary would also trigger this. Verify the plugin cache content hash matches the bundle.

### SessionStart Log Entry Missing (MEDIUM probability)

**Evidence**: Other hooks fire (Stop, PostToolUse) but SessionStart log entry is absent.

**Cause**: The plugin doesn't ship a SessionStart hook, or it crashed before logging. Check the hook events table above — only `cards`, `cards-assistant`, and `runtime` have SessionStart hooks.

**Recovery**: Check the agent log for hook crash output. Check `hooks.json` for the SessionStart event. **Risk**: **safe**.

## Escalation

File via `cards-extension issue` — load `interview-issue-report.md`, then `issue-report-guide.md`. Escalate if:
- **Hook binary exists and is executable but agent still can't find it**: Include `find ~/.claude/plugins/cache ~/.codex/plugins/cache -name 'hooks.json' -type f` and the relevant `hooks.json` content.
- **Trust interstitial appears on every launch despite unchanged binary**: Include `cat ~/.codex/cards.config.toml` (the profile config with trusted hashes) and `sha256sum` of the staged hook `.mjs` file.
- **Hook log shows repeated crash entries with same error**: Include `tail -100 ${HOOKS_LOG_ANCHOR}/.cards/logs/claude-code-cards-api-hooks.log | jq 'select(.level == "error")'`.
- **No hooks fire for any plugin**: Include the agent settings file showing plugin enablement and the hook log showing zero SessionStart entries.

## Out of Scope

- Hook API reference → `@goodfoot/claude-code-hooks` and `@goodfoot/codex-hooks` SDK docs
- Plugin enablement in settings files → `inspect-settings.md`
- Plugin cache staging → `inspect-plugin-cache.md`
- Session state written by hooks → `find-session-state.md`
- Agent launch (hooks run after agent starts) → `diagnose-agent-launch.md`
