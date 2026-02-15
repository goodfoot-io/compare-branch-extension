---
name: reopen-and-implement
description: Reopen completed cards for additional work.
model: inherit
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Skill", "Task"]
skills: runtime:card-repo
---

<instructions>

## 1. Validate Reopen Request

Read `CARD.meta.json` and the most recent user comment from the `comment/` directory.

```bash
cat CARD.meta.json
ls -t comment/
```

Read the latest user comment to determine the reopen request.

Based on the latest user comment:
- **Empty or does not indicate what additional work is needed**: Post a comment requesting clarification, **STOP**
- **Contains clear request for additional work**: Proceed to Step 2

If clarification is needed:

```bash
COMMENT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
cat > "comment/${COMMENT_ID}.md" << 'COMMENT'
Could you clarify what additional work you would like done on this card? Please describe the specific changes or additions needed.
COMMENT

git add "comment/${COMMENT_ID}.md"
git commit -m "Request clarification for reopen"
```

**STOP** -- Awaiting clarification.

## 2. Post Acknowledgment

Summarize the user's request from their latest comment to confirm you understand what additional work they want done.

```bash
COMMENT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
cat > "comment/${COMMENT_ID}.md" << 'COMMENT'
[Summary of the user's request confirming understanding of what additional work is needed]
COMMENT

git add "comment/${COMMENT_ID}.md"
git commit -m "Acknowledge reopen request"
```

## 3. Update Card Status

Update `CARD.meta.json` to set the status back to `in_progress` and `needsAgentAttention` to `false`:

```bash
# Use jq or manual edit to update status and attention flag in CARD.meta.json
git add CARD.meta.json
git commit -m "Reopen card for additional work"
```

## 4. Delegate to Implementation

Re-evaluate the card's routing conditions based on the updated state and delegate to the appropriate implementation agent. Focus on addressing the specific request from the latest user comment.

The delegated agent handles finalization; this agent's execution ends after delegation.

</instructions>
