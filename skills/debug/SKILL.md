---
name: debug
description: This skill should be used when the user asks to "debug the cards assistant", "troubleshoot cards", "find cards logs", "check cards server health", "cards not working", "where are cards logs", "test cards API", asks what a Cards error code means, or reports a failure with Cards packages, the extension, licensing or registration, Claude Code hooks, Codex or Antigravity sessions, worktrees, configuration, authentication, or release tooling.
---
<!-- @cards.management/agent-skills source: public/skills-src/shared/debug/SKILL.md.eta sha256:9d5908a113ad6e2220d535e37afdbf1a8f6f15ce82dd7db318a8eb2ce3968a5f -->

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

Two conditions make all three agree while the artifact under investigation has moved, so the block checks both before it will print an all-clear:

- **A stamp and the artifacts beside it describing different builds.** It happens in both directions. A blocked `yarn watch` session withholds `build-target.json` while every save rewrites `dist/bundle.cjs` beside it; a partial build (`yarn build:testing`, which skips webviews) writes a *fresh* stamp over webview bundles it never built. No surface here is derived from either file — panel and host both carry compile-time `define`s — so all three agree at some build, which is the strongest all-clear this instrument can print handed to the developer whose change is missing. Every build therefore leaves `dist/build-incomplete.json` naming the targets it has no bundle for — the authoritative signal, because its universe is the gate's own target list and it is written by the build itself from what it covered, rather than inferred afterwards. The block also compares mtimes as a backstop — a `stat`, not a read, so artifact contents stay out of scope: **the stamp should be the newest thing in its directory.** Both the installed `dist/` and the workspace's `packages/extension/dist` are checked — before anything else and independently of each other, since the marker is readable with no stamp, no host and no `EXTENSION_PATH`, and a session blocked before it ever stamped leaves exactly that state. A directory that is skipped says so (`NOT CHECKED`) instead of counting as clean, and the block names the directories it examined: a watch session in a *different* checkout marks a `dist/` nothing here reads.
- **More than one open window.** `cards-extension` addresses VS Code by workspace path; `cards-dev` addresses it by whoever holds the debug port. With two windows open those are different windows, each stamping its panels from its own host, and the difference would be reported as a stale panel that reloading can never clear. `cards-dev` refuses to operate at all when it sees more than one workbench page (`MULTIPLE VS CODE WINDOWS`), and on the path where it does not refuse it prints on stderr what it counted and over what universe. **That universe is the debug port only.** A VS Code instance started without `--remote-debugging-port=19222` contributes no page for the guard to count while remaining fully addressable by `cards-extension`'s workspace-path route, so a clean guard is a *necessary* condition for attributing the panel and the host to one process, never a sufficient one. When more than one VS Code instance may be running on this machine, confirm that yourself before believing a `PANEL DIFFERS FROM HOST` verdict; the guard cannot. Never set `CARDS_DEV_ALLOW_MULTIPLE_WINDOWS=1` for this check — it waives even the part of the attribution the guard can establish.

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
INCONCLUSIVE=0

# Refuse an all-clear while a build directory carries an incomplete-build marker
# or holds an artifact newer than the stamp describing it. Returns 0 when
# incoherent, 2 when nothing could be concluded (no stamp to compare against, or
# mtimes that cannot be ordered), 1 when clean. The marker is read; only the
# artifacts are dated. Only regular files DIRECTLY in $dir are compared — see the
# coverage note below the block for why subdirectories are excluded.
report_incoherent_build() {
  dir=$1; label=$2; stamp="$dir/build-target.json"; marker="$dir/build-incomplete.json"
  # The marker is examined first, independently of the stamp, and judged by its
  # CONTENT — never by its mtime against the stamp. A session that is blocked
  # before it has ever stamped leaves a marker with no build-target.json beside
  # it, and gating on the stamp made that directory return "clean". Ordering the
  # two by mtime failed the same way from the other side: the stamp write and the
  # re-mark that follows it land in one filesystem tick, `-nt` is false on a tie,
  # and the marker read as superseded. A marker only ever exists while some
  # target has no successful bundle, so its presence is the verdict; only a
  # successful build removes it, and nothing here needs to date it.
  if [ -f "$marker" ]; then
    marker_pending=$(jq -r 'if (.pending | type) == "array" and (.pending | length) > 0 then (.pending | join(", ")) else empty end' "$marker" 2>/dev/null)
    marker_since=$(jq -r 'if (.since | type) == "number" then (.since | tostring) else empty end' "$marker" 2>/dev/null)
    # The remedy is read out of the marker, not written here: the two states that
    # produce one call for opposite actions. A build that FAILED leaves errors in
    # a terminal to fix; a build that never attempted those targets (a test build
    # refreshes the extension bundle alone) leaves nothing to fix and no terminal
    # to look at, and needs a full build instead. Only the producer knows which.
    marker_note=$(jq -r 'if (.note | type) == "string" and (.note | length) > 0 then .note else empty end' "$marker" 2>/dev/null)
    # The reason decides the DIAGNOSIS as well as the remedy, because the two
    # states have opposite topologies. Withheld: the stamp is the last build that
    # completed and the pending target's bundle is the one from it — what the
    # stamp fails to describe is everything that has rebuilt since. Partial: the
    # stamp is fresh and the pending targets are the stale ones. One sentence
    # cannot be true of both, and the wrong one names the wrong artifact.
    marker_reason=$(jq -r 'if .reason == "withheld" or .reason == "partial" then .reason else empty end' "$marker" 2>/dev/null)
    if [ -z "$marker_pending" ] || [ -z "$marker_since" ] || [ -z "$marker_note" ] || [ -z "$marker_reason" ]; then
      echo "BUILD MARKER UNREADABLE — $label ($dir) holds a build-incomplete.json that does not carry a non-empty .pending array, a numeric .since, a .reason of \"withheld\" or \"partial\", and a non-empty .note. Its directory cannot be called clean."
      echo "Remedy: read $marker by hand. Only a build writes this file and only a build covering every target removes it, so a shape no reader recognises means a truncated write, something else writing that name, or no jq on PATH — all of which leave the build state unknown."
      return 0
    fi
    if [ "$marker_reason" = withheld ]; then
      echo "BUILD INCOMPLETE — $label ($dir) has produced no successful bundle this session for: $marker_pending (since $marker_since). Any build-target.json beside it describes the last build that COMPLETED; the artifacts that have rebuilt since are the ones it does not describe."
    else
      echo "BUILD INCOMPLETE — $label ($dir) has no bundle from the build it was stamped with for: $marker_pending (since $marker_since). Those targets hold whatever an earlier build left beside a stamp that does not describe them."
    fi
    [ -f "$stamp" ] || echo "  (there is no build-target.json beside it: this session has never completed a build, so there is no identity to compare anything against.)"
    echo "Remedy: $marker_note"
    return 0
  fi
  if [ ! -f "$stamp" ]; then
    echo "NOT CHECKED — $label ($dir) holds no build-target.json and no marker, so nothing in it was examined."
    return 2
  fi
  newer=; tied=; compared=0
  for f in "$dir"/*; do
    [ -f "$f" ] || continue
    case "${f##*/}" in build-target.json|build-incomplete.json) continue ;; esac
    compared=$((compared + 1))
    if [ "$f" -nt "$stamp" ]; then newer="${f##*/}"; break; fi
    [ "$stamp" -nt "$f" ] || tied="${f##*/}"
  done
  if [ -n "$newer" ]; then
    echo "STAMP OLDER THAN ARTIFACT — $label ($dir): $newer was written after build-target.json, so the stamp does not describe the artifacts beside it."
    echo "Remedy: a build wrote an artifact without stamping — check the build terminal for errors, then rebuild. Every surface below reports the stamped (older) identity."
    return 0
  fi
  if [ "$compared" -eq 0 ]; then
    echo "COULD NOT ORDER — $label ($dir) holds a stamp and no other top-level artifact, so nothing was compared against it."
    return 2
  fi
  if [ -n "$tied" ]; then
    echo "COULD NOT ORDER — $label ($dir): $tied carries the same mtime as build-target.json (this filesystem ticks at ~1ms and a build can write both inside one tick), so their order is unknown. Not a clean result."
    return 2
  fi
  echo "stamp is the newest of $compared top-level artifacts in $label ($dir)."
  return 1
}

# Build-directory coherence runs first and unconditionally. A marker needs no
# stamp, no EXTENSION_PATH and no host to be readable, so gating it behind any
# of those hid a blocked session on exactly the paths where one is likeliest —
# a fresh checkout that has never stamped, or a pre-feature installed build.
EXAMINED=
if [ -z "${EXTENSION_PATH:-}" ]; then
  INCONCLUSIVE=1
  echo "NOT CHECKED — EXTENSION_PATH is unset, so no installed build directory was examined."
else
  EXAMINED="$EXTENSION_PATH/dist"
  report_incoherent_build "$EXTENSION_PATH/dist" "installed build"
  case $? in 0) STALE=1 ;; 2) INCONCLUSIVE=1 ;; esac
fi
WS_DIST="${WORKSPACE:-}/packages/extension/dist"
if [ -z "${WORKSPACE:-}" ]; then
  INCONCLUSIVE=1
  echo "NOT CHECKED — WORKSPACE is unset, so no workspace build directory was examined."
  echo "Remedy: resolve WORKSPACE per §1 and rerun. A yarn watch session stamps and marks the WORKSPACE dist, not the installed one, so this is the directory most likely to be mid-failure."
elif [ "$WS_DIST" != "${EXTENSION_PATH:-}/dist" ]; then
  EXAMINED="${EXAMINED:+$EXAMINED, }$WS_DIST"
  report_incoherent_build "$WS_DIST" "workspace build"
  case $? in 0) STALE=1 ;; 2) INCONCLUSIVE=1 ;; esac
fi
echo "build directories examined: ${EXAMINED:-none}. A yarn watch session running in any OTHER checkout — the worktree-per-card norm — marks that checkout's dist, which nothing here reads; check it by hand at <that-checkout>/packages/extension/dist/build-incomplete.json."

if [ -z "${EXTENSION_PATH:-}" ]; then
  echo "EXTENSION_PATH UNSET — §1 found no EXTENSION_PATH file, so no installed artifact was located. No surface was compared."
  echo "Remedy: install the extension (it records the path), then rerun §1."
elif ! jq -e 'has("sha") and has("buildTime")' "$EXTENSION_PATH/dist/build-target.json" >/dev/null 2>&1; then
  echo "NO STAMP ON DISK ($EXTENSION_PATH/dist/build-target.json) — the installed build predates this feature. No surface was compared."
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

    # stderr is captured separately, not folded into stdout: cards-dev prints
    # its window-attribution scope there on every successful connection, and
    # merging it would break the jq parse of the JSON on stdout.
    PANEL=$(cards-dev read --target detail --card "$PANEL_CARD" \
      --selector 'meta[name="cards-build-info"]' --attribute content 2>"$PROV/panel.err"); PANEL_STATUS=$?
    PANEL_ERR=$(cat "$PROV/panel.err")
    STAMP=$(printf '%s' "$PANEL" | jq -r '.elements[0].text // empty' 2>/dev/null)
    FAILED=$(cards-dev read --target detail --card "$PANEL_CARD" \
      --selector 'meta[name="cards-html-generation-failed"]' --attribute content 2>/dev/null |
      jq -r '.elements[0].text // empty' 2>/dev/null)

    if printf '%s' "$PANEL_ERR" | grep -q 'MULTIPLE VS CODE WINDOWS'; then
      STALE=1
      echo "MORE THAN ONE WINDOW — $PANEL_ERR"
      echo "Remedy: close all but one VS Code window and rerun. The host was read by workspace path and the panel by debug port; with two windows open those are different windows, and any difference between them would look like a stale panel no reload could clear. The panel surface was not compared."
    elif [ "$PANEL_STATUS" -ne 0 ]; then
      STALE=1
      echo "NO PANEL READ — cards-dev exited $PANEL_STATUS: $PANEL_ERR"
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
        echo "PANEL DIFFERS FROM HOST — this document was generated by an older host, IF both reads reached the same VS Code instance."
        echo "cards-dev reported its attribution scope: $PANEL_ERR"
        echo "Remedy: reload that panel. If a second VS Code instance is running WITHOUT --remote-debugging-port=19222, establish that first — it is invisible to the window guard and still reachable by cards-extension's workspace-path route, and two instances compared as one produce this exact verdict with a remedy that never converges."
      fi
    fi

    if [ "$STALE" -eq 0 ] && [ "$INCONCLUSIVE" -eq 0 ]; then
      echo "ALL THREE AGREE — panel, running host, and installed build are one revision, read from the one window visible on the debug port, no EXAMINED build directory is mid-failure, and every examined stamp is the newest top-level file beside it."
    elif [ "$STALE" -eq 0 ]; then
      echo "ALL THREE AGREE, COVERAGE INCOMPLETE — panel, running host, and installed build are one revision and no examined build directory is mid-failure; but a NOT CHECKED or COULD NOT ORDER line printed above, so this all-clear does NOT cover every build directory or whether an artifact postdates its stamp."
    fi
  fi
fi
rm -rf "$PROV"
```

**The mtime backstop is narrower than the marker, and knowing where it stops is part of using it.** A filesystem timestamp is standing in for build identity, which buys three limits worth stating outright:

- **Coverage.** The gate's universe is `buildTargetKeys(WEBVIEW_CONFIGS)` in [completion-gate.js](./packages/extension/scripts/build/completion-gate.js) — the extension plus six webviews. The loop compares every regular file directly in the build directory, which reaches six of those seven: `bundle.cjs` and the five webview bundles that land at the top level. The seventh, `webview:cardsDetail`, writes into `dist/webview/cards-detail/` and is **not** compared, and neither is anything else in a subdirectory. That is a measured boundary, not laziness: in an installed copy the whole `dist/webview/**` and `dist/marketplace/**` trees postdate `build-target.json` by fractions of a second purely because a vsix extracts in archive order, so recursing would fire on every healthy installation. Top-level-only is the widest scan that is clean on both a workspace `dist/` and an installed one. The marker, not the mtime, is what covers all seven.
- **Direction.** It sees an artifact moving ahead of a stalled stamp. It cannot see a stamp moving ahead of a stalled artifact, which is the *more* common half: a failed build emits nothing and a skipped target emits nothing, so the artifact stops changing while a later build restamps around it and becomes the newest file in the directory. Both halves of that direction are the marker's job — the gate registers every build outcome, not only the startup pass, and a gateless build declares which targets it covered instead of inferring completeness from having not thrown.
- **Resolution.** mtime ticks at about a millisecond here and a small target can write its bundle and its stamp inside one tick, so equal mtimes are a state a healthy build reaches. `-nt` reports a tie as "not newer", which would silently read as clean, so the loop tests both directions and calls a tie `COULD NOT ORDER` — reported as an absence of evidence, in the same register as the `Nothing was compared` branches, and it downgrades the all-clear rather than raising an alarm. (The atomic stamp write is not a confound: `rename` carries the temp file's mtime through unchanged, so the stamp is dated when its content was written.) **The marker is exempt from all of this**: it is read, not dated. It was once ordered against the stamp too, and a tie there was the one place a tie read as *clean* rather than as an absence of evidence — a stamp and the re-mark that followed it inside one tick made a blocked session print `ALL THREE AGREE`.

`ALL THREE AGREE` is the only unqualified all-clear, and it is unreachable unless the host was read and matched, the panel came from the only window visible on the debug port, and every examined build directory's stamp was ordered and came out newest. Its scope is the two directories the block names on its `build directories examined:` line and the instances the debug port can see — a watch session in another checkout, or a second VS Code instance started without the debug port, is outside it in every verdict below. The two `matches` lines are scoped claims about one pair, not verdicts on currency:

| Printed verdict | What it means | Remedy |
|---|---|---|
| `ALL THREE AGREE` | host read and matched disk; panel read and matched host; no examined build directory is mid-failure; every examined stamp ordered newest | nothing |
| `ALL THREE AGREE, COVERAGE INCOMPLETE` | the same, except a directory went unexamined or its mtimes could not be ordered — the surfaces agree, the artifact question is open | check the unnamed directory or rerun after a touch of activity; treat as unproven, not clean |
| `BUILD INCOMPLETE` | the named targets have produced no successful bundle. Read the reason off the headline: a **withheld** stamp means the stamp still describes the last build that completed and everything rebuilt since is what it fails to describe; a **partial** build stamped a fresh identity over targets it never attempted, so those targets are the stale ones | printed with the verdict, from the marker's own `.note`; never reload or reinstall |
| `BUILD MARKER UNREADABLE` | `build-incomplete.json` is present but does not carry a non-empty `.pending` array, numeric `.since`, a `.reason` of `withheld` or `partial`, and non-empty `.note` — a shape no build writes | read the file by hand; the build state is unknown, not clean |
| `STAMP OLDER THAN ARTIFACT` | a top-level artifact was written after the stamp, with no marker to explain it | check the build terminal, then rebuild |
| `COULD NOT ORDER` | a top-level artifact shares the stamp's mtime, or there was nothing to compare | not a failure and not an all-clear; the marker is the surface to trust here |
| `NOT CHECKED` | a build directory was skipped — no stamp and no marker in it, or `WORKSPACE` unset | examine that directory by hand; nothing there was compared |
| `MORE THAN ONE WINDOW` | `cards-dev` refused: two windows are on the debug port, so the panel could not be attributed to the window the host was read from | close all but one window; nothing was compared |
| `HOST DIFFERS FROM DISK` | the window is executing a different build than the one installed | reload the window (but see *host newer than disk* below) |
| `PANEL DIFFERS FROM HOST` | this document predates the running host, *provided* both reads reached one VS Code instance — `MORE THAN ONE WINDOW` rules out only a second window on the debug port, not an instance started without it | reload that panel; first establish that only one VS Code instance is running |
| `NO STAMP ON DISK` | build predates the feature (or `dist/` is missing) | rebuild, reinstall, reload the window |
| `EXTENSION_PATH UNSET` | §1 located no installed extension — **not** a pre-feature build | resolve `EXTENSION_PATH` first; nothing was compared |
| `NO HOST READ` | host predates the feature, or no host was reached | reload the window, or fix the connection |
| `NO PANEL READ` | `cards-dev` could not reach a panel — e.g. `cards-dev: fetch failed` when VS Code is not listening on a remote debugging port | fix the connection |
| `PANEL CARRIES NO TAG` | read succeeded and returned `{"elements": []}` | reload that panel, then rerun |
| `PANEL IS AN ERROR FALLBACK` | the panel is the shared error document | read the error text; this is not staleness |

`PANEL CARRIES NO TAG` is the one ambiguous row: it is either a document generated by a pre-feature host (a reload fixes it) or a current document that genuinely lacks the tag — a real defect. Rerunning after the reload tells them apart; `cards-dev read --target detail --card "$PANEL_CARD" --selector meta --attribute name` lists what the document does carry.

**A stamp that describes fewer targets than the directory holds is the one state where every surface can be current and the answer still wrong**, because the artifacts it leaves behind — `dist/bundle.cjs`, the webview bundles — are the things no surface reads. `BUILD INCOMPLETE` is that state named, and it arrives two ways. A `yarn watch` session with a target that failed **withholds** the stamp, so `build-target.json` still describes the last complete build while every save since has rebuilt the bundle beside it; that terminal prints `Build incomplete — no successful bundle this session for: <targets>` on every rebuild, and fixing those targets restamps and clears the marker. A **partial** build — `yarn build:testing`, which skips webviews and swaps a test-mode `bundle.cjs` into the shared `packages/extension/dist` — stamps a fresh identity over webview bundles it never built; nothing failed, no terminal is running, and only a full build makes that directory coherent. The marker's `.note` carries the right one and the block prints it; never substitute the other. In neither case do reloading or reinstalling change anything. `HOST DIFFERS FROM DISK` with the **host newer** is the withheld case seen from a window that outlived the last complete build, and has the same remedy. (A webview- or CSS-only rebuild does *not* produce a mismatch: the watch loop restamps with the identity of the host bundle actually on disk, not a freshly sampled one.)

This CLI's coverage is honest, not complete: it reaches the card-detail panel and the sidebar list only. On a current build both are found from inert `<meta>` markup — `cards-webview-kind` for the list, `cards-panel-card-id` for a detail panel whose `window.__INIT_DATA__` never got set — so neither depends on the panel's own script having executed. On a pre-feature frame carrying no such markup, both fall back to script-dependent DOM probes and a frozen panel is simply not found; so is a card that is not already open, since opening one clicks through the rendered list. The other five panels (editor, create-card, stream, license, setup-wizard) carry the same `cards-build-info` tag by construction but have no CLI readout today, and need a manual CDP read instead. A matching SHA only establishes that the commit was *available* to the build (`git merge-base --is-ancestor <commit> <sha>`), not that its code survived bundling/tree-shaking into the artifact under inspection — for that narrower question, grepping the running bundle for a literal string the feature must emit is still the right tool; this provenance stamp does not replace it. For a stream/HTML-file panel specifically, a CDP read must target the panel's own top-level frame — never the card-document iframe, which loads a different document (the stream panel's `srcdoc`, or the Cards server's served page) and will never carry this tag.

A human at the keyboard can read the host surface alone via **Cards: Show Running Build Info** in the command palette; it toasts the same values.

`CARDS_CONFIG_DIR` is the root for discovery, databases, sessions, and worktrees. `WORKSPACE`, `MAIN_REPO_ROOT`, and `HOOKS_LOG_ANCHOR` are referenced by diagnostic commands throughout the reference files; `find-logs.md` names which one each log uses.

`MAIN_REPO_ROOT` is where a repo-scoped `.cards/logs/` tree hangs off. It differs from `WORKSPACE` whenever the session runs in a linked worktree: `--git-common-dir` collapses a worktree back to the repository that owns it, `--show-toplevel` does not. Anchoring a log path on `WORKSPACE` from a worktree targets a path the bundle never wrote — usually nothing at all, which reads as "hooks are dead" when they are fine, and occasionally a stale copy that is worse (see `find-logs.md`). The basename guard mirrors the hook bundle's own — a common dir not named `.git` (bare repo, submodule, separate-git-dir) leaves `MAIN_REPO_ROOT` unset, matching the bundle's fail-closed resolution in `public/packages/agent-hooks/src/shared/default-log-file.ts`.

`HOOKS_LOG_ANCHOR` is where the **Claude API hook log** lands, and it is not always `MAIN_REPO_ROOT`. The bundle anchors on the repository only when that repository carries the install (`claude-local` / `claude-project`); a user-scope install fires in every repository the user opens, so it anchors on `$HOME` instead and leaves unrelated repositories untouched. `unset` means no Cards install is recorded anywhere — the bundle then writes no file at all, which is the expected state, not a fault.

**Do not act on `unset` when the `INCONCLUSIVE` line printed.** Claude settings files are JSONC by design — the extension reads and writes them through `comment-json` so hand-written comments survive plugin injection — and jq 1.7 rejects a `//` comment or trailing comma outright (exit 5). The bundle strips JSONC before parsing, so every file jq refuses is one it may well read perfectly, install and all. jq cannot tell that file apart from genuinely malformed JSON, so §1 names it and declines to conclude rather than reporting an `unset` it has not earned. Resolve it by reading the named file directly: if it carries `enabledPlugins["cards@cards.management"]: true`, the anchor is `MAIN_REPO_ROOT` for a per-repo file or `$HOME` for the user-scope one. The bundle's own view is on stderr — `[cards-hooks] could not read <file>: <reason>; ignoring it when resolving the hook log anchor` means it failed too, and then `unset` is real.

**Read `HOOKS_LOG_OVERRIDE` before `HOOKS_LOG_ANCHOR`.** The two are not alternatives to weigh; the override decides on its own and the anchor is then irrelevant. When a value is present the bundle skips the computed default entirely, so `HOOKS_LOG_ANCHOR` still prints a plausible directory that nothing is writing to — which is why the line marks it *NOT in use* rather than leaving you to notice. An **empty** value is not a missing one: it means logging is deliberately off, and the anchor is equally moot. Only `HOOKS_LOG_OVERRIDE=none` makes `HOOKS_LOG_ANCHOR` the answer. The name is followed rather than assumed because `CLAUDE_CODE_HOOKS_LOG_ENV_VAR` can point the logger at a different variable, and testing `CLAUDE_CODE_HOOKS_LOG_FILE` under that indirection reports "no override" while one is in force.

If the UI exposes only a coarse message, collect the corresponding logs before choosing a remedy.

## 2. Route by Symptom

Load only the file(s) whose symptom matches.

### Antigravity installation, authentication, and hooks

Collect this read-only fingerprint before choosing a recovery action:

```bash
command -v agy || true
agy --version 2>&1 || true
agy plugin list 2>&1 || true
for plugin in cards runtime; do
  root="$HOME/.gemini/config/plugins/$plugin"
  printf '%s: ' "$plugin"
  if [ -f "$root/plugin.json" ]; then
    jq '{name,version,disabled}' "$root/plugin.json"
  else
    echo missing
  fi
  find "$root/skills" -name SKILL.md -type f -print 2>/dev/null | sort
  if [ "$plugin" = runtime ] && [ -f "$root/hooks.json" ]; then
    echo "runtime hooks.json present"
  fi
done
```

- If `agy` is absent or `agy --version` does not report exactly `1.1.22`, setup is blocked. Request the compatible pinned binary through the approved release channel and confirm the exact version on `PATH`; do not substitute an unpinned installer or a newer binary. Version drift is a compatibility failure, not an authentication failure.
- If setup reports **Unmanaged installation**, do not run a Cards repair or remove operation: resolve the foreign `cards` or `runtime` tree manually. If it reports **Disabled**, **Update required**, or **Invalid installation**, use the setup wizard's **Repair** action; that action is offered only after durable Cards ownership is proved.
- To recover authentication, run `agy` interactively and complete its sign-in flow. Then reproduce Cards' bounded read-only probe with `agy -p 'Reply with exactly: PONG' --output-format json --print-timeout 20s`; success must be exact JSON whose response is `PONG`. Do not inspect or copy credential files.
- For hook or transcript failures, confirm `$HOME/.gemini/config/plugins/runtime/hooks.json` exists, then inspect `$CARD_REPO_PATH/streams/antigravity-session/*.jsonl` and the session/log references below. Do not copy generated payload files into the live Antigravity home; use **Repair** when ownership is proved.

| Symptom | Load | What it covers |
|---------|------|----------------|
| Known error code or exact failure message; logs reveal a typed failure | `references/diagnose-known-failure-states.md` | Error families across internal packages, public packages, and the extension. Identify the owning family, preserve fail-closed boundaries, apply only supported remediation, verify durable state, report at the stated threshold |
| License activation, browser registration, refresh, or integrity failure | `references/diagnose-known-failure-states.md` | Distinguishes parsing, signing-environment, signature, expiry, revocation, device binding, polling, refresh, storage, and clock states |
| Agent won't start, terminal flashes and closes, ENOENT, handler crashes | `references/diagnose-agent-launch.md` | Full spawn chain: VS Code command → handler .mjs → agent CLI → plugin hooks, with guard checks, env vars, per-platform spawn behavior |
| Server not responding, "Server not running", ECONNREFUSED, SQLITE_CORRUPT | `references/diagnose-server-health.md` | Server liveness, discovery file validation, database corruption recovery, safe-vs-risky action markers |
| Hook not firing, SessionStart announcement missing, trust interstitial | `references/diagnose-hooks.md` | Hook registration and execution for Claude + Codex plugins, plus the Antigravity fingerprint above |
| Card won't bind, worktree already in use, bind lock held | `references/diagnose-worktree.md` | Worktree creation, binding, outfit, shared hooks provisioning, stale lock cleanup |
| Worktree contents wrong — files missing, unexpected symlinks, `create-worktree` exits 3, a listed `.worktreeinclude` path never arrives, Windows symlink privilege denied | `references/diagnose-worktree.md` | Worktree path policy (`.worktreeignore` omit / `.worktreeinclude` copy), copy-is-an-intersection rule, fail-closed config, per-path classification checks |
| Can't find logs, need to see what happened, no log output | `references/find-logs.md` | Every log file produced by the extension + plugins, organized by subsystem, with JSON Lines query recipes |
| Transcript missing, session not streamed, commit attribution broken | `references/find-session-state.md` | Session identity, transcript streaming, commit attribution, route-nudge markers, flush sentinels |
| Card stuck in active state, daemon crashed, cleanup not happening | `references/find-session-state.md` | Ad-hoc session monitoring — the reconciliation sweep that settles stranded cards when the adhoc-cleanup daemon crashes |
| Settings not taking effect, agent behavior wrong, plugin not enabled | `references/inspect-settings.md` | Settings tiers across Claude Code, Codex, and Cards; for Antigravity use the fingerprint and ownership-specific recovery above |
| Plugin not loading, "unknown plugin", stale cached version | `references/inspect-plugin-cache.md` | Plugin cache staging for Claude and Codex, marketplace registration, version management |
| CLI command fails, "command not found", interpreter broken | `references/inspect-cli-tools.md` | CLI inventory with auth, workspace discovery, shell shim patterns, platform-specific behavior |
| Path differences across machines or OS | `references/platform-reference.md` | Cross-platform path tables, IPC mechanisms, Node interpreter selection, shell variable syntax |
| Understanding server internals, writing automation, verifying schema | `references/cards-api-server.md` | Discovery file schema, database settings, liveness states, recovery constants |
| Filing a bug report about the Cards extension | `references/interview-issue-report.md`, then `references/issue-report-guide.md` | Interview process to gather signal before filing; then report sections, writing principles, and body template. Offer `gh issue create` first when GitHub auth is confirmed; else `cards-extension issue` |
| Symptom unclear, spans multiple layers | `references/diagnose-agent-launch.md` + `references/find-logs.md` | Full spawn chain end-to-end, plus evidence collection at every layer. Add `references/diagnose-server-health.md` if server health is involved |

## 3. Route by Subsystem

When the subsystem is known but the symptom is not:

- **Registration and licensing**: `references/diagnose-known-failure-states.md` (validation, browser claim, refresh, and local integrity) + `references/find-logs.md` (safe diagnostic evidence)
- **Known package error**: `references/diagnose-known-failure-states.md` (ownership, remediation, verification, and escalation) plus the subsystem-specific reference below when one exists
- **Claude Code hooks**: `references/diagnose-hooks.md` (hook execution) + `references/inspect-settings.md` (hook enablement in settings) + `references/inspect-plugin-cache.md` (hook binaries in cache)
- **Codex hooks**: Same, plus `references/platform-reference.md` (Codex home path differences)
- **Antigravity plugins, authentication, and hooks**: Run the §2 Antigravity fingerprint, then use `references/find-session-state.md` and `references/find-logs.md`; only the setup wizard performs Cards-owned repair or removal
- **Session lifecycle**: `references/find-session-state.md` (session state) + `references/diagnose-hooks.md` (which hooks write session state) + `references/diagnose-worktree.md` (session binding)
- **Worktree management**: `references/diagnose-worktree.md` (binding/outfit + path policy) + `references/inspect-cli-tools.md` (create/remove CLIs) + `references/find-session-state.md` (session markers in worktree)
- **Plugin cache**: `references/inspect-plugin-cache.md` (staging) + `references/inspect-settings.md` (registration) + `references/diagnose-agent-launch.md` (consumed at spawn)
- **Server**: `references/diagnose-server-health.md` (troubleshooting) + `references/cards-api-server.md` (schema reference)

## 4. If a Hub Doesn't Cover It

For an unlisted state, work it through `references/diagnose-known-failure-states.md`; do not infer that retrying is safe. Then file a bug report: load `references/interview-issue-report.md` (interview process) and `references/issue-report-guide.md` (report template).

</instructions>
