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

**STOP** — Do not proceed if any of the following are true:
- [STATUS] != "in_progress"
- [IS_RESUMABLE] == true
- [STATUS] is already "needs_review" or "todo" (already reconciled)

## 2. Route by Completion Evidence

| Condition | Interpretation | Action |
|-----------|----------------|--------|
| [HAS_COMPLETION_COMMENT] | Work completed, status stale | Go to Step 3 |
| NOT [HAS_COMPLETION_COMMENT] | Status set prematurely | Go to Step 4 |

## 3. Recover

1. Post recovery comment:
   ```
   POST /issues/[ISSUE_ID]/comments
   {
     "body": "Detected prior completion (evidence: [COMPLETION_EVIDENCE]). Updating status to reflect completed work.",
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

1. Post clarification comment:
   ```
   POST /issues/[ISSUE_ID]/comments
   {
     "body": "Issue was in 'in_progress' status but no prior work found. Resetting to start fresh.",
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
