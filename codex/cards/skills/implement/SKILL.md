---
name: implement
description: Worktree workflow for implementing a task — create a worktree, create a bound card, implement, rebase, fast-forward merge back, and clean up.
---

<worktree-task-workflow>

1. **Record the starting point** before doing anything else:
   - `ORIGIN_DIR=$(pwd)` — the directory to return to and merge into.
   - `ORIGIN_BRANCH` — the branch currently checked out there.

2. **Create a worktree** with plain git — Codex CLI has no built-in worktree tool:
   `git worktree add ../<task-branch> -b <task-branch>`
   then `cd` into it. Do not skip the `-b`; reusing a branch already checked out elsewhere fails.

3. **Create a card for the task** by running `cards create` from inside the worktree. Creating it from within the worktree auto-binds the card to it — no separate bind step.

4. **Implement the change** in the worktree, on its branch.

5. **Rebase onto the origin branch**, from the worktree:
   `git rebase --empty=drop $ORIGIN_BRANCH`

6. **Fast-forward merge back**, from `$ORIGIN_DIR` (not the worktree):
   `git merge --ff-only <worktree-branch>`
   Fails loudly on divergence instead of creating a merge commit — resolve by rebasing again rather than forcing a merge commit.

7. **Remove the worktree**, from `$ORIGIN_DIR`:
   `git worktree remove ../<task-branch>`

</worktree-task-workflow>
