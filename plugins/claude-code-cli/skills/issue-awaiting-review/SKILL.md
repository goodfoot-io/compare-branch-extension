---
name: issue-awaiting-review
description: Await user review when no feedback exists.
---

<instructions>

## 1. Verify State

Confirm that:
- A completion comment exists from the agent
- No user feedback has been provided yet
- This is not an error state

## 2. Notify User

Post a comment that briefly summarizes what was completed and clarifies you're waiting for user review before taking further action.

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
  "author": "agent"
}
```

## 3. Clear Attention Flag

Clear the flag to prevent repeated no-op invocations:

```
PATCH /issues/[ISSUE_ID]
{
  "needsAgentAttention": false
}
```

**STOP** — Wait for user to provide review feedback. No agent action required until a user comments.

</instructions>
