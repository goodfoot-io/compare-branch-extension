---
name: card-reopen-and-implement
description: Reopen completed cards for additional work.
---


<instructions>

## 1. Validate Reopen Request

Read the latest user comment in the card repository to determine the reopen request.

Based on the latest user comment:
- **Empty or does not indicate what additional work is needed**: Write a comment to the card repository requesting clarification, commit, and **STOP**

```bash
cd !` echo $CARD_REPO_PATH`
cat <<'EOF' > comment/reopen-clarification.md
[clarification request content]
EOF
git add comment/reopen-clarification.md
git commit -m "[single sentence describing what is unclear about the reopen request]"  # <card-repo-commit-style>
```

Then **STOP**.

- **Contains clear request for additional work**: Proceed to Step 2

## 2. Write Acknowledgment and Commit

Write a comment to the card repository summarizing the user's request to confirm you understand what additional work they want done. Commit to the card repository:

```bash
cd !` echo $CARD_REPO_PATH`
cat <<'EOF' > comment/reopen-acknowledged.md
[summary of the user's request, confirmation of understanding, and what additional work will be done]
EOF
git add CARD.meta.json comment/reopen-acknowledged.md
git commit -m "[single sentence summarizing the additional work requested]"  # <card-repo-commit-style>
```

## 3. Delegate to Implementation

Re-evaluate the card's routing conditions based on the updated state and delegate to the appropriate implementation agent. Focus on addressing the specific request from the latest user comment.

The delegated agent handles finalization; this agent's execution ends after delegation.

</instructions>
