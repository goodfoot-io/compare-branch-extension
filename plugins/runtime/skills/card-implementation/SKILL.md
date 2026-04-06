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
$CREATE_WORKTREE_CLI "implement/$CARD_ID/baseline"
```

Run tests in the worktree, then delete the worktree and branch.

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

<when-to-return-to-planning>

At any point during implementation, stop and return to planning if any of the following conditions emerge:

1. **Scope exceeded the card's implied boundary** — the change must touch significantly more files or systems than the card described. The original estimate of limited impact was wrong.
2. **Approach fork with non-trivial tradeoffs** — a decision point arises where multiple viable paths have meaningfully different implications (correctness, performance, future extensibility) that can't be resolved by reading the code alone.
3. **Load-bearing assumption proved false** — the implementation depends on something about the codebase that turns out to be untrue or uncertain ("only one caller," "always returns X," "this field is optional"). The correct path forward now depends on what the truth implies.
4. **Implementation creates problems it then has to solve** — the approach introduces complexity that wouldn't exist with a different approach: timing windows, error-handling machinery, interface mismatches caused by the approach itself. This signals the approach is wrong, not just incomplete.

When any condition is met, **stop immediately** — do not continue implementing. Revert all changes to the baseline:

```bash
git reset --hard "implement/$CARD_ID/baseline"
git clean -fd
```

Load the `runtime:card-plan` skill and follow its instructions. The discoveries made during implementation — the false assumption, the scope boundary, the fork — are live context the planner should incorporate when selecting an approach.

</when-to-return-to-planning>
