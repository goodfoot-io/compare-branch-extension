---
name: debug
description: This skill should be used when the user asks to "debug the cards assistant", "troubleshoot cards", "find cards logs", "check cards server health", "cards not working", "where are cards logs", "test cards API", asks what a Cards error code means, or reports a failure with Cards packages, the extension, licensing or registration, Claude Code hooks, Codex sessions, worktrees, configuration, authentication, or release tooling.
---

<tools>
cards — Card operations CLI (get, create, list, search, bind, watch, action)
cards-extension — VS Code extension control CLI (editor, notify, issue, workspace, debug, panel)
curl — HTTP health checks against the Cards API server
jq — Parse JSON discovery files and JSON Lines logs
git rev-parse — Resolve workspace root (`--show-toplevel`) and main repo root (`--git-common-dir`)
</tools>

<instructions>

You are in the debug skill for the Cards Assistant. It operates only from CLIs, runtime state, and logs — source code and compiled bundles (`dist/*.js`, `dist/*.cjs`) are out of scope even when present on disk. Never grep/read them, and never dispatch an agent to research source, git history, or tests, to find a root cause; report symptoms from runtime evidence instead. Start with §1 — the reference files assume `WORKSPACE` and the Cards config directory are known.

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
COMMON_DIR=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
[ "$(basename "${COMMON_DIR:-}")" = ".git" ] && MAIN_REPO_ROOT=$(dirname "$COMMON_DIR")
echo "MAIN_REPO_ROOT=${MAIN_REPO_ROOT:-unset}"
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
# Claude API hook log destination. An operator override outranks the computed
# default entirely, so resolve it first — and follow the indirection, since
# CLAUDE_CODE_HOOKS_LOG_ENV_VAR renames the variable the logger reads.
HOOKS_LOG_ENV_VAR=${CLAUDE_CODE_HOOKS_LOG_ENV_VAR:-CLAUDE_CODE_HOOKS_LOG_FILE}
if HOOKS_LOG_OVERRIDE=$(printenv "$HOOKS_LOG_ENV_VAR"); then
  HOOKS_LOG_OVERRIDE_SET=yes
  if [ -n "$HOOKS_LOG_OVERRIDE" ]; then
    echo "HOOKS_LOG_OVERRIDE=$HOOKS_LOG_ENV_VAR -> $HOOKS_LOG_OVERRIDE"
  else
    echo "HOOKS_LOG_OVERRIDE=$HOOKS_LOG_ENV_VAR -> empty (file logging deliberately off)"
  fi
else
  HOOKS_LOG_OVERRIDE_SET=
  echo "HOOKS_LOG_OVERRIDE=none"
fi
# Computed default anchor: the Cards plugin's install scope decides it. Classify
# each settings file into the same three states the bundle does, so a file jq
# cannot read is reported rather than counted as "no install".
classify_claude_settings() {
  [ -f "$1" ] || { echo absent; return 0; }
  jq -e '.enabledPlugins["cards@cards.management"] == true' "$1" >/dev/null 2>&1
  case $? in
    0) echo install ;;
    1) echo no-install ;;
    *) echo unreadable-by-jq ;;  # 5 = parse error (JSONC or malformed), 4 = empty
  esac
}
HOOKS_LOG_ANCHOR=
HOOKS_LOG_UNREADABLE=
if [ -n "${MAIN_REPO_ROOT:-}" ]; then
  PREV_ROOT=
  for root in "$WORKSPACE" "$MAIN_REPO_ROOT"; do
    [ "$root" = "$PREV_ROOT" ] && continue   # deduplicated outside a linked worktree
    PREV_ROOT=$root
    for f in "$root/.claude/settings.local.json" "$root/.claude/settings.json"; do
      case "$(classify_claude_settings "$f")" in
        install) HOOKS_LOG_ANCHOR=$MAIN_REPO_ROOT ;;
        unreadable-by-jq) HOOKS_LOG_UNREADABLE="$HOOKS_LOG_UNREADABLE
  $f" ;;
      esac
      [ -n "$HOOKS_LOG_ANCHOR" ] && break    # the bundle stops at the first install too
    done
    [ -n "$HOOKS_LOG_ANCHOR" ] && break
  done
  # A repo-scope install settles the anchor at MAIN_REPO_ROOT whatever the
  # unreadable files held, so they cannot change the answer — drop them.
  [ -n "$HOOKS_LOG_ANCHOR" ] && HOOKS_LOG_UNREADABLE=
fi
if [ -z "$HOOKS_LOG_ANCHOR" ]; then
  USER_SETTINGS="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/settings.json"
  case "$(classify_claude_settings "$USER_SETTINGS")" in
    install) HOOKS_LOG_ANCHOR=$HOME ;;
    unreadable-by-jq) HOOKS_LOG_UNREADABLE="$HOOKS_LOG_UNREADABLE
  $USER_SETTINGS" ;;
  esac
fi
echo "HOOKS_LOG_ANCHOR=${HOOKS_LOG_ANCHOR:-unset}${HOOKS_LOG_OVERRIDE_SET:+ (computed default — NOT in use, override set)}"
[ -n "$HOOKS_LOG_UNREADABLE" ] && echo "HOOKS_LOG_ANCHOR is INCONCLUSIVE — jq could not parse:$HOOKS_LOG_UNREADABLE"
```

`CARDS_CONFIG_DIR` is the root for discovery, databases, sessions, and worktrees. `WORKSPACE`, `MAIN_REPO_ROOT`, and `HOOKS_LOG_ANCHOR` are referenced by diagnostic commands throughout the reference files; `find-logs.md` names which one each log uses.

`MAIN_REPO_ROOT` is where a repo-scoped `.cards/logs/` tree hangs off. It differs from `WORKSPACE` whenever the session runs in a linked worktree: `--git-common-dir` collapses a worktree back to the repository that owns it, `--show-toplevel` does not. Anchoring a log path on `WORKSPACE` from a worktree targets a path the bundle never wrote — usually nothing at all, which reads as "hooks are dead" when they are fine, and occasionally a stale copy that is worse (see `find-logs.md`). The basename guard mirrors the hook bundle's own — a common dir not named `.git` (bare repo, submodule, separate-git-dir) leaves `MAIN_REPO_ROOT` unset, matching the bundle's fail-closed resolution in `public/packages/agent-hooks/src/shared/default-log-file.ts`.

`HOOKS_LOG_ANCHOR` is where the **Claude API hook log** lands, and it is not always `MAIN_REPO_ROOT`. The bundle anchors on the repository only when that repository carries the install (`claude-local` / `claude-project`); a user-scope install fires in every repository the user opens, so it anchors on `$HOME` instead and leaves unrelated repositories untouched. `unset` means no Cards install is recorded anywhere — the bundle then writes no file at all, which is the expected state, not a fault.

**Do not act on `unset` when the `INCONCLUSIVE` line printed.** Claude settings files are JSONC by design — the extension reads and writes them through `comment-json` so hand-written comments survive plugin injection — and jq 1.7 rejects a `//` comment or trailing comma outright (exit 5). The bundle strips JSONC before parsing, so every file jq refuses is one it may well read perfectly, install and all. jq cannot tell that file apart from genuinely malformed JSON, so §1 names it and declines to conclude rather than reporting an `unset` it has not earned. Resolve it by reading the named file directly: if it carries `enabledPlugins["cards@cards.management"]: true`, the anchor is `MAIN_REPO_ROOT` for a per-repo file or `$HOME` for the user-scope one. The bundle's own view is on stderr — `[cards-hooks] could not read <file>: <reason>; ignoring it when resolving the hook log anchor` means it failed too, and then `unset` is real.

**Read `HOOKS_LOG_OVERRIDE` before `HOOKS_LOG_ANCHOR`.** The two are not alternatives to weigh; the override decides on its own and the anchor is then irrelevant. When a value is present the bundle skips the computed default entirely, so `HOOKS_LOG_ANCHOR` still prints a plausible directory that nothing is writing to — which is why the line marks it *NOT in use* rather than leaving you to notice. An **empty** value is not a missing one: it means logging is deliberately off, and the anchor is equally moot. Only `HOOKS_LOG_OVERRIDE=none` makes `HOOKS_LOG_ANCHOR` the answer. The name is followed rather than assumed because `CLAUDE_CODE_HOOKS_LOG_ENV_VAR` can point the logger at a different variable, and testing `CLAUDE_CODE_HOOKS_LOG_FILE` under that indirection reports "no override" while one is in force.

If the UI exposes only a coarse message, collect the corresponding logs before choosing a remedy.

## 2. Route by Symptom

Load only the file(s) whose symptom matches.

| Symptom | Load | What it covers |
|---------|------|----------------|
| Known error code or exact failure message; logs reveal a typed failure | `references/diagnose-known-failure-states.md` | Error families across internal packages, public packages, and the extension. Identify the owning family, preserve fail-closed boundaries, apply only supported remediation, verify durable state, report at the stated threshold |
| License activation, browser registration, refresh, or integrity failure | `references/diagnose-known-failure-states.md` | Distinguishes parsing, signing-environment, signature, expiry, revocation, device binding, polling, refresh, storage, and clock states |
| Agent won't start, terminal flashes and closes, ENOENT, handler crashes | `references/diagnose-agent-launch.md` | Full spawn chain: VS Code command → handler .mjs → agent CLI → plugin hooks, with guard checks, env vars, per-platform spawn behavior |
| Server not responding, "Server not running", ECONNREFUSED, SQLITE_CORRUPT | `references/diagnose-server-health.md` | Server liveness, discovery file validation, database corruption recovery, safe-vs-risky action markers |
| Hook not firing, SessionStart announcement missing, trust interstitial | `references/diagnose-hooks.md` | Hook registration and execution for Claude + Codex plugins, trust hashes, failure modes |
| Card won't bind, worktree already in use, bind lock held | `references/diagnose-worktree.md` | Worktree creation, binding, outfit, shared hooks provisioning, stale lock cleanup |
| Worktree contents wrong — files missing, unexpected symlinks, `create-worktree` exits 3 | `references/diagnose-worktree.md` | Worktree path policy (`.worktreeignore` omit / `.worktreeinclude` copy), fail-closed config, per-path classification checks |
| Can't find logs, need to see what happened, no log output | `references/find-logs.md` | Every log file produced by the extension + plugins, organized by subsystem, with JSON Lines query recipes |
| Transcript missing, session not streamed, commit attribution broken | `references/find-session-state.md` | Session identity, transcript streaming, commit attribution, route-nudge markers, flush sentinels |
| Card stuck in active state, daemon crashed, cleanup not happening | `references/find-session-state.md` | Ad-hoc session monitoring — the reconciliation sweep that settles stranded cards when the adhoc-cleanup daemon crashes |
| Settings not taking effect, agent behavior wrong, plugin not enabled | `references/inspect-settings.md` | Settings tiers across Claude Code, Codex, and Cards; merge behavior; what the extension writes |
| Plugin not loading, "unknown plugin", stale cached version | `references/inspect-plugin-cache.md` | Plugin cache staging for Claude and Codex, marketplace registration, version management |
| CLI command fails, "command not found", interpreter broken | `references/inspect-cli-tools.md` | CLI inventory with auth, workspace discovery, shell shim patterns, platform-specific behavior |
| Path differences across machines or OS | `references/platform-reference.md` | Cross-platform path tables, IPC mechanisms, Node interpreter selection, shell variable syntax |
| Understanding server internals, writing automation, verifying schema | `references/cards-api-server.md` | Discovery file schema, database settings, liveness states, recovery constants |
| Filing a bug report about the Cards extension | `references/interview-issue-report.md`, then `references/issue-report-guide.md` | Interview process to gather signal before filing; then report sections, writing principles, and body template. File via `cards-extension issue` |
| Symptom unclear, spans multiple layers | `references/diagnose-agent-launch.md` + `references/find-logs.md` | Full spawn chain end-to-end, plus evidence collection at every layer. Add `references/diagnose-server-health.md` if server health is involved |

## 3. Route by Subsystem

When the subsystem is known but the symptom is not:

- **Registration and licensing**: `references/diagnose-known-failure-states.md` (validation, browser claim, refresh, and local integrity) + `references/find-logs.md` (safe diagnostic evidence)
- **Known package error**: `references/diagnose-known-failure-states.md` (ownership, remediation, verification, and escalation) plus the subsystem-specific reference below when one exists
- **Claude Code hooks**: `references/diagnose-hooks.md` (hook execution) + `references/inspect-settings.md` (hook enablement in settings) + `references/inspect-plugin-cache.md` (hook binaries in cache)
- **Codex hooks**: Same, plus `references/platform-reference.md` (Codex home path differences)
- **Session lifecycle**: `references/find-session-state.md` (session state) + `references/diagnose-hooks.md` (which hooks write session state) + `references/diagnose-worktree.md` (session binding)
- **Worktree management**: `references/diagnose-worktree.md` (binding/outfit + path policy) + `references/inspect-cli-tools.md` (create/remove CLIs) + `references/find-session-state.md` (session markers in worktree)
- **Plugin cache**: `references/inspect-plugin-cache.md` (staging) + `references/inspect-settings.md` (registration) + `references/diagnose-agent-launch.md` (consumed at spawn)
- **Server**: `references/diagnose-server-health.md` (troubleshooting) + `references/cards-api-server.md` (schema reference)

## 4. If a Hub Doesn't Cover It

For an unlisted state, work it through `references/diagnose-known-failure-states.md`; do not infer that retrying is safe. Then file a bug report: load `references/interview-issue-report.md` (interview process) and `references/issue-report-guide.md` (report template).

</instructions>
