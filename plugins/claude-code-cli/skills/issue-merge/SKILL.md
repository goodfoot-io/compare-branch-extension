---
name: issue-merge
description: Merge completed implementation from worktree to base branch. Used when review is approved or when review is not required.
---

<placeholder-variables>
[TITLE] — The issue title
[BRANCH_NAME] — The worktree branch name
[WORKTREE_PATH] — `.worktrees/[BRANCH_NAME]`
[BASE_BRANCH] — The branch to merge into (typically `main`)
</placeholder-variables>

<tools>

### remove-instant-worktree

Removes a worktree and deletes its associated branch. Returns the branch's final commit SHA.

**Usage:** `remove-instant-worktree "[BRANCH_NAME]"`

</tools>

<instructions>

## 1. Update Status

```
PATCH /issues/[ISSUE_ID]
{
  "status": "in_progress"
}
```

## 2. Squash Commits (in Worktree)

```bash
cd ".worktrees/$BRANCH_NAME"
BRANCH_BASE=$(git merge-base HEAD $BASE_BRANCH)
COMMIT_COUNT=$(git rev-list --count "$BRANCH_BASE"..HEAD)
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
# If conflicts: resolve, then git add -A && git rebase --continue
```

After rebase completes, run linting, type checking, and tests.

**Validation rules:**
- All validation commands must execute and pass. A command that errors before producing results is a failure.
- Fix any errors you encounter. Do not dismiss errors as "pre-existing" or "unrelated" — resolve them or block the merge.
- Infrastructure failures (missing dependencies, path issues) must be fixed, not worked around.

**If rebase conflicts cannot be resolved OR validation fails after 3 attempts**: Post error comment explaining what failed and what you attempted, set status `needs_review`, add `blocked` tag, **STOP**.

## 4. Prepare Main Workspace

```bash
cd "$(git rev-parse --show-toplevel)"
git status --porcelain
```

- **If uncommitted changes exist**: Stash them:
  ```bash
  git stash push -m "pre-merge: [ISSUE_ID]"
  ```

## 5. Merge Branch

After successful rebase, the merge should succeed without conflicts:

```bash
git merge --no-ff "$BRANCH_NAME" -m "Merge branch '$BRANCH_NAME'

Issue: [ISSUE_ID]
Title: [TITLE]"
```

- **If merge fails after rebase**: Post error comment, set status to `needs_review`, **STOP**.

## 6. Restore Stashed Work

- **If work was stashed in step 4**: Restore it:
  ```bash
  git stash list | grep -q "pre-merge: [ISSUE_ID]" && git stash pop
  ```

## 7. Clean Up

```bash
remove-instant-worktree "$BRANCH_NAME"
```

## 8. Update Status

Set status to `needs_review` so the user can verify the merge. Only the user marks issues as `done`.

```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review"
}
```

</instructions>
