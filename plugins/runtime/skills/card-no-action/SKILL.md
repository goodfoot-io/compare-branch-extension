---
name: no-action
description: Handle completed or unroutable cards.
---


<instructions>

Handle completed or unroutable cards.

## 1. Acknowledge

Read the most recent comments in the card repository to determine what prompted this invocation.

Based on comment type:
- **User comment directly addresses agent without requesting action**: Write a brief acknowledgment comment to the card repository restating the key point to show you understood
- **Thank-you messages, status updates, or informational notes**: Skip acknowledgment and **STOP**

## 2. Write Acknowledgment and Commit

Write a brief acknowledgment comment to the card repository restating the key point to show you understood.

If acknowledgment was written, commit to the card repository:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE `! echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[brief acknowledgment restating the key point to show understanding]
EOF
git add comment/$COMMENT_ID.md
git commit -m "[acknowledged: no action needed]"  # <card-repo-commit-style>
```

**STOP** — No further action required.

</instructions>
