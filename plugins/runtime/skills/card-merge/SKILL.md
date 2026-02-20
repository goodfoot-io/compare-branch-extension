---
name: merge
description: Merge implementation branch to base branch.
---


<instructions>

## 1. Check for Changes

```bash
cd $WORKSPACE_PATH
COMMIT_COUNT=$(git rev-list --count $BASE_BRANCH..$WORKSPACE_BRANCH)
```

Based on commit count:
- **COMMIT_COUNT = 0**: No changes to merge. Write a comment to the card repository noting no changes were found. Commit to the card repository and **STOP**.
- **COMMIT_COUNT >= 1**: Proceed to Step 2

## 2. Squash Commits

Squash all commits since the branch diverged:

```bash
cd $WORKSPACE_PATH
if [ "$COMMIT_COUNT" -gt 1 ]; then
  git reset --soft $(git merge-base $WORKSPACE_BRANCH $BASE_BRANCH)
  git commit -m "[comprehensive summary of all changes: what was built, key design decisions, and card reference]"
fi
```

## 3. Rebase and Validate

Rebase the squashed commit onto local `$BASE_BRANCH` to keep history linear:

```bash
cd $WORKSPACE_PATH
git rebase $BASE_BRANCH
```

Based on rebase result:
- **Conflicts occur**: Resolve conflicts, run `git add -A && git rebase --continue`
- **Conflicts cannot be resolved**: Write an error comment to the card repository, add `blocked` tag to `CARD.meta.json`, commit to the card repository, and **STOP** — Awaiting user intervention.

After rebase completes, run linting, type checking, and tests.

**Validation rules:**
- All validation commands must execute and pass. A command that errors before producing results is a failure.
- Fix any errors you encounter. Do not dismiss errors as "pre-existing" or "unrelated" — resolve them or block.
- "Resolve or block" is the only valid outcome. There is no "proceed despite errors" path.
- Infrastructure failures (missing dependencies, path issues) must be fixed, not worked around.
- If blocked, report the failure by adding to existing open cards about the block, or by creating a new card with "backlog" status.

Blocking is not failure — it is honest acknowledgment that human intervention is needed. A clean block with clear documentation serves the project better than a rationalized merge.

Based on validation result:
- **All validation passes**: Proceed to Step 4
- **Validation fails and attempts < 3**: Fix errors, re-run validation
- **Validation fails and attempts >= 3**: Write a comment to the card repository explaining what failed and what you attempted. Add `blocked` tag to `CARD.meta.json`. Commit to the card repository and **STOP** — Awaiting user intervention.

## 4. Fast-Forward Merge

Navigate to the repository root:

```bash
cd $WORKSPACE_PATH
REPO_ROOT="$(cd "$(git rev-parse --git-common-dir)/.." && pwd)"
cd "$REPO_ROOT"
git status --porcelain
```

Based on workspace state:
- **Uncommitted changes exist**: Stash them with `git stash push -m "pre-merge: ${CARD_ID}"`
- **No uncommitted changes**: Continue

```bash
cd $WORKSPACE_PATH
git merge --ff-only "$WORKSPACE_BRANCH"
```

Based on merge result:
- **Merge succeeds**: Pop stash if applicable (`git stash pop`). **STOP** — Merge complete. Awaiting user verification.
- **Merge fails**: Post error comment, add `blocked` tag, **STOP** — Branch is not a fast-forward of `$BASE_BRANCH` (rebase may be missing or outdated).

</instructions>
