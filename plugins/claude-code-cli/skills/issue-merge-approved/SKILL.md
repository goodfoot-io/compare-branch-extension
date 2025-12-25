---
name: issue-merge-approved
description: Merge completed implementation from worktree to main branch. Used when review is approved or when review is not required.
---

<input-format>
Extract from issue data:

**Required Fields:**
- [ISSUE_ID] = The issue's unique identifier
- [TITLE] = The issue title (`title`)
- [BRANCH_NAME] = The worktree branch name (derived or from context)

**Derived Fields:**
- [WORKTREE_PATH] = `.worktrees/[BRANCH_NAME]`
</input-format>

<tools>

### remove-instant-worktree

Removes a worktree and deletes its associated branch.

**Usage:**
```bash
remove-instant-worktree "branch-name"
```

**Output:** Returns the branch's final commit SHA before removal.

**Behavior:**
- Removes the worktree at `.worktrees/[BRANCH_NAME]`
- Deletes the local branch
- Returns the commit SHA (for reference; implementation SHA is already recorded)

</tools>

<instructions>

## Step 1: Detect Branch Name

If [BRANCH_NAME] is not provided, detect it:
```bash
# Find the worktree branch for this issue
ls -d .worktrees/issue-[ISSUE_ID]-* 2>/dev/null | head -1
```

Extract the branch name from the path.

## Step 2: Return to Main Workspace

```bash
cd "$(git rev-parse --show-toplevel)"
git status --porcelain
```

If uncommitted files exist, handle them:
- **Known artifacts** (e.g., `.compare-branch/claude-launcher-*.mjs`): Delete them
- **Legitimate uncommitted work**: Stash and restore after merge
- **Potential conflicts**: Resolve before proceeding

## Step 3: Merge Worktree Branch

```bash
# Record pre-merge state for recovery
PRE_MERGE_SHA=$(git rev-parse HEAD)

git merge --no-ff "$BRANCH_NAME" -m "Merge branch '$BRANCH_NAME'

Issue: [ISSUE_ID]
Title: [TITLE]"
```

**If merge conflict occurs:**
1. Abort merge: `git merge --abort`
2. Attempt resolution in worktree via rebase
3. If unresolvable:
   - Restore main branch: `git reset --hard $PRE_MERGE_SHA`
   - Post error comment and set status to `needs_review`

## Step 4: Clean Up Worktree

```bash
remove-instant-worktree "$BRANCH_NAME"
```

## Step 5: Update Status

**IMPORTANT:** Always set status to `needs_review`, NOT `done`. Only the user marks issues as done.

```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review"
}
```

</instructions>
