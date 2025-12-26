---
name: issue-error-recovery
description: Recover from errors during any protocol execution. Use when errors occur during other protocols.
---

<placeholder-variables>
[BASE_BRANCH] — The branch from which the worktree was created (typically `main`)
</placeholder-variables>

<instructions>

## 1. Protect [BASE_BRANCH]

Abort any incomplete git operations that could corrupt the base branch:

```bash
git merge --abort 2>/dev/null || true
git rebase --abort 2>/dev/null || true
git cherry-pick --abort 2>/dev/null || true
git reset --hard HEAD
```

## 2. Attempt Recovery

For recoverable errors (test failures, lint errors, type errors), make up to 3 fix attempts:

1. Analyze the error
2. Fix in worktree
3. Re-run validation
4. If validation passes, return to the invoking protocol and continue from the step after the one that failed
5. If validation fails and attempts remain, repeat from step 1

After 3 failed attempts, proceed to section 3.

Unrecoverable errors (git conflicts, permission errors, infrastructure failures) skip directly to section 3.

## 3. Report and Block

If the issue already has the "blocked" tag from a previous recovery attempt, skip to section 4 without posting a duplicate comment.

Otherwise, post a comment documenting the error that occurred. Describe what happened, report the current state of the repository (base branch status, worktree location, which step failed), include the relevant error output, provide steps for manual resolution, and explain how to retry.

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
  "author": "agent",
  "codeReferences": [/* relevant files */]
}
```

Then proceed to section 4.

## 4. Update Status

```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review",
  "tags": ["blocked"]
}
```

</instructions>
