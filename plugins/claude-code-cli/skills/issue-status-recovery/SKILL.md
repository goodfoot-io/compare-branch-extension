---
name: issue-status-recovery
description: Recover or clarify issue status when state is inconsistent. Use when [STATUS] is "in_progress" but [IS_RESUMABLE] is false.
---

## Recover Status

Use when [STATUS] is "in_progress" but [IS_RESUMABLE] is false. This indicates one of two situations:

1. **Work completed but status not updated** — A completion comment exists with commitSha
2. **No work was ever started** — No worktree, status was set prematurely

### Step 1: Determine Situation

Search comments for completion indicators:
- "Implementation Complete", "Ready for review", "Bug Fix Complete"
- A `commitSha` reference

**If completion comment found:** Proceed to Step 2A (recover completed status)
**If no completion comment:** Proceed to Step 2B (reset to start work)

### Step 2A: Recover Completed Status

Post recovery comment:
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "Detected prior completion. Updating status to reflect completed work.",
  "author": "agent"
}
```

Update status:
```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review"
}
```

**STOP** — Do not re-implement. The work is already complete.

### Step 2B: Reset to Start Work

The issue was marked "in_progress" but no work began. Reset and proceed:

Post clarification comment:
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "Issue was in 'in_progress' status but no prior work was found. Starting fresh.",
  "author": "agent"
}
```

Execute skill `claude-code-cli:issue-implementation` to begin work properly.
