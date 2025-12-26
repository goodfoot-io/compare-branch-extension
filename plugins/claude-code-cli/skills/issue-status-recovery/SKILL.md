---
name: issue-status-recovery
description: Reconcile inconsistent issue state when [STATUS] is "in_progress" but [IS_RESUMABLE] is false.
---

<placeholder-variables>
[HAS_COMPLETION_COMMENT] — True if any comment contains "Implementation Complete", "Ready for review", "Bug Fix Complete", OR has a `commitSha` field (derived from comments, search all comments, case-insensitive)
[COMPLETION_EVIDENCE] — First matched phrase or commitSha in chronological order
</placeholder-variables>

<instructions>

## 1. Precondition

Resolves state where [STATUS] is "in_progress" but [IS_RESUMABLE] is false.

If any of the following are true, notify and stop:
- [STATUS] != "in_progress"
- [IS_RESUMABLE] == true
- [STATUS] is already "needs_review" or "todo" (already reconciled)

Post a comment explaining what state was checked and why no recovery action is needed.

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
  "author": "agent"
}
```

```
PATCH /issues/[ISSUE_ID]
{
  "needsAgentAttention": false
}
```

**STOP** — Preconditions not met; no recovery action required.

## 2. Route by Completion Evidence

| Condition | Interpretation | Action |
|-----------|----------------|--------|
| [HAS_COMPLETION_COMMENT] | Work completed, status stale | Go to Step 3 |
| NOT [HAS_COMPLETION_COMMENT] | Status set prematurely | Go to Step 4 |

## 3. Recover

1. Post a comment citing the specific evidence of prior completion you found, and explain you're updating the status to reflect the completed work.
   ```
   POST /issues/[ISSUE_ID]/comments
   {
     "body": "[comment content]",
     "author": "agent"
   }
   ```

2. Update status:
   ```
   PATCH /issues/[ISSUE_ID]
   { "status": "needs_review" }
   ```

**STOP** — Do not re-implement. Work is already complete.

## 4. Reset

1. Post a comment explaining that no prior work was found for this issue, state you're resetting it to "todo", and that you'll begin implementation.
   ```
   POST /issues/[ISSUE_ID]/comments
   {
     "body": "[comment content]",
     "author": "agent"
   }
   ```

2. Reset status:
   ```
   PATCH /issues/[ISSUE_ID]
   { "status": "todo" }
   ```

3. Begin implementation:
   ```xml
   <invoke name="Skill">
     <parameter name="skill">claude-code-cli:issue-implementation</parameter>
   </invoke>
   ```

</instructions>
