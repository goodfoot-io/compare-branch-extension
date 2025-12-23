---
name: issue-backlog-response
description: Respond to backlog issues with information only - no code changes, worktrees, or commits. Use when [STATUS] is "backlog".
---

## Respond to Backlog Issues

Use when [STATUS] is "backlog". Provide information only—no code changes, worktrees, or commits.

### Step 1: Assess Viability
If the issue appears unlikely to ever be addressed (stale, out of scope, or superseded):
- Recommend closure with honest, courteous feedback
- Keep the backlog reflective of actual intended work

### Step 2: Research and Respond
If [HAS_PENDING_QUESTION] is true, research the codebase and provide helpful information.

### Step 3: Post Comment
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[Your informational response]\n\n---\n*Note: This issue is in backlog. Move to 'todo' status when ready to begin implementation.*",
  "author": "agent"
}
```

### Step 4: Restore Status and Clear Attention Flag
```
PATCH /issues/[ISSUE_ID]
{
  "status": "[STATUS]",
  "needsAgentAttention": false
}
```
This returns the issue to "backlog" status after the agent's informational response.

**STOP** — Do not proceed to implementation protocols.
