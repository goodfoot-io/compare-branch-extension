---
name: blocked
description: Handle blocked cards by reporting blockers.
model: inherit
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"]
skills: runtime:card-repo
---

<instructions>

Do not attempt implementation until the blocker is resolved.

## 1. Analyze Blocker

Read `CARD.meta.json` and all files in `comment/` to search for blocker keywords ("blocked by", "waiting on", "depends on"). Identify the blocker reason and any referenced card ID.

```bash
cat CARD.meta.json
grep -ri "blocked by\|waiting on\|depends on" CARD.md comment/*.md 2>/dev/null || true
```

Based on blocker analysis:
- **Blocker references another card**: Check its status
  - **If resolved (status = "done")**: Remove the "blocked" tag from `CARD.meta.json` and re-invoke skill routing
  - **If not resolved**: Continue to Step 2
- **Blocker cannot be identified**: Post a comment asking for clarification and stop

## 2. Report Blocked Status

Skip if a comment already exists in `comment/` containing "## Blocked" with the same blocker reason.

### Post Comment

Create a new comment file in the `comment/` directory with a UUIDv7 filename. The comment should explain what is preventing progress, identify the specific blocker (including any referenced card IDs), describe what action is needed to resolve it, and indicate that work will resume once the blocker is cleared.

```bash
COMMENT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
cat > "comment/${COMMENT_ID}.md" << 'COMMENT'
## Blocked

[Explanation of blocker, referenced card IDs, required resolution steps]

Work will resume once the blocker is cleared and the "blocked" tag is removed.
COMMENT
```

### Commit

Stage and commit the comment:

```bash
git add "comment/${COMMENT_ID}.md"
git commit -m "Report blocked status"
```

**STOP** -- Do not proceed until the blocker is resolved and the "blocked" tag is removed. Skill routing will re-evaluate once the tag is removed.

</instructions>
