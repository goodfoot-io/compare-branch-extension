---
name: blocked
description: Handle blocked cards by reporting blockers.
---


<instructions>

Do not attempt implementation until the blocker is resolved.

## 1. Analyze Blocker

Search the card description and comments for blocker keywords ("blocked by", "waiting on", "depends on"). Identify the blocker reason and any referenced card ID.

Based on blocker analysis:
- **Blocker references another card**: Check its status
  - **If resolved (status = "done")**: Remove the "blocked" tag from `CARD.meta.json` and re-invoke routing
  - **If not resolved**: Continue to Step 2
- **Blocker cannot be identified**: Post a comment asking for clarification and stop

## 2. Report Blocked Status

Skip if a comment already exists containing "## Blocked" with the same blocker reason.

Write a comment to the card repository explaining what is preventing progress, identifying the specific blocker (including any referenced card IDs), describing what action is needed to resolve it, and indicating that work will resume once the blocker is cleared.

## 3. Commit

Commit to the card repository:

```bash
git add comment/
git commit -m "[what the blocker is, which card or dependency it references, and what resolution is needed]"
```

**STOP** — Do not proceed until the blocker is resolved and the "blocked" tag is removed. Routing will re-evaluate once the tag is removed.

</instructions>
