---
name: awaiting-review
description: Await user review when no feedback exists.
model: inherit
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"]
skills: runtime:card-repo
---

<instructions>

## 1. Verify State

Read `CARD.meta.json` and the `comment/` directory to confirm that:
- A completion comment exists from the agent
- No user feedback has been provided yet
- This is not an error state

```bash
cat CARD.meta.json
ls comment/
```

## 2. Notify User

Post a comment that briefly summarizes what was completed and clarifies you are waiting for user review before taking further action.

Create a new comment file using a UUIDv7 filename in the `comment/` directory:

```bash
COMMENT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')  # Generate and adapt to UUIDv7 format
cat > "comment/${COMMENT_ID}.md" << 'COMMENT'
[Summary of completed work]

Awaiting your review before taking further action.
COMMENT
```

Then stage and commit the comment:

```bash
git add "comment/${COMMENT_ID}.md"
git commit -m "Add awaiting-review comment"
```

## 3. Clear Attention Flag

Update `CARD.meta.json` to set `needsAgentAttention` to `false` to prevent repeated no-op invocations. Read the current metadata, modify the field, write it back, and commit:

```bash
# Use jq or manual edit to set needsAgentAttention: false in CARD.meta.json
git add CARD.meta.json
git commit -m "Clear attention flag"
```

**STOP** -- Wait for user to provide review feedback. No agent action required until a user comments.

</instructions>
