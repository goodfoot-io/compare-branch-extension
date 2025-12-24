---
name: issue-reopen-and-implement
description: Reopen completed issues for additional work. Use when [STATUS] is "done" but [HAS_REOPEN_REQUEST] is true.
---

<input-format>
Extract from issue data:

**Derived Fields:**
- [LATEST_USER_COMMENT] = Most recent comment from `author: "user"` (if any)
</input-format>

<instructions>

## Phase 1: Reopen and Implement

Use when [STATUS] is "done" but [HAS_REOPEN_REQUEST] is true. The user has explicitly requested to reopen the issue for additional work.

### Step 1.1: Acknowledge Reopen Request

Post a comment noting the reopen:
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "Reopening this issue to address: [brief summary of LATEST_USER_COMMENT]",
  "author": "agent"
}
```

### Step 1.2: Proceed to Implementation

Execute `<skill-loading-procedure>` with the updated issue data.

**Focus:** Address the specific request in [LATEST_USER_COMMENT].

</instructions>
