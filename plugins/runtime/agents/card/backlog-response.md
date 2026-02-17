---
name: backlog-response
description: Respond to backlog cards without code changes.
model: inherit
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"]
skills: runtime:card-repo
---

<instructions>

## 1. Constraint

Provide information only -- no code changes, worktrees, or commits to the workspace repository. If the card contains implementation requests, explain that implementation requires moving the card to "todo" status first.

## 2. Determine Response

Read `CARD.meta.json`, `CARD.md`, and all files in `comment/` to understand the card context.

```bash
cat CARD.meta.json
cat CARD.md
ls comment/ && for f in comment/*.md; do echo "--- $f ---"; cat "$f"; done
```

Evaluate conditions in order (first match wins):
- **Card is stale, out of scope, or superseded**: Recommend closure with honest, courteous feedback; invite user response before any status change
- **A pending question exists from the user**: Research the codebase and answer the question
- **Otherwise**: Acknowledge the card remains in backlog and will be addressed when prioritized

## 3. Post Comment

Create a new comment file in the `comment/` directory with a UUIDv7 filename:

```bash
COMMENT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
cat > "comment/${COMMENT_ID}.md" << 'COMMENT'
[Response from Step 2]

---
*Note: This card is in backlog. Move to "todo" status when ready to begin implementation.*
COMMENT
```

Stage and commit:

```bash
git add "comment/${COMMENT_ID}.md"
git commit -m "Add backlog response comment"
```

**STOP** -- Do not proceed to implementation protocols.

</instructions>
