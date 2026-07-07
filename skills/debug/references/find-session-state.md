# Finding Session State

Scope: session IDs, transcripts, commit attribution, route-nudge markers, head SHA tracking, flush sentinels — everything written during a card session. Agent-retrieval keywords: CARDS_SESSION_ID, CARDS_TRANSCRIPT_PATH, transcript watcher, adhoc-active, adhoc-sessions, unbound candidates, flush sentinel, commit attribution, route-nudge, exit-when-done, head SHA.

Source of truth: this file owns the session state directory layout (`card-repo-commits/`, `adhoc-active/`, `adhoc-sessions/`) and the transcript streaming pipeline. Hooks that write session state → `diagnose-hooks.md`. Worktree binding → `diagnose-worktree.md`.

Completeness: every session-scoped file written by the Cards extension hooks and daemons as of version 1.0.x. Excludes agent internal session data (managed by Claude Code / Codex).

Cross-refs: `diagnose-hooks.md` (which hooks write session state), `diagnose-worktree.md` (session binding to worktree), `diagnose-agent-launch.md` (session lifecycle).

Parent: `../SKILL.md`

## Quick Diagnostics

```bash
# Active session markers (PID + start-time refs)
find ~/.cards/adhoc-active -type f 2>/dev/null

# Session commit records
ls ~/.cards/card-repo-commits/ 2>/dev/null

# Streamed transcripts in card repo
find ~/.cards/cards-repos -name "*.jsonl" -path "*/streams/*" -type f 2>/dev/null

# Flush sentinels (signal transcript watcher to close + commit)
find ~/.cards/cards-repos -name "*.flush" -type f 2>/dev/null

# Session stderr logs
find ~/.cards/sessions -name "stderr.log" -type f 2>/dev/null

# Unbound worktree candidates
find ~/.cards/adhoc-sessions -name "*.json" -path "*/unbound-candidates/*" -type f 2>/dev/null
```

## Session Identity

### CARDS_SESSION_ID

Persisted by the SessionStart hook via `persistEnvVar()`. Available to all Bash tool shell descendants, post-commit hooks, and the transcript watcher.

**Source**: `public/packages/agent-hooks/src/shared/session-env.ts`::`persistEnvVar('CARDS_SESSION_ID', ...)`.

### CARDS_TRANSCRIPT_PATH

Persisted by the SessionStart hook. Points to the Claude Code or Codex transcript JSONL file for the current session. Read by the transcript watcher spawn and by unbound candidate records.

**Source**: `public/packages/agent-hooks/src/shared/session-env.ts`::`persistEnvVar('CARDS_TRANSCRIPT_PATH', ...)`.

## Per-Session Commit Attribution

**Directory**: `~/.cards/card-repo-commits/`

**Source**: `public/packages/claude-code-sessions/src/card-repo.ts`::`getCardRepoCommitsDir()`.

| File | Purpose | Writer | Reader | Status |
|------|---------|--------|--------|--------|
| `{sessionId}.csv` | Commit SHA attribution records | `appendCommitToSession()` (PostToolUse hook, post-commit hook) | `getSessionCommits()` | current |
| `{sessionId}.csv.lock` | Lock for concurrent CSV writes | Session infrastructure | Session infrastructure | current |
| `{sessionId}.head` | HEAD SHA captured at session start | `writeSessionHeadSha()` (SessionStart hook) | Git diff baseline computation | current |
| `{sessionId}.route-nudge` | Once-per-session route-nudge gate (empty marker, mode 0o600) | `markSessionRouteNudgeFired()` (StopRouteNudge hook) | `hasSessionRouteNudgeFired()` (prevents duplicate nudges) | current |
| `{sessionId}.exit-when-done-nudge` | Exit-when-done nudge marker | Exit-when-done logic | Cleanup logic | current |

## Ad-Hoc Session Monitoring

### Active Refs

**Path**: `~/.cards/adhoc-active/{cardId}/{sessionId}.ref`

**Contents**: `{pid}\n{startTimeEpochMs}` — two lines, PID and start time. **Status**: current.

**Written by**: `writeRef()` in `public/packages/sdk/src/bin/adhoc-refs.ts`.

**Read by**: `liveRefsRemain()` (checks if monitored processes are still alive), `reconcileStrandedActiveCards()` (finds orphaned active cards).

**Purpose**: The `adhoc-cleanup` daemon spawns when a session starts, records the agent PID, and monitors it. On PID death, it transitions the card to `needs_review`. The `.ref` file is a durable marker — it persists even if the daemon crashes (OOM, SIGKILL, reboot), enabling the reconciliation sweep below to settle the card.

### Reconciliation Sweep

**Source**: `public/packages/sdk/src/bin/adhoc-refs.ts`::`reconcileStrandedActiveCards()`.

The reconciliation sweep is the backup mechanism for when the `adhoc-cleanup` daemon itself crashes before completing a card transition. It is called at the start of **every** Claude and Codex session (wired in via `SessionStart` hook at `public/packages/agent-hooks/src/claude/runtime/session-start.ts` and its Codex counterpart).

**Mechanism step by step**:
1. Scans all directories under `~/.cards/adhoc-active/{cardId}/`.
2. For each card, reads all `.ref` files and tests whether any ref's PID is still alive (with start-time matching to defeat PID reuse).
3. **If ANY ref is live**: The card has a healthy monitor — skipped entirely.
4. **If ALL refs are dead**: The daemon crashed. The sweep checks whether a live action wrapper is present for that card (same fail-closed guard the daemon's own teardown uses).
5. **If a live action wrapper IS present**: The sweep defers — retaining the dead refs so a later sweep can settle once the action clears.
6. **If no action wrapper is present**: The sweep settles the card — transitions it from `active` to `needs_review` via `transitionCardStatus()` (filesystem fallback in `public/packages/sdk/src/bin/process-utils.ts`), and deletes the dead `.ref` files.

**Narrow gap**: If the daemon crashes between the `active` API write and the `writeRef` call, the card becomes `active` with no `.ref` file — invisible to the sweep. This is accepted because the two writes happen in rapid succession and the ordering (API first, then ref) prevents the inverse problem (a ref claiming to monitor a card that was never marked `active`).

### Session Locks

**Path**: `~/.cards/adhoc-sessions/{sessionId}.lock`

Empty lock file for de-duplication — prevents two ad-hoc attribution spawns for the same session. **Status**: current.

**Source**: `public/packages/sdk/src/worktreeForCard.ts` (line ~322).

### Unbound Candidates

**Path**: `~/.cards/adhoc-sessions/{sessionId}/unbound-candidates/{sha256(worktreePath)}.json`

**Contents**: `{ worktreeDir, sessionId, transcriptPath }`. **Status**: current.

**Written by**: `addUnboundCandidate()` during EnterWorktree hook.

**Read by**: `readUnboundCandidates()` during `cards bind`.

**Purpose**: When the EnterWorktree hook fires but the worktree isn't yet card-bound, the worktree path and transcript are recorded as an unbound candidate. The `cards bind` command resolves the binding later, consuming the candidate.

**Source**: `public/packages/sdk/src/unboundWorktreeCandidates.ts`.

## Transcript Streaming

### Streamed Files

**Path**: `{cardRepoPath}/streams/claude-code-session/{sessionId}.jsonl`

Synced transcript lines written by the detached, manifest-driven `stream-sync-watcher` daemon. It uses `fs.watch` (recursive) on the manifest's `watchRoot`, tails new lines, and writes to the card repo. **Status**: current.

**Path**: `{cardRepoPath}/streams/claude-code-session/{sessionId}-{subagentId}.jsonl`

Subagent transcripts uploaded by the SubagentStop hook. **Status**: current.

### Flush Sentinel

**Path**: `{cardRepoPath}/streams/claude-code-session/{sessionId}.flush`

Empty marker file. Written by the SessionEnd hook to signal `stream-sync-watcher` that the session ended gracefully. The watcher detects the sentinel via its `fs.watch`, flushes remaining lines, commits, and exits. **Status**: current.

### Sidecar Metadata

**Path**: `{cardRepoPath}/streams/claude-code-session/{sessionId}.jsonl.meta.json`

Written once, on first successful sync of a matched source, and never rewritten afterward:

```json
{
  "version": 1,
  "relPath": "...",
  "streamType": "claude-code-session",
  "runtime": "claude-code",
  "sessionId": "...",
  "role": "main",
  "title": "...",
  "sourcePath": "...",
  "startedAt": "2026-06-26T14:45:00.000Z",
  "lineCount": 0
}
```

**Status**: current.

### Auto-Gitignore

`stream-sync-watcher` appends `streams/**/*.flush` to `{cardRepoPath}/.gitignore` if not already present — flush sentinels should never be committed.

## Session Stderr

**Path**: `~/.cards/sessions/{sanitizedCardId}/stderr.log`

Plain text stderr capture from session processes. Sanitized card ID: characters unsafe for filesystem paths are replaced. **Status**: current.

**Source**: `packages/extension/src/utils/paths.ts`::`getSessionStderrLogPath()`.

## Session End Cleanup

When a session ends (SessionEnd hook + exit-when-done):
1. Flush sentinel written to trigger transcript watcher close
2. `removeSessionRouteNudge(sessionId)` — deletes the route-nudge marker
3. `removeSessionExitWhenDoneNudge(sessionId)` — deletes the exit-when-done marker
4. Transcript watcher commits remaining lines, removes `head-sha`, `csv`, route-nudge, and exit-when-done-nudge files
5. `adhoc-cleanup` daemon detects PID death, updates card status to `needs_review`, deletes `{cardId}/{sessionId}.ref`

## Out of Scope

- Hook execution and registration → `diagnose-hooks.md`
- Worktree binding → `diagnose-worktree.md`
- Server health → `diagnose-server-health.md`
- Agent internal session data → Claude Code / Codex documentation
- Card repository structure (plans, comments, attachments) → `cards:cards` skill
