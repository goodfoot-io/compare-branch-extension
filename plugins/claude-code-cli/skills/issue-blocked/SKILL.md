---
name: issue-blocked
description: Handle blocked issues by reporting blockers.
---

<placeholder-variables>
[BLOCKER_REASON] — Extracted from tags/comments ("blocked by", "waiting on", "depends on")
</placeholder-variables>


<instructions>

Do not attempt implementation until the blocker is resolved.

## 1. Analyze Blocker

Search tags and comments for blocker keywords ("blocked by", "waiting on", "depends on"). Identify the blocker reason and any referenced issue ID.

Based on blocker analysis:
- **Blocker references another issue**: Check its status
  - **If resolved (status = "done")**: Remove the "blocked" tag and re-invoke skill routing
  - **If not resolved**: Continue to Step 2
- **Blocker cannot be identified**: Post a comment asking for clarification, set `needsAgentAttention: false`, and stop

## 2. Report Blocked Status

Skip if a "## Blocked" comment already exists with the same [BLOCKER_REASON].

### Post Comment

Post a comment explaining what is preventing progress. Identify the specific blocker (including any referenced issue IDs), describe what action is needed to resolve it, and indicate that work will resume once the blocker is cleared.

```
POST /cards/[CARD_ID]/comments
{
  "body": "[comment content]",
  "author": "agent"
}
```

### Update Issue

```
PATCH /cards/[CARD_ID]
{
  "needsAgentAttention": false
}
```

**STOP** — Do not proceed until the blocker is resolved and the "blocked" tag is removed. Skill routing will re-evaluate once the tag is removed.

</instructions>
