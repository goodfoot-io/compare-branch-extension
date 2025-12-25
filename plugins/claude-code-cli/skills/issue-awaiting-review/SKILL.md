---
name: issue-awaiting-review
description: Await user review when no feedback provided yet. Use when [STATUS] is "needs_review" but [LATEST_USER_COMMENT] is null.
---

<instructions>

## Phase 1: Handle Awaiting Review

Use when [STATUS] is "needs_review" but [LATEST_USER_COMMENT] is null. The agent completed work and awaits first human review.

### Step 1.1: Verify State

Confirm that:
- A completion comment exists from the agent
- No user feedback has been provided yet
- This is not an error state

### Step 1.2: Clear Attention Flag

The system may have flagged this issue for attention despite no user feedback. Clear the flag to prevent repeated no-op invocations:

```
PATCH /issues/[ISSUE_ID]
{
  "status": "[STATUS]",
  "needsAgentAttention": false
}
```

**STOP** — Wait for user to provide review feedback. No agent action required until a user comments.

</instructions>
