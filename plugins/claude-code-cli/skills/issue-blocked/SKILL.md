---
name: issue-blocked
description: Handle blocked issues by identifying and reporting blockers. Use when [IS_BLOCKED] is true.
---

## Handle Blocked Issues

Use when [IS_BLOCKED] is true. Do not attempt implementation until blocker is resolved.

### Step 1: Identify Blocker
Extract blocker reason from tags or comments (look for "blocked by", "waiting on", "depends on"). Classify as:
- Another issue (internal dependency)
- External dependency (third-party, infrastructure)
- Missing information (awaiting user input)
- Technical constraint (requires changes elsewhere first)

### Step 2: Check Blocker Status
If blocker references another issue:
- Check if the blocking issue has been resolved
- If resolved, remove "blocked" tag and re-route to appropriate protocol

### Step 3: Report Blocked Status (if still blocked)
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Blocked\n\nThis issue cannot proceed due to:\n\n**Blocker:** [extracted blocker reason]\n\n### To Unblock\n[Specific action needed to resolve the blocker]\n\n---\n*I'll resume work once this blocker is resolved. Please remove the 'blocked' tag or update the status when ready.*",
  "author": "agent"
}
```

### Step 4: Update Status
```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review",
  "needsAgentAttention": false
}
```

**STOP** — Do not proceed until blocker is resolved and issue is re-assigned.
