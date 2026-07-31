# Diagnosing Worktree Issues

Scope: worktree creation, binding, outfit, and cleanup for Cards-managed worktrees and card-bound sessions.

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

| File | Written by | Read by | Contents |
|------|-----------|---------|----------|
| `CARD_ID` | `writeCardBoundFile()` in `worktree.ts:963` | `cards bind`, `remove-worktree`, watchers | Card ID string |
| `PARENT_BRANCH` | `outfitWorktreeForCard()` in `worktreeForCard.ts` | `create-worktree`, branch registration | Branch name |
| `CARD_ORIGINAL_HOOK_PATH` | `provisionSharedHooksDirStatic()` in `worktreeForCard.ts:926` | Restoration on unbind | Original `core.hooksPath` value |

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

**Recovery**: Use `git worktree list` to inspect existing worktrees. Remove with `remove-worktree <path>` if stale — **safe**.

**Looks like, but isn't**: A git worktree managed outside Cards (manual `git worktree add`) can exist at the same ref but different path — `git worktree list` shows all.

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

**Recovery**: Rerun `cards <id> bind` to re-outfit the worktree — **safe**. Check `.cards/CARD_ORIGINAL_HOOK_PATH` for the previous value.

### Worktree Path on Windows — LOW probability

**Evidence**: Path mismatch between `git worktree list` output (forward slashes) and filesystem (backslashes).

**Cause**: Git emits forward-slash paths even on Windows. All consumers normalize via `path.resolve()`.

**Recovery**: No action needed — the code handles this. If a path comparison fails, run both sides through `path.resolve()`. **Risk**: **safe**.

### `create-worktree` Fails (No Card ID, Server Unreachable) — LOW probability

**Evidence**: `create-worktree --card-id <id>` fails because it can't reach the Cards API server.

**Cause**: When `--card-id` is given, the CLI must reach the server for branch registration. Without `--card-id`, the CLI is fully offline.

**Recovery**: Verify the server is running (load `diagnose-server-health.md`), or create the worktree without `--card-id` and bind separately. **Risk**: **safe**.

## Escalation

File via `cards-extension issue` — load `interview-issue-report.md`, then `issue-report-guide.md`. Escalate if:
- **Bind lock persists after confirming no bind operation is running**: Include `ls -la ~/.cards/bind-locks/` and `git worktree list`.
- **Worktree creation consistently fails with no collision**: Include `create-worktree` stderr output and the worktree directory listing.
- **Hooks refuse to run after multiple re-outfit attempts**: Include `git config core.hooksPath` and `cat .cards/CARD_ORIGINAL_HOOK_PATH`.
- **Worktree removal fails with `git worktree remove`**: Include `git worktree list` and the specific error from `rm -rf` fallback.

## Out of Scope

- CLI implementation details → `inspect-cli-tools.md`
- Session identity and state → `find-session-state.md`
- Platform-specific path normalization → `platform-reference.md`
- Server health (prerequisite for card-bound worktree creation) → `diagnose-server-health.md`
