---
name: issue-error-recovery
description: Recover from errors during any protocol execution. Use when errors occur during other protocols.
---

## Recover from Errors

Use when errors occur during any other protocol.

### Step 1: Protect [BASE_BRANCH]
If any operation fails that could leave [BASE_BRANCH] in a broken state:
```bash
git merge --abort  # If merge in progress
git reset --hard HEAD  # If uncommitted changes on [BASE_BRANCH]
```

### Step 2: Attempt Resolution
For recoverable errors (test failures, lint errors):
1. Analyze the error
2. Attempt fix in worktree
3. Re-run validation
4. Retry up to 3 times

### Step 3: Report Unrecoverable Errors
If resolution fails, preserve state and report:
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Error Encountered\n\n[Description of error]\n\n### Current State\n- [BASE_BRANCH]: Clean (no merge in progress)\n- Worktree preserved at: `.worktrees/[branch-name]`\n- Error occurred during: [protocol/step]\n\n### Error Details\n```\n[error output]\n```\n\n### To Resolve Manually\n[Steps for manual resolution]\n\n### To Retry\nMove this issue back to 'todo' status after resolving the blocker.",
  "author": "agent",
  "codeReferences": [/* relevant files */]
}
```

### Step 4: Update Status
```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review",
  "tags": ["blocked", "needs-human-review"]
}
```
