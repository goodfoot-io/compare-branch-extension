---
name: issue-merge
description: Merge worktree implementation to base branch.
---

<placeholder-variables>
[TITLE] — The issue title
[BRANCH_NAME] — The worktree branch name
[WORKTREE_PATH] — `.worktrees/[BRANCH_NAME]`
[BASE_BRANCH] — The branch to merge into (typically `main`)
</placeholder-variables>

<tools>

**remove-instant-worktree** — Removes a worktree and deletes its associated branch. Returns the branch's final commit SHA.

```bash
remove-instant-worktree "[BRANCH_NAME]"
```

</tools>

<instructions>

## 1. Check for Changes

```bash
cd ".worktrees/$BRANCH_NAME"
BRANCH_BASE=$(git merge-base HEAD $BASE_BRANCH)
COMMIT_COUNT=$(git rev-list --count "$BRANCH_BASE"..HEAD)
```

Based on commit count:
- **COMMIT_COUNT = 0**: No changes to merge. Run `remove-instant-worktree "$BRANCH_NAME"`, post comment "No changes found in worktree. Cleaned up branch without merging.", **STOP**
- **COMMIT_COUNT ≥ 1**: Proceed to Step 2

## 2. Squash Commits

```bash
if [ "$COMMIT_COUNT" -gt 1 ]; then
  git reset --soft "$BRANCH_BASE"
  git commit -m "feat: [TITLE]

Issue: [ISSUE_ID]"
fi
```

## 3. Rebase and Validate (in Worktree)

Rebase onto local `$BASE_BRANCH` (includes recent merges not yet pushed):

```bash
git rebase $BASE_BRANCH
```

Based on rebase result:
- **Conflicts occur**: Resolve conflicts, run `git add -A && git rebase --continue`
- **Conflicts cannot be resolved**: Post error comment, add `blocked` tag, **STOP** — Awaiting user intervention.

```
PATCH /issues/[ISSUE_ID]
{
  "tags": ["blocked"]
}
```

After rebase completes, run linting, type checking, and tests.

**Validation rules:**
- All validation commands must execute and pass. A command that errors before producing results is a failure.
- Fix any errors you encounter. Do not dismiss errors as "pre-existing" or "unrelated" — resolve them or block the merge.
- Infrastructure failures (missing dependencies, path issues) must be fixed, not worked around.
- If blocked, report the failure by adding to existing open issues about the block, or by creating a new issue with "backlog" status.

Based on validation result:
- **All validation passes**: Proceed to Step 4
- **Validation fails and attempts < 3**: Fix errors, re-run validation
- **Validation fails and attempts ≥ 3**: Post error comment explaining what failed and what you attempted, add `blocked` tag, **STOP** — Awaiting user intervention.

```
PATCH /issues/[ISSUE_ID]
{
  "tags": ["blocked"]
}
```

## 4. Prepare Main Workspace

```bash
cd "$(git rev-parse --show-toplevel)"
git status --porcelain
```

Based on workspace state:
- **Uncommitted changes exist**: Stash them with `git stash push -m "pre-merge: [ISSUE_ID]"`
- **No uncommitted changes**: Proceed to Step 5

## 5. Merge Branch

```bash
git merge --no-ff "$BRANCH_NAME" -m "Merge branch '$BRANCH_NAME'

Issue: [ISSUE_ID]
Title: [TITLE]"
```

**Do not post the merge commit in a comment.**

Based on merge result:
- **Merge succeeds**: Proceed to Step 6
- **Merge fails**: Post error comment, add `blocked` tag, **STOP** — Merge failed after successful rebase.

```
PATCH /issues/[ISSUE_ID]
{
  "tags": ["blocked"]
}
```

## 6. Restore Stashed Work

Based on stash state:
- **Work was stashed in Step 4**: Run `git stash pop`
- **No stashed work**: Proceed to Step 7

## 7. Clean Up

```bash
remove-instant-worktree "$BRANCH_NAME"
```

**STOP** — Merge complete. Awaiting user verification.

</instructions>
