---
name: issue-question-response
description: Respond to user questions without code changes. Use when [HAS_PENDING_QUESTION] is true.
---

## Respond to Questions

Answer user questions before any implementation work. This cross-cutting check ensures users receive timely answers regardless of issue status.

### Step 1: Research Answer
Use codebase exploration to find accurate information. Reference specific files and line numbers when applicable.

### Step 2: Post Response
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[Your answer to the question]",
  "author": "agent",
  "codeReferences": [/* if referencing specific code */]
}
```

### Step 3: Restore Status and Clear Attention
```
PATCH /issues/[ISSUE_ID]
{
  "status": "[STATUS]",
  "needsAgentAttention": false
}
```
Restore the original status so the issue returns to its prior state after answering.

**STOP** — The question has been answered. If the user has follow-up questions or requests implementation, the system will re-invoke with updated issue data.
