---
name: issue-no-action
description: Take no action when no agent work is required. Use for "done" issues without reopen requests, or as fallback for unmatched routing conditions.
---

<instructions>

## When to Use

Use when:
- [STATUS] is "done" and [HAS_REOPEN_REQUEST] is false (completed issue, no new work requested)
- Fallback: routing conditions don't match any other skill

## Phase 1: Handle No-Action Case

### Step 1.1: Verify No Action Required

Confirm that this is genuinely a no-action case:
- [STATUS] is "done" with no reopen request, OR
- No other routing condition applies (edge case)

### Step 1.2: Acknowledge (if appropriate)

If there's a comment that warrants acknowledgment but no action:
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "Acknowledged. No further action required from me at this time.",
  "author": "agent"
}
```

### Step 1.3: Restore Original Status

```
PATCH /issues/[ISSUE_ID]
{
  "status": "[STATUS]",
  "needsAgentAttention": false
}
```
This returns the issue to its original status (e.g., "done") after acknowledgment.

</instructions>
