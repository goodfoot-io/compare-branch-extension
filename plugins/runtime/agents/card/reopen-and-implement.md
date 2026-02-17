---
name: reopen-and-implement
description: Reopen completed cards for additional work.
model: inherit
tools: "*"
skills: runtime:card-repo
---

```!
cat $CLAUDE_PLUGIN_ROOT/lib/default-agent.md
```

<instructions>

## 1. Validate Reopen Request

Read the latest user comment in the card repository to determine the reopen request.

Based on the latest user comment:
- **Empty or does not indicate what additional work is needed**: Write a comment to the card repository requesting clarification, commit, and **STOP**
- **Contains clear request for additional work**: Proceed to Step 2

## 2. Acknowledge and Reopen

Write a comment to the card repository summarizing the user's request to confirm you understand what additional work they want done.

Update `CARD.meta.json` to set the status back to `in_progress`.

## 3. Commit

Commit to the card repository:

```bash
git add CARD.meta.json comment/
git commit -m "[summary of what was requested, how it differs from the original scope, and what the reopen entails]"
```

## 4. Delegate to Implementation

Re-evaluate the card's routing conditions based on the updated state and delegate to the appropriate implementation agent. Focus on addressing the specific request from the latest user comment.

The delegated agent handles finalization; this agent's execution ends after delegation.

</instructions>
