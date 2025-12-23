---
name: issue-awaiting-review
description: Await user review when no feedback provided yet. Use when [STATUS] is "needs_review" but [LATEST_USER_COMMENT] is null.
---

<input-format>
Extract from issue data:

**Derived Fields:**
- [LATEST_USER_COMMENT] = Most recent comment from `author: "user"` (if any)
</input-format>

## Await Review

Use when [STATUS] is "needs_review" but [LATEST_USER_COMMENT] is null (no user has reviewed yet). The agent completed work and is waiting for the first human review.

### Step 1: Verify State
Confirm that:
- A completion comment exists from the agent
- No user feedback has been provided yet
- This is not an error state

### Step 2: Restore Status and Clear Attention Flag
The system may have erroneously flagged this for attention. Restore status and clear flag to prevent repeated no-op invocations:
```
PATCH /issues/[ISSUE_ID]
{
  "status": "[STATUS]",
  "needsAgentAttention": false
}
```
This returns the issue to "needs_review" status and clears the attention flag.

**STOP** — Wait for user to provide review feedback. No agent action required until a user comments.
