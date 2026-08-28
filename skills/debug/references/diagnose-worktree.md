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
git config "branch.$(git branch --show-current).cardsParent" 2>/dev/null || echo "no parent branch recorded"
echo "CARDS_SESSION_ID=${CARDS_SESSION_ID:-not set}"

# Check for bind locks (stale locks block binding)
ls ~/.cards/bind-locks/ 2>/dev/null
```

## Per-Worktree `.cards/` Files

| File | Written by | Read by | Contents |
|------|-----------|---------|----------|
| `CARD_ID` | `writeCardBoundFile()` in `worktree.ts` | `cards bind`, `remove-worktree`, watchers | Card ID string |
| `CARD_ORIGINAL_HOOK_PATH` | `outfitWorktreeForCard()` (guarded snapshot — never overwritten on re-run) | Restoration on unbind | Original `core.hooksPath` value |

The parent branch is not a `.cards/` file: `outfitWorktreeForCard()` records it as durable git config `branch.<name>.cardsParent` via `writeCardsParentConfig()`.

Session identity is tracked as the `CARDS_SESSION_ID` environment variable (persisted by the SessionStart hook via `persistSessionEnv()`), not as a `.cards/` file. Active sessions are monitored through `~/.cards/adhoc-active/{cardId}/{sessionId}.ref` files.

## Bind Lock Mechanism

**Path**: `~/.cards/bind-locks/{sha256(worktreeDir)}.lock`

Cross-process advisory lock preventing two processes from binding the same worktree. The lock file is empty — its existence is the signal. `outfitWorktreeForCard()` acquires it around the bind's API phase and releases it in a `finally` block when the bind completes.

**Source**: `public/packages/sdk/src/worktreeForCard.ts`::`resolveBindLockPath()`.

## Shared Hooks Directory

**Path**: `~/.cards/workspace-hooks/`

A global dispatcher directory shared by all worktrees. `provisionSharedHooksDir()` (in `worktree.ts`) writes one bash dispatcher script per client-side git hook type plus a copy of each compiled Cards `.mjs` — atomic writes, content-addressed skip. Outfit then sets the worktree's `core.hooksPath` (a `--worktree` config write) to this directory so Cards hook behavior applies only within that worktree.

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

### Worktree Contents Not Isolated (Path Policy) — MEDIUM probability

**Evidence**: `create-worktree` exits 3. The worktree is missing paths that should be shared, has symlinks where real files should be, or contains generated output that should be omitted.

**Cause**: `.worktreeignore` (omit) and `.worktreeinclude` (copy) at the source repo root configure the worktree path policy. Every git-ignored path gets one of three decisions — omit (never provisioned), copy (real file; prevents the ignored ancestor directory from being symlinked), or share (symlink, the default for unmatched paths). Omit wins over copy; patterns are gitignore syntax. The policy is re-evaluated on every creation.

- **Copy is an intersection** — only git-ignored paths are copied. A tracked file is never copied however it is listed (the checkout already provides it), and a listed path missing from disk is skipped silently, so a "missing" copy is usually a tracked path, an omit match, or a path that does not exist.
- **Copies preserve shape** — mode bits are carried over, and a source symlink is recreated as a symlink on the same target rather than dereferenced; a copied path is therefore not always a regular file.
- **Whole-dir omission** — a file-level `.worktreeignore` pattern under a fully-ignored directory removes the whole directory (a symlinked directory cannot be partially omitted); use a copy rule for the file if the rest of the directory must remain. Inside `node_modules` in a workspaces repo, the same rule keeps the package usable instead: the package becomes a real directory with the ruled path absent and its other files symlinked, so writes at the ruled path cannot reach the source.
- **Fails closed** — an unreadable or invalid config file, or a dangling symlink at a config path, stops creation with a `WorktreeIncludeError` before any matching path is linked. An absent config file contributes no patterns and is not an error, so a repo with neither file shares every git-ignored path.
- **Enumeration is deadline-bounded** — git scans and filesystem walks fail closed after `CARDS_WORKTREE_POLICY_TIMEOUT_MS` (default 30000); the timeout error names the variable. Raise it for huge trees or slow filesystems (network drive, antivirus).

**Recovery**:
```bash
# Config files live at the source repo root; both must be readable and valid
ls -la .worktreeignore .worktreeinclude
# What the source considers ignored (must match the policy's input)
git check-ignore -v <path>
# What the worktree actually contains
ls -la <worktree>/<path>
readlink <worktree>/<path>    # symlink = shared, or a recreated copy of a source symlink
stat -c '%F %a' <worktree>/<path>  # regular file = copied (or checked out); mode is preserved on copy
git ls-files --error-unmatch <path>  # exits 0 = tracked, so never copied whatever the include file says
```
Fix the pattern or file permissions, then re-run `create-worktree` — the policy is rebuilt from scratch, no cache to clear. A failed creation removes its partially-provisioned worktree automatically: the directory, its git registration, and the branch the failed run created are cleaned up before the error surfaces, so the re-run starts from a clean slate (a branch that existed before the failed run is left untouched). If cleanup itself fails, a warning is printed to stderr naming the leftover directory — remove it manually with `remove-worktree <path>` first, then re-run. **Risk**: **safe**.

**Post-fix verification**: `create-worktree` exits 0; omitted paths have no entry, copied paths are real files with their source mode bits, unmatched ignored paths are symlinks.

### Symlink Privilege Denied (Windows) — LOW probability

**Evidence**: On Windows, creation fails with a `SymlinkPrivilegeError` or a `WorktreeIncludeError` naming a symlink destination (`EPERM`/`EINVAL` underneath).

**Cause**: Provisioning shares git-ignored paths as symlinks and recreates source symlinks in the copy set, and Windows grants symlink creation only under Developer Mode or an elevated session. Creation fails closed rather than degrading to a copy, which would diverge worktree semantics from macOS/Linux.

**Recovery**: Enable Settings > System > For developers > Developer Mode (or run elevated), then re-run `create-worktree`. **Risk**: **safe**.

**Post-fix verification**: `create-worktree` exits 0 and the named destination exists as a symlink.

### Worktree Path on Windows — LOW probability

**Evidence**: Path mismatch between `git worktree list` output (forward slashes) and filesystem (backslashes).

**Cause**: Git emits forward-slash paths even on Windows. All consumers normalize via `path.resolve()`.

**Recovery**: No action needed — the code handles this. If a path comparison fails, run both sides through `path.resolve()`. **Risk**: **safe**.

### `create-worktree` Fails (No Card ID, Server Unreachable) — LOW probability

**Evidence**: `create-worktree --card-id <id>` fails because it can't reach the Cards API server.

**Cause**: When `--card-id` is given, the CLI must reach the server for branch registration. Without `--card-id`, the CLI is fully offline.

**Recovery**: Verify the server is running (load `diagnose-server-health.md`), or create the worktree without `--card-id` and bind separately. **Risk**: **safe**.

## Escalation

File a bug report — load `interview-issue-report.md`, then `issue-report-guide.md`. Escalate if:
- **Bind lock persists after confirming no bind operation is running**: Include `ls -la ~/.cards/bind-locks/` and `git worktree list`.
- **Worktree creation consistently fails with no collision**: Include `create-worktree` stderr output and the worktree directory listing.
- **Worktree contents wrong or creation exits 3 (path policy)**: Include `cat .worktreeignore` / `cat .worktreeinclude` (redacted), the `create-worktree` stderr, and `ls -la` of the affected worktree paths.
- **Hooks refuse to run after multiple re-outfit attempts**: Include `git config core.hooksPath` and `cat .cards/CARD_ORIGINAL_HOOK_PATH`.
- **Worktree removal fails with `git worktree remove`**: Include `git worktree list` and the specific error from `rm -rf` fallback.

## Out of Scope

- CLI implementation details → `inspect-cli-tools.md`
- Session identity and state → `find-session-state.md`
- Platform-specific path normalization → `platform-reference.md`
- Server health (prerequisite for card-bound worktree creation) → `diagnose-server-health.md`
