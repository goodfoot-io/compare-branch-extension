---
name: card-implementation
description: Implement cards directly without a plan.
---


<instructions>

## 1. Prepare Environment

`$CREATE_WORKTREE_CLI` is an absolute-path CLI handle, set automatically at session start like `$CARD_CLI`. Use it directly as a command when you need an isolated Git worktree.

Create baseline tag if one does not already exist:

```bash
if git rev-parse "implement/$CARD_ID/baseline" >/dev/null 2>&1; then
  echo "Baseline tag already exists — resuming from prior checkpoint."
else
  git tag "implement/$CARD_ID/baseline" HEAD
fi
```

To test against the baseline, create a temporary worktree — never switch branches or stash in the current workspace:

```bash
BASELINE_WORKTREE=$($CREATE_WORKTREE_CLI "implement/$CARD_ID/baseline" | $NODE -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).worktree)")
# run tests in $BASELINE_WORKTREE, then clean up:
git worktree remove "$BASELINE_WORKTREE"
```

## 2. Implement

Load the `runtime:card-developer` skill for implementation approach (TDD, no mocks, real implementations).

Read CARD.md for goals and constraints. Card metadata (title, gates, tags) is available in the `<card>` block. Implement directly from the card description.

For each logical unit of work:
1. Read relevant files
2. Implement the change
3. Commit logically grouped changes
4. Tag the rollback point:

   ```bash
      git tag -f "implement/$CARD_ID/step-N" HEAD
   ```

### 2.1 Validation Gate

**Requirement:** ALL validation commands must pass before proceeding.

Run validation per the workspace validation configuration.

- **Error in code you can modify**: Fix it, re-run validation
- **Error outside your scope**: Block immediately

**When blocked:** Add `blocked` to `tags` in `CARD.meta.json` if not already present. Write exact failure output to `comment/validation-failed.md`. Commit both files and **STOP**.

Proceed to **3. Finalize** only when ALL validations pass.

## 3. Finalize

### 3.1 Clean Up Tags

```bash
git tag -l "implement/$CARD_ID/*" | xargs -r git tag -d
```

### 3.2 Complete

- **gates.mergeRequestRequired is true**: Commit to the card repository. **STOP** — Merge occurs after user approval.
- **gates.mergeRequestRequired is false or unset**: Load the `runtime:card-merge` skill and follow its `<instructions>`.

</instructions>
