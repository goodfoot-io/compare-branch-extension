---
name: issue-blocked
description: Handle blocked issues by identifying and reporting blockers. Use when [IS_BLOCKED] is true.
---

<placeholder-variables>

- [BLOCKER_REASON] — Extracted from tags/comments ("blocked by", "waiting on", "depends on")
- [BLOCKING_ISSUE_ID] — Referenced issue ID, if applicable

</placeholder-variables>

<tools>

**Issues API** — Comment and update operations.

```
POST /issues/[ISSUE_ID]/comments
PATCH /issues/[ISSUE_ID]
```

</tools>

<instructions>

Do not attempt implementation until the blocker is resolved.

## 1. Analyze Blocker

Search tags and comments for blocker keywords ("blocked by", "waiting on", "depends on"). Identify the blocker reason and any referenced issue ID.

**If blocker references another issue:** Check its status. If resolved (status = "done"), remove the "blocked" tag and re-invoke skill routing.

**If blocker cannot be identified:** Post a comment asking for clarification, set `needsAgentAttention: false`, and stop.

## 2. Report Blocked Status

Skip if a "## Blocked" comment already exists with the same [BLOCKER_REASON].

### Post comment
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Blocked\n\nThis issue cannot proceed due to:\n\n**Blocker:** [BLOCKER_REASON]\n\n### To Unblock\n[action needed to resolve]\n\n---\n*I'll resume work once this blocker is resolved. Please remove the 'blocked' tag when ready.*",
  "author": "agent"
}
```

### Update issue
```
PATCH /issues/[ISSUE_ID]
{ "needsAgentAttention": false }
```

**STOP** — Do not proceed until the blocker is resolved and the "blocked" tag is removed. Skill routing will re-evaluate once the tag is removed.

</instructions>
