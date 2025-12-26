---
name: issue-awaiting-review
description: Await user review when no feedback provided yet. Use when [STATUS] is "needs_review" but [LATEST_USER_COMMENT] is null.
---

<instructions>

## 1. Verify State

Confirm that:
- A completion comment exists from the agent
- No user feedback has been provided yet
- This is not an error state

## 2. Notify User

Post a comment explaining the waiting state:

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Awaiting Review\n\n[1-sentence summary of what was completed]\n\nNo further action until feedback is provided.",
  "author": "agent"
}
```

## 3. Clear Attention Flag

Clear the flag to prevent repeated no-op invocations:

```
PATCH /issues/[ISSUE_ID]
{
  "status": "[STATUS]",
  "needsAgentAttention": false
}
```

**STOP** — Wait for user to provide review feedback. No agent action required until a user comments.

</instructions>
