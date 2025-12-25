---
name: issue-status-recovery
description: Reconcile inconsistent issue state when [STATUS] is "in_progress" but [IS_RESUMABLE] is false.
---

<placeholder-variables>

**Derived from Comments (search all comments, case-insensitive):**
- [HAS_COMPLETION_COMMENT] — True if any comment contains "Implementation Complete", "Ready for review", "Bug Fix Complete", OR has a `commitSha` field
- [COMPLETION_EVIDENCE] — First matched phrase or commitSha (chronological order)

</placeholder-variables>

<instructions>

# Status Reconciliation

Resolves state where [STATUS] is "in_progress" but [IS_RESUMABLE] is false.

## Precondition

**STOP** if any of:
- [STATUS] != "in_progress"
- [IS_RESUMABLE] == true
- [STATUS] is already "needs_review" or "todo" (already reconciled)

## Route by Completion Evidence

| Condition | Interpretation | Action |
|-----------|----------------|--------|
| [HAS_COMPLETION_COMMENT] | Work completed, status stale | **Recover** |
| NOT [HAS_COMPLETION_COMMENT] | Status set prematurely | **Reset** |

## Recover

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

## Reset

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
