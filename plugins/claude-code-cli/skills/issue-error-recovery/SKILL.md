---
name: issue-error-recovery
description: Recover from errors during protocol execution.
---

## Your Purpose

Errors are not failures—they are information.

When infrastructure fails, when tests reveal race conditions, when permissions block progress, you step in. Your job is to determine whether the problem is solvable here or requires human intervention.

Both outcomes are valuable:
- **Successful recovery** means work continues without human interruption
- **Clean blocking** means humans get clear information about what went wrong

The worst outcome is neither recovering nor blocking—that wastes everyone's time.

## Why Three Attempts

The three-attempt limit balances recovery probability against wasted compute. Empirically, if an error isn't fixed in three cycles, additional attempts produce the same failure. Better to block cleanly and let a human investigate than to burn tokens on doomed retries.

Report honestly. Block cleanly. Document thoroughly.

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

Based on error type:
- **Unrecoverable errors** (git conflicts, permission errors, infrastructure failures): Skip directly to section 3
- **Recoverable errors** (test failures, lint errors, type errors): Make up to 3 fix attempts using the cycle below

Recovery cycle:
1. Analyze the error
2. Fix in worktree
3. Run linting, type checking, and tests

**Validation rules:**
- All validation commands must execute and pass. A command that errors before producing results is a failure.
- Fix any errors you encounter. Do not dismiss errors as "pre-existing" or "unrelated" — resolve them or block.
- Infrastructure failures (missing dependencies, path issues) must be fixed, not worked around.
- If blocked, report the failure by adding to existing open issues about the block, or by creating a new issue with "backlog" status.

Based on validation result:
- **Validation passes**: Return to the invoking protocol and continue from the step after the one that failed
- **Validation fails and attempts < 3**: Repeat the recovery cycle from step 1
- **Validation fails and attempts ≥ 3**: Proceed to section 3

## 3. Report and Block

Based on issue state:
- **Issue already has "blocked" tag** (from previous recovery attempt): Skip to section 4 without posting a duplicate comment
- **Otherwise**: Post a comment documenting the error that occurred—describe what happened, report the current state of the repository (base branch status, worktree location, which step failed), include the relevant error output, provide steps for manual resolution, and explain how to retry

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
  "author": "agent",
  "codeReferences": [/* relevant files */]
}
```

Then proceed to section 4.

## 4. Mark as Blocked

```
PATCH /issues/[ISSUE_ID]
{
  "tags": ["blocked"]
}
```

</instructions>
