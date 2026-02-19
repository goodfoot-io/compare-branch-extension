---
name: backlog-response
description: Respond to backlog cards without code changes.
---


<instructions>

## 1. Constraint

Provide information only — no code changes or commits to the workspace repository. If the card contains implementation requests, explain that implementation requires moving the card to "todo" status first.

## 2. Determine Response

Read the card description and comments to understand the context. Evaluate conditions in order (first match wins):
- **Card is stale, out of scope, or superseded**: Recommend closure with honest, courteous feedback; invite user response before any status change
- **A pending question exists from the user**: Research the workspace codebase and answer the question
- **Otherwise**: Acknowledge the card remains in backlog and will be addressed when prioritized

## 3. Post Comment

Write a comment to the card repository with the appropriate response from Step 2.

## 4. Commit

Commit to the card repository:

```bash
git add comment/
git commit -m "[summary of the response: what was addressed, what recommendation was made, and why]"
```

**STOP** — Do not proceed to implementation protocols.

</instructions>
