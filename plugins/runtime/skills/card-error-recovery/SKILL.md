---
name: error-recovery
description: Recover from errors during protocol execution.
---

<placeholder-variables>
[BLOCKING CARD ID] — The card ID of an existing card that covers the current block, identified during recovery analysis
</placeholder-variables>

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

  **If an existing card covers this block**, look up its repository path, then write a comment to it:

  ```bash
  $NODE !` echo $CLAUDE_PLUGIN_ROOT`/bin/card.mjs [BLOCKING CARD ID]
  ```

  Extract `repositoryPath` from the JSON output, then write a comment:

  ```bash
  cd [blocking card repositoryPath]
  export COMMENT_ID=$($NODE !` echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
  cat <<'EOF' > comment/$COMMENT_ID.md
  [describe the failure encountered, how it relates to this card's blocker, and any additional context from the recovery attempt]
  EOF
  git add comment/$COMMENT_ID.md
  git commit -m "blocked: [failure context for this blocker]"  # <card-repo-commit-style>
  ```

  **If no existing card covers this block**, create a new card with "backlog" status using the appropriate card creation tool.

Based on validation result:
- **Validation passes**: Return to the invoking protocol and continue from the step after the one that failed
- **Validation fails and attempts < 3**: Repeat the recovery cycle from step 1
- **Validation fails and attempts >= 3**: Proceed to section 3

## 3. Report and Block

Add the "blocked" tag to the `tags` array in `CARD.meta.json`.

```bash
cd $CARD_REPO_PATH
node -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); if(!d.tags.includes('blocked')) d.tags.push('blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
```

Based on card state:

- **Card already has "blocked" tag** (from a previous recovery attempt): Commit without a duplicate comment:

  ```bash
  cd $CARD_REPO_PATH
  git add CARD.meta.json
  git commit -m "blocked: [error in step X — manual fix needed]"  # <card-repo-commit-style>
  ```

- **Otherwise**: Write an error comment documenting what happened, then commit:

  ```bash
  cd $CARD_REPO_PATH
  export COMMENT_ID=$($NODE !` echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
  cat <<'EOF' > comment/$COMMENT_ID.md
  [what happened, repository state (base branch status, failed step), relevant error output, manual resolution steps, and how to retry after fixing]
  EOF
  git add CARD.meta.json comment/$COMMENT_ID.md
  git commit -m "blocked: [error — recovery failed, manual fix needed]"  # <card-repo-commit-style>
  ```

</instructions>
