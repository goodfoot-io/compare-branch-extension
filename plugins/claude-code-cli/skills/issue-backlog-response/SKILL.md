---
name: issue-backlog-response
description: Respond to backlog issues with information only - no code changes, worktrees, or commits. Use when [STATUS] is "backlog".
---

<instructions>

## 1. Constraint

Provide information only—no code changes, worktrees, or commits. If the issue contains implementation requests, explain that implementation requires moving the issue to "todo" status first.

## 2. Determine Response

Evaluate conditions in order (first match wins):
- **Issue is stale, out of scope, or superseded**: Recommend closure with honest, courteous feedback; invite user response before any status change
- **[HAS_PENDING_QUESTION] is true**: Research codebase and answer the question
- **Otherwise**: Acknowledge the issue remains in backlog and will be addressed when prioritized

## 3. Post Comment

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[Response from Step 1]\n\n---\n*Note: This issue is in backlog. Move to 'todo' status when ready to begin implementation.*",
  "author": "agent"
}
```

## 4. Clear Attention Flag

After successfully posting the comment:

```
PATCH /issues/[ISSUE_ID]
{
  "needsAgentAttention": false
}
```

**STOP** — Do not proceed to implementation protocols.

</instructions>
