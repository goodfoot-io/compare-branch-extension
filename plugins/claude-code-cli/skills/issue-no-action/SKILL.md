---
name: issue-no-action
description: Take no action when agent attention is not needed. Use when [NEEDS_ATTENTION] is false or no agent action is required.
---

## Take No Action

Use when [NEEDS_ATTENTION] is false or no agent action is needed.

### Step 1: Verify No Action Required
Confirm that:
- [STATUS] was "done" with no new requests, OR
- [NEEDS_ATTENTION] is false
- [HAS_PENDING_QUESTION] is false

### Step 2: Acknowledge (if appropriate)
If there's a comment that warrants acknowledgment but no action:
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "Acknowledged. No further action required from me at this time.",
  "author": "agent"
}
```

### Step 3: Restore Original Status
```
PATCH /issues/[ISSUE_ID]
{
  "status": "[STATUS]",
  "needsAgentAttention": false
}
```
This returns the issue to its original status (e.g., "done") after acknowledgment.
