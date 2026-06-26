# Diagnosing Agent Launch Failures

Scope: the full spawn chain — VS Code command → ProcessLauncher → handler .mjs → agent CLI → plugin hooks. Covers the Cards Assistant (`cards.startCardsAssistant`) and per-card action launches. Agent-retrieval keywords: ENOENT, spawn failed, terminal flashes, handler not found, cards-assistant.mjs, VSCODE_NODE, CODING_AGENT, cross-spawn, ProcessLauncher, getNodePath, resolveCodingAgent.

Source of truth: this file owns the launch env vars and gate chain. Log paths → `find-logs.md`. Plugin enablement → `inspect-settings.md`. Plugin cache → `inspect-plugin-cache.md`.

Completeness: covers all launch-time failure modes in the Cards extension as of version 1.0.x. Excludes post-launch hook failures (see `diagnose-hooks.md`) and server startup failures (see `diagnose-server-health.md`).

Cross-refs: `inspect-settings.md` (plugin enablement, marketplace registration), `inspect-plugin-cache.md` (plugin discovery), `diagnose-hooks.md` (what happens after CLI starts), `find-logs.md` (handler and agent logs), `diagnose-server-health.md` (server prerequisite).

Parent: `../SKILL.md`

## Evidence to Collect

Before diagnosing:
- VS Code Output → Cards channel (last 200 lines)
- `cat ~/.cards/EXTENSION_PATH` (extension install directory)
- `ls -la "$(cat ~/.cards/EXTENSION_PATH)/dist/config/bin/"` (handler binaries)
- `which claude; which codex` (agent CLIs on PATH)
- `env | grep -E 'MARKETPLACE_PATH|EXTENSION_PATH|CODING_AGENT|REPO_ROOT|CARDS_BIN_PATH'` (launch env vars)

## Quick Diagnostics

```bash
# 1. Check VS Code Output → Cards channel for launch log
#    Grep for: "[Cards] Start Cards Assistant" or "[Cards] Execute action requested"

# 2. Verify the compiled handler exists
ls -la "$(cat ~/.cards/EXTENSION_PATH 2>/dev/null)/dist/config/bin/cards-assistant."*.mjs

# 3. Verify the agent CLI is on PATH
which claude 2>/dev/null && echo "claude: found" || echo "claude: NOT FOUND"
which codex 2>/dev/null && echo "codex: found" || echo "codex: NOT FOUND"

# 4. Dump env vars the handler receives
env | grep -E 'MARKETPLACE_PATH|EXTENSION_PATH|CODING_AGENT|REPO_ROOT|CARDS_BIN_PATH'
```

## The Spawn Chain

```
VS Code command (cards.startCardsAssistant or cards.executeAction)
  → Gate checks (agent configured, server running, config exists)
    → Resolve interpreter (getNodePath)
      → Parse command string (ProcessLauncher.parseVscodeNodeCommand)
        → Launch terminal (vscode.window.createTerminal)
          → Handler .mjs reads env vars (extractCardsAssistantInput)
            → resolveCodingAgent → spawnAgentCli (Claude or Codex)
              → Agent CLI loads plugins → SessionStart hook fires
```

## Failure Modes

### Agent Not Configured

**Evidence**: Output → Cards channel shows `"Start Cards Assistant aborted: no defaultCodingAgent configured"`.

**Cause**: `cards.defaultCodingAgent` VS Code setting is empty. **Probability**: high on first install.

**Recovery**: Run the setup wizard (triggered automatically by the command). **Risk**: safe.

**Post-fix verification**: `cards.startCardsAssistant` opens a terminal.

**Looks like, but isn't**: The command may not appear in the command palette at all if the extension didn't activate. Check Output → Cards for activation logs.

### Server Not Running

**Evidence**: `"Start Cards Assistant aborted: server not running"`. `deps.getState()` returns null.

**Cause**: Cards API server hasn't started or crashed. **Probability**: medium — server startup is atomic (all-or-nothing).

**Recovery**: Reload the VS Code window to trigger server recovery. Load `diagnose-server-health.md` for detailed diagnostics.

**Risk**: **safe**. **Escalate if**: server won't start after 3 reloads.

### No Cards Assistant Configured

**Evidence**: `"Start Cards Assistant aborted: no cards assistant configured"`. `settingsLoader.getCardsAssistant()` returns undefined.

**Cause**: `settings.json` missing `cardsAssistant.command`. The `cards-sdk build` step may have been skipped or the config doesn't export a `cardsAssistant` handler.

**Recovery**: Rebuild the configuration: `cards-sdk build -c settings.config.ts -o dist`. Verify `dist/settings.json` contains `"cardsAssistant": {"command": "..."}`.

**Risk**: **safe**.

### Interpreter Resolution Fails

**Evidence**: `"Start Cards Assistant aborted: <message>"`. On win32: no console-subsystem `node.exe` ≥ v22 found on PATH.

**Cause**: `getNodePath()` throws. On Windows, `Code.exe` is a GUI-subsystem image that cannot attach to a ConPTY — a real `node.exe` must be on PATH. On POSIX, `process.execPath` should always work.

**Recovery**: Install Node.js ≥ v22 and add it to PATH. **Risk**: **safe**.

**Post-fix verification**: `cat ~/.cards/VSCODE_NODE` contains a valid path; running it prints Node.js version.

### Handler Binary Missing

**Evidence**: Terminal opens but immediately closes. The handler `.mjs` doesn't exist at the command path in `settings.json`.

**Cause**: The `cards-sdk build` step didn't run, or the compiled handler was deleted from `dist/config/bin/`.

**Recovery**: Rebuild: `cards-sdk build -c settings.config.ts -o dist`. Verify the handler exists: `ls -la <ext>/dist/config/bin/cards-assistant.*.mjs`.

**Risk**: **safe**.

### Agent CLI Not Found (ENOENT)

**Evidence**: Handler log shows `"Failed to spawn claude"` or `"Failed to spawn codex"` with error `spawn claude ENOENT`. The handler's promise settles (doesn't hang) because the fail-closed guard catches the `error` event.

**Cause**: `claude` or `codex` is not on PATH. On win32, the `.cmd` shim may be missing.

**Recovery**: Install the agent CLI. Verify with `which claude`. **Risk**: **safe**.

**Post-fix verification**: `which claude` returns a path. Running `claude --version` succeeds.

### Inline Settings JSON Mangled (win32)

**Evidence**: Claude starts but plugins aren't loaded. The `--settings` argument was corrupted by cmd.exe.

**Cause**: A `shell: true` spawn on win32 concatenates argv unquoted, mangling JSON with `{`/`}`/`"` characters. This was a historical regression — the current code uses `spawnAgentCli` (cross-spawn) which escapes each argument for cmd.exe.

**Recovery**: Verify the code uses `spawnAgentCli`, not `spawn(..., { shell: true })`. The handler at `cards-assistant.ts` line 135 does this correctly.

**Risk**: **safe** (fixed in current code). **Looks like, but isn't**: Plugin cache corruption can look like missing plugins. Load `inspect-plugin-cache.md`.

## Launch Environment Variables

Set by `cardsApiCommands.ts` lines 230-236. **Status: all current**.

| Variable | Value | Purpose |
|----------|-------|---------|
| `MARKETPLACE_PATH` | `{globalStorage}/marketplace` | Stable symlink to bundled marketplace |
| `EXTENSION_PATH` | `{ext}/dist` | Extension install directory |
| `CARDS_BIN_PATH` | `{ext}/dist/bin` | CLI tool directory |
| `CODING_AGENT` | `claude-code-cli` | Agent identifier (current release: Claude only) |
| `REPO_ROOT` | First workspace folder path | Main git repository root |
| `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` | `1` | Enable additional directory CLAUDE.md loading |

## Escalation

File via `cards-extension issue`. Load `references/interview-issue-report.md` (interview process) and `references/issue-report-guide.md` (report template and evidence collection) before filing.

Escalate if any of these are true after all recovery steps:
- **Handler binary is present but won't execute**: Include `ls -la "$(cat ~/.cards/EXTENSION_PATH 2>/dev/null)/dist/config/bin/"` and `cat ~/.cards/VSCODE_NODE`.
- **Agent CLI is on PATH but ENOENT persists**: Include `which claude codex` output and the handler log tail at `${WORKSPACE}/.cards/logs/cards-default-configuration-hooks.log`.
- **Terminal opens but no agent output appears**: Include `ps aux | grep claude` and `tail -50 ${WORKSPACE}/.cards/logs/claude-code-cards-runtime-hooks.log`.
- **Launch succeeds but hook doesn't fire**: Load `diagnose-hooks.md` first. If root cause is not identified, file an issue with the hook log tail.

## Out of Scope

- Server startup failures → `diagnose-server-health.md`
- Hook failures after agent starts → `diagnose-hooks.md`
- Plugin cache problems → `inspect-plugin-cache.md`
- Agent CLI installation → agent-specific documentation
- Post-launch session behavior → `find-session-state.md`
