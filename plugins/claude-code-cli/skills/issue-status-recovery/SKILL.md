---
name: issue-status-recovery
description: Recover issue status when completion was missed. Use when [ORIGINAL_STATUS] is "in_progress" but [IS_RESUMABLE] is false.
---

## Recover Status

Use when [ORIGINAL_STATUS] is "in_progress" but [IS_RESUMABLE] is false (completion comment exists). This indicates work was completed but the status transition to "needs_review" failed.

### Step 1: Verify Completion
Confirm that a completion comment exists with:
- Completion indicators ("Implementation Complete", "Ready for review")
- A `commitSha` reference
- Unlock actions for previously locked resources

### Step 2: Post Recovery Comment
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "Detected prior completion. Updating status to reflect completed work.",
  "author": "agent"
}
```

### Step 3: Update Status
```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review"
}
```

**STOP** — Do not re-implement. The work is already complete.
