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

## 1. Update Status

```
PATCH /issues/[ISSUE_ID]
{
  "status": "in_progress"
}
```

## 2. Check for Changes

```bash
cd ".worktrees/$BRANCH_NAME"
BRANCH_BASE=$(git merge-base HEAD $BASE_BRANCH)
COMMIT_COUNT=$(git rev-list --count "$BRANCH_BASE"..HEAD)
```

Based on commit count:
- **COMMIT_COUNT = 0**: No changes to merge. Run `remove-instant-worktree "$BRANCH_NAME"`, set status `needs_review`, post comment "No changes found in worktree. Cleaned up branch without merging.", **STOP**
- **COMMIT_COUNT ≥ 1**: Proceed to Step 3

## 3. Squash Commits

```bash
if [ "$COMMIT_COUNT" -gt 1 ]; then
  git reset --soft "$BRANCH_BASE"
  git commit -m "feat: [TITLE]

Issue: [ISSUE_ID]"
fi
```

## 4. Rebase and Validate (in Worktree)

Rebase onto local `$BASE_BRANCH` (includes recent merges not yet pushed):

```bash
git rebase $BASE_BRANCH
```

Based on rebase result:
- **Conflicts occur**: Resolve conflicts, run `git add -A && git rebase --continue`
- **Conflicts cannot be resolved**: Post error comment, set status `needs_review`, add `blocked` tag, **STOP** — Awaiting user intervention.

After rebase completes, run linting, type checking, and tests.

**Validation rules:**
- All validation commands must execute and pass. A command that errors before producing results is a failure.
- Fix any errors you encounter. Do not dismiss errors as "pre-existing" or "unrelated" — resolve them or block the merge.
- Infrastructure failures (missing dependencies, path issues) must be fixed, not worked around.
- If blocked, report the failure by adding to existing open issues about the block, or by creating a new issue with "backlog" status.

Based on validation result:
- **All validation passes**: Proceed to Step 5
- **Validation fails and attempts < 3**: Fix errors, re-run validation
- **Validation fails and attempts ≥ 3**: Post error comment explaining what failed and what you attempted, set status `needs_review`, add `blocked` tag, **STOP** — Awaiting user intervention.

## 5. Prepare Main Workspace

```bash
cd "$(git rev-parse --show-toplevel)"
git status --porcelain
```

Based on workspace state:
- **Uncommitted changes exist**: Stash them with `git stash push -m "pre-merge: [ISSUE_ID]"`
- **No uncommitted changes**: Proceed to Step 6

## 6. Merge Branch

```bash
git merge --no-ff "$BRANCH_NAME" -m "Merge branch '$BRANCH_NAME'

Issue: [ISSUE_ID]
Title: [TITLE]"
```

Based on merge result:
- **Merge succeeds**: Proceed to Step 7
- **Merge fails**: Post error comment, set status `needs_review`, add `blocked` tag, **STOP** — Merge failed after successful rebase.

## 7. Restore Stashed Work

Based on stash state:
- **Work was stashed in Step 5**: Run `git stash pop`
- **No stashed work**: Proceed to Step 8

## 8. Clean Up

```bash
remove-instant-worktree "$BRANCH_NAME"
```

## 9. Update Status

```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review"
}
```

**STOP** — Merge complete. Awaiting user verification.

</instructions>
