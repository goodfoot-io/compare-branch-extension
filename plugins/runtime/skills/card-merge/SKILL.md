---
name: card-merge
description: Merge implementation branch to base branch.
---


<instructions>

## 1. Check for Changes

Count the commits on `$WORKSPACE_BRANCH` relative to `$BASE_BRANCH` (`git rev-list --count $BASE_BRANCH..$WORKSPACE_BRANCH` in `$WORKSPACE_PATH`).

Based on commit count:
- **COMMIT_COUNT = 0**: No changes to merge. **STOP**.
- **COMMIT_COUNT >= 1**: Proceed to Step 2: Rebase and Validate.

## 2. Rebase and Validate

Rebase the branch onto local `$BASE_BRANCH` to keep history linear:

```bash
git rebase --empty=drop $BASE_BRANCH
```

Based on rebase result:
- **Conflicts occur**: Run the command above to identify all conflicted files before resolving.

```bash
git diff --name-only --diff-filter=U
```

Identify conflicted files first (see below) and stage each resolved file by name rather than using `git add -A`.

```bash
# Stage only the conflict-resolved files by name
git add <resolved-file-1> <resolved-file-2>
git rebase --continue
```

- **Conflicts cannot be resolved**: Add `blocked` to `tags` in `CARD.meta.json` if not already present. Write conflict details to `comment/merge-conflict.md` (files involved, manual resolution steps). Commit both files and **STOP** — Awaiting user intervention.

- **Rebase reports branch is already up to date** (no commits moved): Proceed to Step 3.

- **Rebase completes with 0 commits ahead of `$BASE_BRANCH`** (commit was dropped as empty): The changes are already present in `$BASE_BRANCH`. Write a comment to the card repository noting this, and **STOP** — nothing to merge.

If rebase moved commits, run linting, type checking, and tests.

**Validation rules:**
- All validation commands must execute and pass — a command that errors before producing results is a failure
- Fix any errors you encounter — do not dismiss errors as "pre-existing" or "unrelated"
- "Resolve or block" is the only valid outcome — there is no "proceed despite errors" path
- Fix infrastructure failures (missing dependencies, path issues) directly — do not work around them
- Creating a card is not an alternative to fixing a validation failure — test failures, lint errors, and type errors must be fixed in this branch
- **If blocked by an issue outside the validation toolchain** (e.g., missing credentials, network outage, unavailable service): Report by adding to existing open cards about the block, or create a new card with "backlog" status

Based on validation result:
- **All validation passes**: Proceed to Step 3: Fast-Forward Merge.
- **Validation fails and attempts < 3**: Fix errors, re-run validation
- **Validation fails and attempts >= 3**: Add `blocked` to `tags` in `CARD.meta.json` if not already present. Write failure details to `comment/validation-failed.md` (what failed, what was attempted, what intervention is needed). Commit both files and **STOP** — Awaiting user intervention.

## 3. Fast-Forward Merge

`$WORKSPACE_PATH` is a worktree — `$BASE_BRANCH` is checked out elsewhere. Find where `$BASE_BRANCH` is checked out:

```bash
BASE_WORKTREE=$(git -C "$WORKSPACE_PATH" worktree list --porcelain \
  | awk -v b="$BASE_BRANCH" '/^worktree /{wt=$2} /^branch refs\/heads\//{if($2=="refs/heads/"b) print wt}')
cd "$BASE_WORKTREE"
```

Check for uncommitted changes with `git status --porcelain`:

- **Clean**: Merge with `git merge --ff-only "$WORKSPACE_BRANCH"`. **STOP** — Merge complete. Do not update card status, write comments, or take further action.
- **Dirty**: Stash uncommitted changes, fast-forward merge, then restore:

```bash
git stash push --include-untracked -m "card-merge: stash before ff-merge" && git merge --ff-only "$WORKSPACE_BRANCH" && git stash pop
```

  The `&&` chain ensures the merge only runs if the stash succeeds, and the pop only runs if the merge succeeds — leaving the stash in place if the merge fails so it can be restored manually.

  - **Succeeds**: **STOP** — Merge complete. Do not update card status, write comments, or take further action.
  - **`git stash pop` reports conflicts**: Add `blocked` to `tags` in `CARD.meta.json` if not already present. Write failure details to `comment/merge-failed.md` — stashed changes conflict with the merged branch; user must resolve the stash conflict manually. Commit both files and **STOP**.
  - **`git merge --ff-only` fails**: Run `git stash pop` to restore uncommitted changes before stopping. Add `blocked` to `tags` in `CARD.meta.json` if not already present. Write failure details to `comment/merge-failed.md` — branch is not a fast-forward of `$BASE_BRANCH`; include likely cause and resolution steps. Commit both files and **STOP**.
- **Merge or apply fails for any other reason**: Add `blocked` to `tags` in `CARD.meta.json` if not already present. Write failure details to `comment/merge-failed.md` — branch is not a fast-forward of `$BASE_BRANCH`; include likely cause and resolution steps. Commit both files and **STOP**.

</instructions>
