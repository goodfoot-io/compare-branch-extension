---
name: issue-question-response
description: Respond to user questions without code changes. Use when [HAS_PENDING_QUESTION] is true and no code changes are required.
---

## Respond to Questions

Use when [HAS_PENDING_QUESTION] is true and no code changes are required.

### Step 1: Research Answer
Use codebase exploration to find accurate information.

### Step 2: Post Response
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[Your answer to the question]",
  "author": "agent",
  "codeReferences": [/* if referencing specific code */]
}
```

### Step 3: Restore Status
```
PATCH /issues/[ISSUE_ID]
{
  "status": "[ORIGINAL_STATUS]"
}
```
This returns the issue to "needs_review" status after answering the question.
