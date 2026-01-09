---
name: issue-no-action
description: Take no action for completed issues.
---

<instructions>

Clear agent attention flag for completed or unroutable issues.

## 1. Acknowledge

Based on comment type:
- **User comment directly addresses agent without requesting action**: Briefly acknowledge what the user communicated, restating the key point to show you understood
- **Thank-you messages, status updates, or informational notes**: Skip acknowledgment

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
  "author": "agent"
}
```

## 2. Clear Attention Flag

```
PATCH /issues/[ISSUE_ID]
{
  "needsAgentAttention": false
}
```

</instructions>
