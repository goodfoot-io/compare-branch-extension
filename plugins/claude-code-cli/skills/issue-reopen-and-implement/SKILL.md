---
name: issue-reopen-and-implement
description: Reopen completed issues for additional work. Use when [STATUS] is "done" but [HAS_REOPEN_REQUEST] is true.
---

<instructions>

## 1. Validate Reopen Request

If [LATEST_USER_COMMENT] is empty or does not indicate what additional work is needed:
- Post comment requesting clarification
- Set status to `needs_review`
- **STOP** — Issue requires user clarification on additional work needed

## 2. Update Status and Acknowledge

Update status and post acknowledgment:

```
PATCH /issues/[ISSUE_ID]
{ "status": "in_progress" }
```

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "Reopening to address: [1-2 sentence summary of user's request from LATEST_USER_COMMENT]",
  "author": "agent"
}
```

## 3. Delegate to Implementation

Execute `<skill-loading-procedure>` with the updated issue data.

The procedure (defined in `prompt.md`) re-evaluates routing conditions and selects the appropriate implementation skill. Focus on addressing the specific request in [LATEST_USER_COMMENT].

The delegated skill handles finalization; this skill's execution ends after delegation.

</instructions>
