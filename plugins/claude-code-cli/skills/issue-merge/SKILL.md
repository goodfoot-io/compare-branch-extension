---
name: issue-merge
description: Merge completed implementation from worktree to main branch. Used when review is approved or when review is not required.
---

<placeholder-variables>
[TITLE] — The issue title
[BRANCH_NAME] — The worktree branch name
[WORKTREE_PATH] — `.worktrees/[BRANCH_NAME]`
</placeholder-variables>

<tools>

### remove-instant-worktree

Removes a worktree and deletes its associated branch. Returns the branch's final commit SHA.

**Usage:** `remove-instant-worktree "[BRANCH_NAME]"`

</tools>

<instructions>

## 1. Prepare Main Workspace

```bash
cd "$(git rev-parse --show-toplevel)"
git status --porcelain
```

Based on uncommitted file type:
- **Known artifacts** (`.compare-branch/claude-launcher-*.mjs`): Delete
- **Legitimate uncommitted work**: `git stash push -m "pre-merge: [ISSUE_ID]"`
- **Potential conflicts**: Resolve before proceeding

## 2. Squash Commits in Worktree

```bash
cd ".worktrees/$BRANCH_NAME"
BRANCH_BASE=$(git merge-base HEAD main)
COMMIT_COUNT=$(git rev-list --count "$BRANCH_BASE"..HEAD)
if [ "$COMMIT_COUNT" -gt 1 ]; then
  git reset --soft "$BRANCH_BASE"
  git commit -m "feat: [TITLE]

Issue: [ISSUE_ID]"
fi
cd "$(git rev-parse --show-toplevel)"
```

## 3. Merge Branch

```bash
PRE_MERGE_SHA=$(git rev-parse HEAD)

git merge --no-ff "$BRANCH_NAME" -m "Merge branch '$BRANCH_NAME'

Issue: [ISSUE_ID]
Title: [TITLE]"
```

### Merge Conflict Handling

If merge conflict occurs:

1. Abort the merge:
   ```bash
   git merge --abort
   ```

2. Attempt resolution in worktree:
   ```bash
   cd ".worktrees/$BRANCH_NAME"
   git fetch origin main
   git rebase origin/main
   # Resolve any rebase conflicts
   cd "$(git rev-parse --show-toplevel)"
   ```
   Then retry the merge command above.

3. If conflicts cannot be resolved:
   ```bash
   git reset --hard $PRE_MERGE_SHA
   ```
   Post error comment and set status to `needs_review`.

## 4. Restore Stashed Work

If work was stashed in step 2:

```bash
git stash list | grep -q "pre-merge: [ISSUE_ID]" && git stash pop
```

## 5. Clean Up

```bash
remove-instant-worktree "$BRANCH_NAME"
```

## 6. Update Status

Set status to `needs_review` so the user can verify the merge. Only the user marks issues as `done`.

```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review"
}
```

</instructions>
