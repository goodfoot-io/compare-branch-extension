---
name: implement
description: Worktree workflow for implementing a task — create a worktree, create a bound card, implement, rebase, fast-forward merge back, and clean up.
---
<!-- @goodfoot/agent-skills source: public/skills-src/cards/implement/SKILL.md.eta sha256:cf32f51899597b89c10407715e97dd76c84941a1001f0ce1ba2db510ecaa0ace -->

<worktree-task-workflow>

1. **Record the starting point** before doing anything else:
   - `ORIGIN_DIR=$(pwd)` — the directory to return to and merge into.
   - `ORIGIN_BRANCH` — the branch currently checked out there.

2. **Create a worktree** with the `create-worktree` CLI — the agent CLI has no built-in worktree tool:
   `create-worktree <task-branch>`
   then `cd` into the printed `worktree` path (parsed from the JSON output).

3. **Create a card for the task** by running `cards create` from inside the worktree. Creating it from within the worktree auto-binds the card to it — no separate bind step.

4. **Implement the change** in the worktree, on its branch.

5. **Rebase onto the origin branch**, from the worktree:
   `git rebase --empty=drop $ORIGIN_BRANCH`

6. **Fast-forward merge back**, from `$ORIGIN_DIR` (not the worktree):
   `git merge --ff-only <worktree-branch>`
   Fails loudly on divergence instead of creating a merge commit — resolve by rebasing again rather than forcing a merge commit.

7. **Exit the worktree** with `ExitWorktree`, `action: "remove"`.

</worktree-task-workflow>
