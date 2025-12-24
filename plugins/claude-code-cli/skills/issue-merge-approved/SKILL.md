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
- Returns the commit SHA (not needed here since we use MERGE_SHA)

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
git merge --no-ff "$BRANCH_NAME" -m "Merge branch '$BRANCH_NAME'

Issue: [ISSUE_ID]
Title: [TITLE]"
MERGE_SHA=$(git rev-parse HEAD)
```

Post merge commit to issue:
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "Merged branch '$BRANCH_NAME' to main",
  "author": "agent",
  "commitSha": "[MERGE_SHA]"
}
```

**If merge conflict occurs:**
1. Abort merge: `git merge --abort`
2. Attempt resolution in worktree via rebase
3. If unresolvable, post error comment and set status to `needs_review`

## Step 4: Clean Up Worktree

```bash
remove-instant-worktree "$BRANCH_NAME"
```

## Step 5: Post Completion Comment

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Implementation Complete\n\n[Summary of changes]\n\n### Files Modified\n- [list of files]\n\n### Testing\n- All tests passing\n- Type checking: zero errors\n- Linting: no violations\n\nReady for review.",
  "author": "agent",
  "commitSha": "[MERGE_SHA]",
  "codeReferences": [/* all modified files with line ranges */]
}
```

## Step 6: Update Status

**IMPORTANT:** Always set status to `needs_review`, NOT `done`. Only the user marks issues as done.

```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review",
  "commitSha": "[MERGE_SHA]"
}
```

</instructions>
