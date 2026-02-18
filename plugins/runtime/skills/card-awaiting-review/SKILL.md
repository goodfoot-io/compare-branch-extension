---
name: awaiting-review
description: Await user review when no feedback exists.
---


<instructions>

## 1. Verify State

Confirm from the card repository that:
- A completion comment exists from the agent
- No user feedback has been provided yet
- This is not an error state

## 2. Notify User

Write a comment to the card repository that briefly summarizes what was completed and clarifies you are waiting for user review before taking further action.

## 3. Commit

Commit to the card repository:

```bash
git add comment/
git commit -m "[summary of completed work and what the reviewer should focus on]"
```

**STOP** — Wait for user to provide review feedback. No agent action required until a user comments.

</instructions>
