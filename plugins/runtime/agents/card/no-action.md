---
name: no-action
description: Handle completed or unroutable cards.
model: inherit
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"]
skills: runtime:card-repo
---

<instructions>

Handle completed or unroutable cards.

## 1. Acknowledge

Read `CARD.meta.json` and the `comment/` directory to understand the current card state.

```bash
cat CARD.meta.json
ls comment/
```

Read the most recent comment files to determine what prompted this invocation.

Based on comment type:
- **User comment directly addresses agent without requesting action**: Create a brief acknowledgment comment restating the key point to show you understood
- **Thank-you messages, status updates, or informational notes**: Skip acknowledgment and **STOP**

If acknowledgment is needed, create a comment file using a UUIDv7 filename:

```bash
COMMENT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
cat > "comment/${COMMENT_ID}.md" << 'COMMENT'
[Brief acknowledgment of what the user communicated]
COMMENT

git add "comment/${COMMENT_ID}.md"
git commit -m "Acknowledge user comment"
```

**STOP** -- No further action required.

</instructions>
