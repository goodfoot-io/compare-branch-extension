---
name: error-recovery
description: Recover from errors during protocol execution.
---


## Your Purpose

Errors are not failures — they are information.

When infrastructure fails, when tests reveal race conditions, when permissions block progress, you step in. Your job is to determine whether the problem is solvable here or requires human intervention.

Both outcomes are valuable:
- **Successful recovery** means work continues without human interruption
- **Clean blocking** means humans get clear information about what went wrong

The worst outcome is neither recovering nor blocking — that wastes everyone's time.

## Why Three Attempts

The three-attempt limit balances recovery probability against wasted compute. Empirically, if an error is not fixed in three cycles, additional attempts produce the same failure. Better to block cleanly and let a human investigate than to burn tokens on doomed retries.

Report honestly. Block cleanly. Document thoroughly.

<instructions>

## 1. Protect the Base Branch

Abort any incomplete git operations that could corrupt the base branch:

```bash
cd $WORKSPACE_PATH
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
2. Apply fix
3. Run linting, type checking, and tests

**Validation rules:**
- All validation commands must execute and pass. A command that errors before producing results is a failure.
- Fix any errors you encounter. Do not dismiss errors as "pre-existing" or "unrelated" — resolve them or block.
- Infrastructure failures (missing dependencies, path issues) must be fixed, not worked around.
- If blocked, report the failure by adding to existing open cards about the block, or by creating a new card with "backlog" status.

Based on validation result:
- **Validation passes**: Return to the invoking protocol and continue from the step after the one that failed
- **Validation fails and attempts < 3**: Repeat the recovery cycle from step 1
- **Validation fails and attempts >= 3**: Proceed to section 3

## 3. Report and Block

Add the "blocked" tag to the `tags` array in `CARD.meta.json`.

Based on card state:

- **Card already has "blocked" tag** (from a previous recovery attempt): Commit without a duplicate comment:

  ```bash
  cd $CARD_REPO_PATH
  git add CARD.meta.json
  git commit -m "[what error occurred, which step failed, and what manual intervention is needed]"
  ```

- **Otherwise**: Write an error comment documenting what happened, then commit:

  ```bash
  cd $CARD_REPO_PATH
  export COMMENT_ID=$($NODE !`echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
  cat <<'EOF' > comment/$COMMENT_ID.md
  [what happened, repository state (base branch status, failed step), relevant error output, manual resolution steps, and how to retry after fixing]
  EOF
  git add CARD.meta.json comment/$COMMENT_ID.md
  git commit -m "[what error occurred, which step failed, what recovery was attempted, and what manual intervention is needed]"
  ```

</instructions>
