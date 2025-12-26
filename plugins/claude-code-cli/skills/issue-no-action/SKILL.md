---
name: issue-no-action
description: Take no action when no agent work is required. Use for "done" issues without reopen requests, or as fallback for unmatched routing conditions.
---

<instructions>

Clear agent attention flag for completed or unroutable issues.

## 1. Steps

1. **Acknowledge** (only if user comment directly addresses the agent without requesting action):
   Skip for thank-you messages, status updates, or informational notes.

   Briefly acknowledge what the user communicated, restating the key point to show you understood.
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
