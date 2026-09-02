---
name: implement
description: Worktree workflow for implementing a task — enter a worktree, create a bound card, implement, rebase, fast-forward merge back, and clean up.
---
<!-- @cards.management/agent-skills source: public/skills-src/cards/implement/SKILL.md.eta sha256:d6b17319e63caf3587606a149f09e0acfd1da047273a828beead9cced9a40370 -->

<worktree-task-workflow>

1. **Record the starting point** before doing anything else:
   - `ORIGIN_DIR=$(pwd)` — the directory to return to and merge into.
   - `ORIGIN_BRANCH` — the branch currently checked out there.

2. **Enter a worktree** with the `EnterWorktree` tool. Do not create one manually (`git worktree add`, etc.) first.

3. **Create a card for the task** by running `cards create` from inside the worktree. Creating it from within the worktree auto-attaches the card to it — no separate attach step.

4. **Implement the change** in the worktree, on its branch.

5. **Rebase onto the origin branch**, from the worktree:
   `git rebase --empty=drop $ORIGIN_BRANCH`

6. **Fast-forward merge back**, from `$ORIGIN_DIR` (not the worktree):
   `git merge --ff-only <worktree-branch>`
   Fails loudly on divergence instead of creating a merge commit — resolve by rebasing again rather than forcing a merge commit.

7. **Exit the worktree** with `ExitWorktree`, `action: "remove"`.

</worktree-task-workflow>
