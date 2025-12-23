---
name: issue-reopen-and-implement
description: Reopen completed issues for additional work. Use when [ORIGINAL_STATUS] is "done" but [HAS_REOPEN_REQUEST] is true.
---

<input-format>
Extract from issue data:

**Derived Fields:**
- [LATEST_USER_COMMENT] = Most recent comment from `author: "user"` (if any)
</input-format>

## Reopen and Implement

Use when [ORIGINAL_STATUS] is "done" but [HAS_REOPEN_REQUEST] is true. The user has explicitly requested to reopen the issue for additional work.

### Step 1: Acknowledge Reopen Request
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "Reopening this issue to address the additional request.",
  "author": "agent"
}
```

### Step 2: Confirm Status
Status is already `in_progress` (set by Instructions Step 4). No additional update needed.

### Step 3: Proceed to Implementation
Continue with `<code-implementation-protocol>` starting at Step 1, treating this as new work:
- [IS_RESUMABLE] is false (no prior work on this new request)
- Create checkpoint commit (Step 3 of code-implementation-protocol)
- Create fresh worktree (Step 4)
- Implement the requested changes (Step 5+)

The agent should address the specific request in [LATEST_USER_COMMENT], not re-implement the entire original issue.

### Step 4: Update Status After Completion

**IMPORTANT:** After implementation is complete, always set status to `needs_review`:

```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review",
  "commitSha": "[FINAL_SHA]"
}
```

Never set status to `done`. Only the user marks issues as done after reviewing the work.
