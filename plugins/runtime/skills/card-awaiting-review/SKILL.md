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

## 2. Write Comment and Commit

Write a comment to the card repository that briefly summarizes what was completed and clarifies you are waiting for user review before taking further action.

Commit to the card repository:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[brief summary of what was completed and a note that you are waiting for user review before taking further action]
EOF
git add comment/$COMMENT_ID.md
git commit -m "awaiting review: work complete"  # <card-repo-commit-style>
```

**STOP** — Wait for user to provide review feedback. No agent action required until a user comments.

</instructions>
