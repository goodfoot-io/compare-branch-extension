---
name: debug
description: This skill should be used when the user asks to "debug the cards assistant", "troubleshoot cards", "find cards logs", "check cards server health", "cards not working", "where are cards logs", "test cards API", asks what a Cards error code means, or reports a failure with Cards packages, the extension, licensing or registration, Claude Code hooks, Codex sessions, worktrees, configuration, authentication, or release tooling.
---

<tools>
cards — Card operations CLI (get, create, list, search, bind, watch, action)
cards-extension — VS Code extension control CLI (editor, notify, issue, workspace, debug, panel)
curl — HTTP health checks against the Cards API server
jq — Parse JSON discovery files and JSON Lines logs
git rev-parse --show-toplevel — Resolve workspace root
</tools>

<instructions>

You are in the debug skill for the Cards Assistant. This skill covers diagnostics, log discovery, settings inspection, server health, known failure states, and platform differences for the Cards extension and its Claude Code / Codex plugins. It operates only from the installed extension, bundled references and CLIs, runtime state, and logs; do not assume source files or source-analysis tools exist. Start with §1 to collect the environment fingerprint — the reference files assume `WORKSPACE` and the Cards config directory are known.

## 1. Orient — Collect Installation Fingerprint

Run once before following any diagnostic path:

```bash
echo "HOME=$HOME"
echo "CARDS_HOME=${CARDS_HOME:-unset}"
echo "XDG_DATA_HOME=${XDG_DATA_HOME:-unset}"
echo "XDG_CONFIG_HOME=${XDG_CONFIG_HOME:-unset}"
echo "CLAUDE_CONFIG_DIR=${CLAUDE_CONFIG_DIR:-unset}"
echo "CODEX_HOME=${CODEX_HOME:-unset}"
WORKSPACE=$(git rev-parse --show-toplevel 2>/dev/null)
echo "WORKSPACE=${WORKSPACE:-unset}"
if [ -n "${CARDS_HOME:-}" ]; then
  CARDS_CONFIG_DIR="$CARDS_HOME"
elif [ -n "${XDG_DATA_HOME:-}" ]; then
  CARDS_CONFIG_DIR="$XDG_DATA_HOME/.cards"
elif [ -n "${XDG_CONFIG_HOME:-}" ]; then
  CARDS_CONFIG_DIR="$XDG_CONFIG_HOME/.cards"
else
  CARDS_CONFIG_DIR="$HOME/.cards"
fi
echo "CARDS_CONFIG_DIR=$CARDS_CONFIG_DIR"
EXTENSION_PATH=$(cat "$CARDS_CONFIG_DIR/EXTENSION_PATH" 2>/dev/null || true)
echo "EXTENSION_PATH=${EXTENSION_PATH:-unset}"
if [ -n "$EXTENSION_PATH" ] && [ -f "$EXTENSION_PATH/package.json" ]; then
  jq '{name,version}' "$EXTENSION_PATH/package.json"
fi
command -v cards >/dev/null && echo "cards=available" || echo "cards=unavailable"
command -v cards-extension >/dev/null && echo "cards-extension=available" || echo "cards-extension=unavailable"
```

The cards config directory resolves as: `$CARDS_HOME` → `$XDG_DATA_HOME/.cards` → `$XDG_CONFIG_HOME/.cards` → `~/.cards`. This is the root for discovery, databases, sessions, and worktrees.

The `WORKSPACE` variable is referenced by diagnostic commands throughout the reference files. Use the bundled references, installed CLIs, extension output channel, persisted logs, discovery/config files, and observable API responses. Do not search for source files or treat their absence as a diagnostic failure.

An installed extension can identify, diagnose, locally remediate, verify, and package a report only when the following evidence is available:

- the exact error code/message, operation, timestamp, and nested cause or diagnostic;
- extension version/build channel, editor/platform version, configured environment, and workspace;
- Cards output-channel or persisted logs and relevant request/flow/session identifiers;
- sanitized discovery, settings, filesystem, Git, and API state required by the matching reference;
- an authorized actor for issuer-, account-, billing-, deployment-, or administrator-owned remedies.

If the UI exposes only a coarse message, collect the corresponding logs before choosing a remedy. If the required evidence or authority is unavailable, stop at a redacted report; do not infer a cause or bypass a fail-closed check.

## 2. Reference File Inventory

Each file below is loaded on demand. Load the one matching the symptom first.

| File | Genre | Covers | When to load |
|------|-------|--------|-------------|
| `references/diagnose-agent-launch.md` | Troubleshooting | Full spawn chain: VS Code command → handler .mjs → agent CLI → plugin hooks | Agent won't start, terminal flashes and closes, ENOENT, handler crashes |
| `references/diagnose-server-health.md` | Troubleshooting | Server liveness, discovery file problems, database corruption | Server not responding, "Server not running", ECONNREFUSED, SQLITE_CORRUPT |
| `references/diagnose-hooks.md` | Troubleshooting | Hook registration, execution, and logging for Claude + Codex | Hook not firing, SessionStart announcement missing, trust interstitial |
| `references/diagnose-worktree.md` | Troubleshooting | Worktree creation, binding, outfit, cleanup | Card won't bind, worktree already in use, bind lock held |
| `references/diagnose-known-failure-states.md` | Troubleshooting | Known operational error families across internal packages, public packages, and the extension; safe remedies, verification, and escalation | Exact error code/message is known, license or registration failed, or logs reveal a typed failure |
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
- **Known error code or exact failure message**: Load `references/diagnose-known-failure-states.md` first — identify the owning failure family, preserve fail-closed boundaries, apply only supported remediation, verify durable state, and report at the stated threshold.
- **License activation, browser registration, refresh, or integrity failure**: Load `references/diagnose-known-failure-states.md` — it distinguishes parsing, signing-environment, signature, expiry, revocation, device binding, polling, refresh, storage, and clock states.
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
- **Registration and licensing**: `references/diagnose-known-failure-states.md` (validation, browser claim, refresh, and local integrity) + `references/find-logs.md` (safe diagnostic evidence)
- **Known package error**: `references/diagnose-known-failure-states.md` (ownership, remediation, verification, and escalation) plus the subsystem-specific reference below when one exists
- **Claude Code hooks**: `references/diagnose-hooks.md` (hook execution) + `references/inspect-settings.md` (hook enablement in settings) + `references/inspect-plugin-cache.md` (hook binaries in cache)
- **Codex hooks**: Same, plus `references/platform-reference.md` (Codex home path differences)
- **Session lifecycle**: `references/find-session-state.md` (session state) + `references/diagnose-hooks.md` (which hooks write session state) + `references/diagnose-worktree.md` (session binding)
- **Worktree management**: `references/diagnose-worktree.md` (binding/outfit) + `references/inspect-cli-tools.md` (create/remove CLIs) + `references/find-session-state.md` (session markers in worktree)
- **Plugin cache**: `references/inspect-plugin-cache.md` (staging) + `references/inspect-settings.md` (registration) + `references/diagnose-agent-launch.md` (consumed at spawn)
- **Server**: `references/diagnose-server-health.md` (troubleshooting) + `references/cards-api-server.md` (schema reference)

## 5. If a Hub Doesn't Cover It

Do not attempt source tracing. For an unlisted state, answer the identification, classification, evidence, remediation authority, verification, and escalation questions in `references/diagnose-known-failure-states.md`; do not infer that retrying is safe. Collect the exact message, nested stack/cause, extension version, environment, operation, reproduction, and safe runtime evidence, then file a bug report. Load `references/interview-issue-report.md` (interview process) and `references/issue-report-guide.md` (report template). The template includes log collection, environment fingerprint, and discovery file state — all auto-captured from §1 evidence.

</instructions>
