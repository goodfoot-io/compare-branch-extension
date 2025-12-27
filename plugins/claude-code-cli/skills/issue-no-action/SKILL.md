---
name: issue-no-action
description: Take no action when no agent work is required. Use for "done" issues without reopen requests, or as fallback for unmatched routing conditions.
---

<instructions>

Clear agent attention flag for completed or unroutable issues.

## 1. Steps

1. **Acknowledge** (conditional):
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

2. **Clear attention flag**:
   ```
   PATCH /issues/[ISSUE_ID]
   {
     "status": "[STATUS]",
     "needsAgentAttention": false
   }
   ```

</instructions>
