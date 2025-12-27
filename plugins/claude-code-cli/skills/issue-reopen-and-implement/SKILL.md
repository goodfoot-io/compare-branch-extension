---
name: issue-reopen-and-implement
description: Reopen completed issues for additional work. Use when [STATUS] is "done" but [HAS_REOPEN_REQUEST] is true.
---

<instructions>

## 1. Validate Reopen Request

Based on [LATEST_USER_COMMENT]:
- **Empty or does not indicate what additional work is needed**: Post comment requesting clarification, set status to `needs_review`, **STOP**
- **Contains clear request for additional work**: Proceed to Step 2

## 2. Update Status and Acknowledge

Update status and post acknowledgment. Summarize the user's request from their latest comment to confirm you understand what additional work they want done.

```
PATCH /issues/[ISSUE_ID]
{ "status": "in_progress" }
```

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
  "author": "agent"
}
```

## 3. Delegate to Implementation

Execute `<skill-loading-procedure>` with the updated issue data.

The procedure (defined in `prompt.md`) re-evaluates routing conditions and selects the appropriate implementation skill. Focus on addressing the specific request in [LATEST_USER_COMMENT].

The delegated skill handles finalization; this skill's execution ends after delegation.

</instructions>
