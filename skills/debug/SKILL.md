---
name: debug
description: This skill should be used when the user asks to "debug the cards assistant", "troubleshoot cards", "find cards logs", "check cards server health", "cards not working", "where are cards logs", "test cards API", or reports a failure with the Cards extension, Claude Code hooks, or Codex sessions.
---

<tools>
cards — Card operations CLI (get, create, list, search, bind, watch, action)
cards-extension — VS Code extension control CLI (editor, notify, issue, workspace, debug, panel)
curl — HTTP health checks against the Cards API server
jq — Parse JSON discovery files and JSON Lines logs
git rev-parse --show-toplevel — Resolve workspace root
</tools>

<instructions>

You are in the debug skill for the Cards Assistant. This skill covers diagnostics, log discovery, settings inspection, server health, and platform differences for the Cards extension and its Claude Code / Codex plugins. Start with §1 to collect the environment fingerprint — the reference files assume `WORKSPACE` and the cards config directory are known.

## 1. Orient — Collect Environment Fingerprint

Run once before following any diagnostic path:

```bash
echo "HOME=$HOME"
echo "CARDS_HOME=${CARDS_HOME:-unset}"
echo "CLAUDE_CONFIG_DIR=${CLAUDE_CONFIG_DIR:-unset}"
echo "CODEX_HOME=${CODEX_HOME:-unset}"
WORKSPACE=$(git rev-parse --show-toplevel 2>/dev/null)
echo "WORKSPACE=${WORKSPACE:-unset}"
```

The cards config directory resolves as: `$CARDS_HOME` → `$XDG_DATA_HOME/.cards` → `$XDG_CONFIG_HOME/.cards` → `~/.cards`. This is the root for discovery, databases, sessions, and worktrees.

The `WORKSPACE` variable is referenced by diagnostic commands throughout the reference files.

## 2. Reference File Inventory

Each file below is loaded on demand. Load the one matching the symptom first.

| File | Genre | Covers | When to load |
|------|-------|--------|-------------|
| `references/diagnose-agent-launch.md` | Troubleshooting | Full spawn chain: VS Code command → handler .mjs → agent CLI → plugin hooks | Agent won't start, terminal flashes and closes, ENOENT, handler crashes |
| `references/diagnose-server-health.md` | Troubleshooting | Server liveness, discovery file problems, database corruption | Server not responding, "Server not running", ECONNREFUSED, SQLITE_CORRUPT |
| `references/diagnose-hooks.md` | Troubleshooting | Hook registration, execution, and logging for Claude + Codex | Hook not firing, SessionStart announcement missing, trust interstitial |
| `references/diagnose-worktree.md` | Troubleshooting | Worktree creation, binding, outfit, cleanup | Card won't bind, worktree already in use, bind lock held |
| `references/find-logs.md` | Reference | Every log file produced by Cards extension + plugins, organized by subsystem | Can't find logs, need to see what happened, no log output |
| `references/find-session-state.md` | Reference | Session IDs, transcripts, commit attribution, route-nudge markers, flush sentinels, ad-hoc session monitoring, reconciliation sweep, daemon PID tracking | Transcript missing, session not streamed, commit attribution broken, card stuck in active state, daemon crashed |
| `references/inspect-settings.md` | Reference | Settings files across Claude Code, Codex, and Cards — tiers, merge behavior | Settings not taking effect, agent behavior wrong, plugin not enabled |
| `references/inspect-plugin-cache.md` | Reference | Plugin cache staging, version management, marketplace registration | Plugin not loading, "unknown plugin", stale cached version |
| `references/inspect-cli-tools.md` | Reference | CLI locations, shell shims, workspace discovery, authentication | CLI command fails, "command not found", interpreter broken |
| `references/cards-api-server.md` | Reference | Discovery file schema, database settings, liveness states, recovery constants | Understanding server internals, writing automation, verifying schema |
| `references/issue-report-guide.md` | How-to | Structure for filing a well-formed bug report via `cards-extension issue` — report sections, writing principles, template | Filing a bug report about the Cards extension, composing an issue body |
| `references/interview-issue-report.md` | How-to | Interview process to gather signal for a bug report before filing | Before filing an issue, user reports a bug but details are unclear, need to gather evidence |
| `references/platform-reference.md` | Reference | Path differences, IPC, Node interpreter selection for Linux/macOS/Windows | Path differences across machines or OS, cross-platform debugging |

## 3. Route by Symptom

Each entry names the file to load and a preview of what the reader will find there.

Based on symptom:
- **Agent won't start, terminal flashes and closes**: Load `references/diagnose-agent-launch.md` — the full spawn chain from VS Code command through handler execution and CLI launch, with guard checks, env vars, and per-platform spawn behavior.
- **Server not responding, "Server not running" errors**: Load `references/diagnose-server-health.md` — server liveness diagnostics, discovery file validation, database corruption recovery, safe-vs-risky action markers.
- **Hook not firing, SessionStart announcement missing**: Load `references/diagnose-hooks.md` — hook registration and execution for both Claude and Codex plugins, trust hashes, and failure modes.
- **Can't find logs, need to see what happened**: Load `references/find-logs.md` — the complete log file inventory organized by subsystem, with JSON Lines query recipes.
- **Card won't bind, worktree already in use**: Load `references/diagnose-worktree.md` — worktree creation, binding, outfit, shared hooks provisioning, and stale lock cleanup.
- **Plugin not loading, "unknown plugin" errors**: Load `references/inspect-plugin-cache.md` — plugin cache staging for Claude and Codex, marketplace registration, version management.
- **Settings not taking effect, agent behavior wrong**: Load `references/inspect-settings.md` — settings file tiers for Claude, Codex, and Cards, merge behavior, and what the extension writes.
- **Transcript missing, session not streamed**: Load `references/find-session-state.md` — session identity, transcript streaming, commit attribution, flush sentinels, ad-hoc session monitoring.
- **Card stuck in active state, daemon crashed, cleanup not happening**: Load `references/find-session-state.md` — the ad-hoc session monitoring section covers the reconciliation sweep that settles stranded cards when the adhoc-cleanup daemon crashes.
- **CLI command fails, "command not found"**: Load `references/inspect-cli-tools.md` — CLI inventory with auth, workspace discovery, shell shim patterns, and platform-specific behavior.
- **Path differences across machines or OS**: Load `references/platform-reference.md` — cross-platform path tables, IPC mechanisms, Node interpreter selection, shell variable syntax.
- **Need to file a bug report about the Cards extension**: Load `references/interview-issue-report.md` (interview process — gather signal before filing) and `references/issue-report-guide.md` (report structure and template). File via `cards-extension issue` with the body template.
- **Symptom unclear, spans multiple layers**: Load `references/diagnose-agent-launch.md` (covers the full spawn chain end-to-end) and `references/find-logs.md` (covers evidence collection at every layer). If the symptom involves server health, also load `references/diagnose-server-health.md`.

## 4. Route by Subsystem

When the reader knows the subsystem but not the symptom:

Based on subsystem:
- **Claude Code hooks**: `references/diagnose-hooks.md` (hook execution) + `references/inspect-settings.md` (hook enablement in settings) + `references/inspect-plugin-cache.md` (hook binaries in cache)
- **Codex hooks**: Same, plus `references/platform-reference.md` (Codex home path differences)
- **Session lifecycle**: `references/find-session-state.md` (session state) + `references/diagnose-hooks.md` (which hooks write session state) + `references/diagnose-worktree.md` (session binding)
- **Worktree management**: `references/diagnose-worktree.md` (binding/outfit) + `references/inspect-cli-tools.md` (create/remove CLIs) + `references/find-session-state.md` (session markers in worktree)
- **Plugin cache**: `references/inspect-plugin-cache.md` (staging) + `references/inspect-settings.md` (registration) + `references/diagnose-agent-launch.md` (consumed at spawn)
- **Server**: `references/diagnose-server-health.md` (troubleshooting) + `references/cards-api-server.md` (schema reference)

## 5. If a Hub Doesn't Cover It

Trace the defining source function for any unlisted path:

```bash
grep -r "functionName\|PATH_CONSTANT" packages/extension/src/ public/packages/sdk/src/ --include="*.ts" -l
```

If the skill cannot diagnose the problem after exhausting the reference files and source code, collect the evidence from §1 and file a bug report. Load `references/interview-issue-report.md` (interview process) and `references/issue-report-guide.md` (report template). The template includes log collection, environment fingerprint, and discovery file state — all auto-captured from §1 evidence.

</instructions>
