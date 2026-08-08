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
if [ -n "$EXTENSION_PATH" ] && [ -f "$EXTENSION_PATH/dist/build-target.json" ]; then
  echo "--- Build provenance (on-disk artifact) ---"
  jq '.' "$EXTENSION_PATH/dist/build-target.json"
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

### Build provenance — three independent surfaces

Three surfaces report the same five keys — `{target, sha, branch, dirty, buildTime}`, `buildTime` an epoch-millisecond **number** — each answering a different question:

| Surface | States | Source |
|---|---|---|
| **Disk** | the build most recently *installed* | `dist/build-target.json`, printed above |
| **Host** | the build the extension host is *executing* | compile-time `define`s in `bundle.cjs`, via `cards.debug.getBuildInfo` — no file read, so replacing `dist/` under a live host cannot move it |
| **Panel** | the host that *generated* that document | inert `<meta name="cards-build-info">`, stamped from the host's defines at HTML-generation time |

All three derive from one identity sampled at build start, so on a healthy build they are identical field for field and **any** difference is real signal. Two comparisons, each with its own remedy:

- **Host vs disk** — is the window executing what is installed? This is the pair that breaks on the ordinary development loop: installing copies `dist/` into the extension directory, but the running window keeps executing the bundle it loaded at startup, and because the version is bumped per release rather than per build, a reinstall replaces files under a live host without changing the directory. **Only reloading the window moves the host.**
- **Panel vs host** — was this document generated by the host now running? A panel can only be *older* than the host that generated it, never newer, so a difference always means the document predates the current host. Reloading that panel regenerates it from the host's defines and genuinely converges.

A stale host is invisible to the panel-vs-disk pair alone, which is why the host read is not optional and no verdict below reaches an all-clear without it.

**Establish that the installed build has this feature before comparing anything.** Every reader's first contact is against a build that predates it, and no amount of reloading adds a stamp the build never emitted.

| Surface | Pre-feature signature | Feature present |
|---------|----------------------|-----------------|
| Disk | `{"target":"development"}` — `sha`/`branch`/`dirty`/`buildTime` keys **absent** | All five keys present |
| Host | `cards-extension execute-command: command not found: cards.debug.getBuildInfo` on stderr, exit 1 | One line of JSON with all five keys |

Keys **absent** is the pre-feature signature; keys **present and all-`null`** is not — the writer sends `sha`/`branch`/`dirty` to `null` together, and only when git was unavailable at build time. Any *other* non-zero host exit is not a pre-feature signature either: `workspace not registered "<path>" with the active VS Code window` means no host was reached at all, so that surface yields no evidence in either direction.

`read --attribute content` returns the value two levels down inside `{"elements":[{"text":…,"tag":…,"attributes":{…}}]}`, so extract before comparing — diffing the raw `read` output mismatches 100% of the time, including on a perfectly current panel. This block obtains all three surfaces, refuses to compare on any path where a surface was not actually read, and prints its all-clear only when every check passed:

```bash
PANEL_CARD=main-445   # a card whose detail panel is currently open
PROV=$(mktemp -d)
STALE=0

if [ -z "${EXTENSION_PATH:-}" ]; then
  echo "EXTENSION_PATH UNSET — §1 found no EXTENSION_PATH file, so no artifact was located. Nothing was compared."
  echo "Remedy: install the extension (it records the path), then rerun §1."
elif ! jq -e 'has("sha") and has("buildTime")' "$EXTENSION_PATH/dist/build-target.json" >/dev/null 2>&1; then
  echo "NO STAMP ON DISK ($EXTENSION_PATH/dist/build-target.json) — the installed build predates this feature. Nothing was compared."
  echo "Remedy: rebuild and reinstall the extension, then reload the window."
else
  jq -S '{target,sha,branch,dirty,buildTime}' "$EXTENSION_PATH/dist/build-target.json" > "$PROV/disk.json"
  HOST=$(cards-extension execute-command cards.debug.getBuildInfo 2>&1); HOST_STATUS=$?
  if [ "$HOST_STATUS" -ne 0 ]; then
    echo "NO HOST READ — cards-extension exited $HOST_STATUS: $HOST"
    echo "Remedy: 'command not found: cards.debug.getBuildInfo' means the running host predates this feature — reload the window (rebuild and reinstall first if that does not clear it). Any other error means no host was reached; fix that first. Nothing was compared."
  elif ! printf '%s' "$HOST" | jq -e . >/dev/null 2>&1; then
    echo "HOST READOUT IS NOT JSON: $HOST"
    echo "Remedy: treat as no host reached. Nothing was compared."
  else
    printf '%s' "$HOST" | jq -S '{target,sha,branch,dirty,buildTime}' > "$PROV/host.json"
    if diff -u "$PROV/disk.json" "$PROV/host.json" > "$PROV/host-vs-disk.diff"; then
      echo "host matches disk — the running host IS the installed build."
    else
      STALE=1; cat "$PROV/host-vs-disk.diff"
      echo "HOST DIFFERS FROM DISK — the window is not executing the installed build."
      echo "Remedy: reload the window — unless the host is NEWER than disk, which means something else (see below)."
    fi

    PANEL=$(cards-dev read --target detail --card "$PANEL_CARD" \
      --selector 'meta[name="cards-build-info"]' --attribute content 2>&1); PANEL_STATUS=$?
    STAMP=$(printf '%s' "$PANEL" | jq -r '.elements[0].text // empty' 2>/dev/null)
    FAILED=$(cards-dev read --target detail --card "$PANEL_CARD" \
      --selector 'meta[name="cards-html-generation-failed"]' --attribute content 2>/dev/null |
      jq -r '.elements[0].text // empty' 2>/dev/null)

    if [ "$PANEL_STATUS" -ne 0 ]; then
      STALE=1
      echo "NO PANEL READ — cards-dev exited $PANEL_STATUS: $PANEL"
      echo "Remedy: fix the connection. The panel surface was not compared."
    elif [ -z "$STAMP" ]; then
      STALE=1
      echo "PANEL CARRIES NO TAG — cards-dev returned: $PANEL"
      echo "Remedy: reload that panel, then rerun. The panel surface was not compared."
    elif ! printf '%s' "$STAMP" | jq -e . >/dev/null 2>&1; then
      STALE=1
      echo "TAG IS NOT JSON: $STAMP"
      echo "Remedy: the stamp is corrupt at generation time — a real defect, not staleness."
    elif [ -n "$FAILED" ]; then
      STALE=1
      echo "PANEL IS AN ERROR FALLBACK — it carries cards-html-generation-failed."
      echo "Remedy: the defect is in the error text, not staleness: cards-dev read --target detail --card $PANEL_CARD --selector code"
    else
      printf '%s' "$STAMP" | jq -S '{target,sha,branch,dirty,buildTime}' > "$PROV/panel.json"
      if diff -u "$PROV/host.json" "$PROV/panel.json" > "$PROV/panel-vs-host.diff"; then
        echo "panel matches host — this document was generated by the host now running."
      else
        STALE=1; cat "$PROV/panel-vs-host.diff"
        echo "PANEL DIFFERS FROM HOST — this document was generated by an older host."
        echo "Remedy: reload that panel."
      fi
    fi

    [ "$STALE" -eq 0 ] && echo "ALL THREE AGREE — panel, running host, and installed build are one revision."
  fi
fi
rm -rf "$PROV"
```

`ALL THREE AGREE` is the only all-clear, and it is unreachable unless the host was read and matched. The two `matches` lines are scoped claims about one pair, not verdicts on currency:

| Printed verdict | What it means | Remedy |
|---|---|---|
| `ALL THREE AGREE` | host read and matched disk; panel read and matched host | nothing |
| `HOST DIFFERS FROM DISK` | the window is executing a different build than the one installed | reload the window (but see *host newer than disk* below) |
| `PANEL DIFFERS FROM HOST` | this document predates the running host | reload that panel |
| `NO STAMP ON DISK` | build predates the feature (or `dist/` is missing) | rebuild, reinstall, reload the window |
| `EXTENSION_PATH UNSET` | §1 located no installed extension — **not** a pre-feature build | resolve `EXTENSION_PATH` first; nothing was compared |
| `NO HOST READ` | host predates the feature, or no host was reached | reload the window, or fix the connection |
| `NO PANEL READ` | `cards-dev` could not reach a panel — e.g. `cards-dev: fetch failed` when VS Code is not listening on a remote debugging port | fix the connection |
| `PANEL CARRIES NO TAG` | read succeeded and returned `{"elements": []}` | reload that panel, then rerun |
| `PANEL IS AN ERROR FALLBACK` | the panel is the shared error document | read the error text; this is not staleness |

`PANEL CARRIES NO TAG` is the one ambiguous row: it is either a document generated by a pre-feature host (a reload fixes it) or a current document that genuinely lacks the tag — a real defect. Rerunning after the reload tells them apart; `cards-dev read --target detail --card "$PANEL_CARD" --selector meta --attribute name` lists what the document does carry.

**Host newer than disk** is the one difference that is not staleness: a `yarn watch` session is withholding its stamp because some build target has not produced a successful bundle this session, so `build-target.json` still describes the last complete build while `dist/bundle.cjs` has been rebuilt from every save since. Do not reload and do not reinstall — that watch terminal prints `Build incomplete — no successful bundle this session for: <targets>` on every rebuild, and fixing those targets restamps on the next one. (A webview- or CSS-only rebuild does *not* produce this: the watch loop restamps with the identity of the host bundle actually on disk, not a freshly sampled one.)

This CLI's coverage is honest, not complete: it reaches the card-detail panel and the sidebar list only. On a current build both are found from inert `<meta>` markup — `cards-webview-kind` for the list, `cards-panel-card-id` for a detail panel whose `window.__INIT_DATA__` never got set — so neither depends on the panel's own script having executed. On a pre-feature frame carrying no such markup, both fall back to script-dependent DOM probes and a frozen panel is simply not found; so is a card that is not already open, since opening one clicks through the rendered list. The other five panels (editor, create-card, stream, license, setup-wizard) carry the same `cards-build-info` tag by construction but have no CLI readout today, and need a manual CDP read instead. A matching SHA only establishes that the commit was *available* to the build (`git merge-base --is-ancestor <commit> <sha>`), not that its code survived bundling/tree-shaking into the artifact under inspection — for that narrower question, grepping the running bundle for a literal string the feature must emit is still the right tool; this provenance stamp does not replace it. For a stream/HTML-file panel specifically, a CDP read must target the panel's own top-level frame — never the `srcdoc` iframe's separate document, which is a different, unrelated document and will never carry this tag.

A human at the keyboard can read the host surface alone via **Cards: Show Running Build Info** in the command palette; it toasts the same values.

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
