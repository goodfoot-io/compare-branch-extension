---
name: reopen-and-implement
description: Reopen completed cards for additional work.
---


<instructions>

## 1. Validate Reopen Request

Read the latest user comment in the card repository to determine the reopen request.

Based on the latest user comment:
- **Empty or does not indicate what additional work is needed**: Write a comment to the card repository requesting clarification, commit, and **STOP**
- **Contains clear request for additional work**: Proceed to Step 2

## 2. Acknowledge and Reopen

Update `CARD.meta.json` to set the status back to `in_progress`.

Write a comment to the card repository summarizing the user's request to confirm you understand what additional work they want done. Commit to the card repository:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE !`echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[summary of the user's request, confirmation of understanding, and what additional work will be done]
EOF
git add CARD.meta.json comment/$COMMENT_ID.md
git commit -m "[summary of what was requested, how it differs from the original scope, and what the reopen entails]"
```

## 3. Delegate to Implementation

Re-evaluate the card's routing conditions based on the updated state and delegate to the appropriate implementation agent. Focus on addressing the specific request from the latest user comment.

The delegated agent handles finalization; this agent's execution ends after delegation.

</instructions>
