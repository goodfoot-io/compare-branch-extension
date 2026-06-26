# Diagnosing Worktree Issues

Scope: worktree creation, binding, outfit, and cleanup. Covers both Cards-managed worktrees and git worktree state for card-bound sessions. Agent-retrieval keywords: worktree bind, CARD_ID, bind lock, PARENT_BRANCH, SESSION_ID, core.hooksPath, create-worktree, remove-worktree, worktree collision, already bound, stale bind lock.

Source of truth: this file owns the per-worktree `.cards/` file schema and the bind-lock mechanism. CLI tool locations → `inspect-cli-tools.md`. Session binding → `find-session-state.md`.

Completeness: covers all worktree lifecycle states (creation, binding, outfit, cleanup) in the Cards extension as of version 1.0.x. Excludes CLI implementation details (see `inspect-cli-tools.md`).

Cross-refs: `inspect-cli-tools.md` (`create-worktree` / `remove-worktree` CLIs), `find-session-state.md` (session binding), `platform-reference.md` (path normalization on Windows).

Parent: `../SKILL.md`

## Evidence to Collect

Before diagnosing:
- `git worktree list` output
- `cat .cards/CARD_ID` (if in a worktree)
- `cat .cards/PARENT_BRANCH` (if in a worktree)
- `echo $CARDS_SESSION_ID` (session identity env var, set by SessionStart hook)
- `ls ~/.cards/bind-locks/` (bind lock files)
- `ls ~/.cards/worktrees/` (Cards-managed worktrees)

## Quick Diagnostics

```bash
# List Cards-managed worktrees
find ~/.cards/worktrees -maxdepth 3 -type d 2>/dev/null

# Check if current directory is a worktree
git rev-parse --git-dir 2>/dev/null
git rev-parse --git-common-dir 2>/dev/null
# Linked worktree: git-dir ≠ git-common-dir

# Check if worktree is card-bound
cat .cards/CARD_ID 2>/dev/null || echo "not card-bound"
cat .cards/PARENT_BRANCH 2>/dev/null || echo "no parent branch recorded"
echo "CARDS_SESSION_ID=${CARDS_SESSION_ID:-not set}"

# Check for bind locks (stale locks block binding)
ls ~/.cards/bind-locks/ 2>/dev/null
```

## Per-Worktree `.cards/` Files

| File | Written by | Read by | Contents | Status |
|------|-----------|---------|----------|--------|
| `CARD_ID` | `writeCardBoundFile()` in `worktree.ts:963` | `cards bind`, `remove-worktree`, watchers | Card ID string | current |
| `PARENT_BRANCH` | `outfitWorktreeForCard()` in `worktreeForCard.ts` | `create-worktree`, branch registration | Branch name | current |
| `CARD_ORIGINAL_HOOK_PATH` | `provisionSharedHooksDirStatic()` in `worktreeForCard.ts:926` | Restoration on unbind | Original `core.hooksPath` value | current |

Session identity is tracked as the `CARDS_SESSION_ID` environment variable (persisted by the SessionStart hook via `persistSessionEnv()`), not as a `.cards/` file. Active sessions are monitored through `~/.cards/adhoc-active/{cardId}/{sessionId}.ref` files.

## Bind Lock Mechanism

**Path**: `~/.cards/bind-locks/{sha256(worktreeDir)}.lock`

Cross-process advisory lock preventing two processes from binding the same worktree. The lock file is empty — its existence is the signal. Created by `outfitWorktreeForCard()` at bind time, cleaned up on unbind or cleanup.

**Source**: `public/packages/sdk/src/worktreeForCard.ts`::`resolveBindLockPath()`.

## Shared Hooks Directory

**Path**: `~/.cards/workspace-hooks/`

A dispatcher directory containing hook scripts compiled from the marketplace. Provisioned per-worktree by `provisionSharedHooksDirStatic()` which symlinks individual entries from the compiled hooks directory. The git `core.hooksPath` in the worktree is set to this directory so Cards hook behavior applies only within that worktree.

**Source**: `public/packages/sdk/src/worktreeForCard.ts`::`sharedHooksDir`.

## Failure Modes

Ranked by probability:

### Worktree Creation Fails (Collision) — HIGH probability

**Evidence**: `create-worktree` exits with code 2. Error: ref already has a worktree at the computed path.

**Cause**: The ref (branch/tag/SHA) already has a worktree at `~/.cards/worktrees/{repoId}/{ref}/`.

**Recovery**: Use `git worktree list` to inspect existing worktrees. Remove with `remove-worktree <path>` if stale.
**Risk**: **safe**. **Looks like, but isn't**: A git worktree managed outside Cards (manual `git worktree add`) can exist at the same ref but different path — `git worktree list` shows all.

**Post-fix verification**: `create-worktree` succeeds. `git worktree list` shows the new entry.

### Bind Fails (Already Bound) — HIGH probability

**Evidence**: `cards <id> bind` fails. `.cards/CARD_ID` already exists in the worktree with a different card ID.

**Cause**: A worktree can only be bound to one card. The worktree was previously bound and not cleaned up.

**Recovery**: Remove the existing `.cards/CARD_ID` only if the previous bind is stale (no active session). Check `~/.cards/adhoc-active/{cardId}/` for live ref files — if all ref PIDs are dead, the bind is stale and the file can be safely removed.
**Risk**: **risky — removing CARD_ID during an active session breaks attribution and triggers orphan cleanup**.

### Bind Fails (Lock Held) — MEDIUM probability

**Evidence**: `cards <id> bind` hangs or fails. A bind-lock file exists at `~/.cards/bind-locks/{sha256(worktreeDir)}.lock`.

**Cause**: Another bind operation is in progress, or a previous bind crashed and left a stale lock.

**Recovery**: Check if a bind operation is running (`ps aux | grep bind`). If no bind is in progress, remove the lock file manually.
**Risk**: **risky — removing a live lock causes double-bind**. Verify no bind operation is running first.

**Post-fix verification**: `cards <id> bind` succeeds. `.cards/CARD_ID` contains the card ID.

### Hooks Not Running in Worktree — MEDIUM probability

**Evidence**: Git operations in the worktree don't trigger Cards hooks. `git config core.hooksPath` returns something other than the shared hooks directory.

**Cause**: `core.hooksPath` wasn't set during outfit, or the shared hooks directory wasn't provisioned.

**Recovery**: Rerun `cards <id> bind` to re-outfit the worktree. Check `.cards/CARD_ORIGINAL_HOOK_PATH` for the previous value.
**Risk**: **safe**.

### Worktree Path on Windows — LOW probability

**Evidence**: Path mismatch between `git worktree list` output (forward slashes) and filesystem (backslashes).

**Cause**: Git emits forward-slash paths even on Windows. All consumers normalize via `path.resolve()`.

**Recovery**: No action needed — the code handles this. If a path comparison fails, run both sides through `path.resolve()`.
**Risk**: **safe**.

### `create-worktree` Fails (No Card ID, Server Unreachable) — LOW probability

**Evidence**: `create-worktree --card-id <id>` fails because it can't reach the Cards API server.

**Cause**: When `--card-id` is given, the CLI must reach the server for branch registration. Without `--card-id`, the CLI is fully offline.

**Recovery**: Verify the server is running (load `diagnose-server-health.md`). Or create the worktree without `--card-id` and bind separately.
**Risk**: **safe**.

## Escalation

Escalate if:
- Bind lock persists after confirming no bind operation is running → Filesystem or permissions issue
- Worktree creation consistently fails with no collision → `repoId` hash computation may be wrong
- Hooks refuse to run after multiple re-outfit attempts → `core.hooksPath` may be locked by git config scope
- Worktree removal fails with `git worktree remove` → fallback `rm -rf` may be needed (verify worktree is not in use)

## Out of Scope

- CLI implementation details → `inspect-cli-tools.md`
- Session identity and state → `find-session-state.md`
- Platform-specific path normalization → `platform-reference.md`
- Server health (prerequisite for card-bound worktree creation) → `diagnose-server-health.md`
