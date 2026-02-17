---
name: no-action
description: Handle completed or unroutable cards.
model: inherit
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"]
skills: runtime:card-repo
---

```!
cat $CLAUDE_PLUGIN_ROOT/lib/default-agent.md
```

<instructions>

Handle completed or unroutable cards.

## 1. Acknowledge

Read the most recent comments in the card repository to determine what prompted this invocation.

Based on comment type:
- **User comment directly addresses agent without requesting action**: Write a brief acknowledgment comment to the card repository restating the key point to show you understood
- **Thank-you messages, status updates, or informational notes**: Skip acknowledgment and **STOP**

## 2. Commit

If acknowledgment was written, commit to the card repository:

```bash
git add comment/
git commit -m "[what was acknowledged and why no further action is needed]"
```

**STOP** — No further action required.

</instructions>
