---
name: card-implementation
description: Implement cards directly without a plan.
---


<instructions>

## Preflight Check

```bash
command -v create-worktree >/dev/null 2>&1 || { echo 'Error: create-worktree CLI not found on PATH. Open VS Code with the Cards extension installed and run from an integrated terminal.' >&2; exit 1; }
```

## 1. Prepare Environment

Use the bundled helper at `create-worktree` when you need an isolated Git worktree.

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
create-worktree "implement/$CARD_ID/baseline"
```

Run tests in the worktree, then delete the worktree and branch.

## 2. Implement

Load the `runtime:card-developer` skill for implementation approach (TDD, no mocks, real implementations).

Read CARD.md for goals and constraints. Card metadata (title, gates, tags) is available in the `<card>` block. Implement directly from the card description.

For each logical unit of work:
1. Read relevant files
2. Implement the change
3. Commit per Step 2.1
4. Tag the rollback point:

   ```bash
      git tag -f "implement/$CARD_ID/step-N" HEAD
   ```

### 2.1 Load Skills and Commit

Load the `cards:markdown` and `runtime:workspace-commit-style` skills. The `<workspace-commit-style>` convention used in workspace commit messages throughout these instructions is defined in `runtime:workspace-commit-style` — it must be loaded before any commits are made.

Commit all workspace changes including new files:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
git tag -f "implement/$CARD_ID/baseline" HEAD
```

The baseline tag advances after each successful commit.

### 2.2 Validation Gate

**Requirement:** ALL validation commands must pass before proceeding.

Run validation per the workspace validation configuration.

- **Resolvable error**: Fix it, re-run validation
- **Unresolvable error**: Block immediately

**When blocked:** Add `blocked` to `tags` in `CARD.meta.json` if not already present. Write exact failure output to `comment/validation-failed.md`. Commit both files and **STOP**.

Proceed to **3. Evaluate Quality** only when ALL validations pass.

## 3. Evaluate Quality

Diff the workspace against the baseline to assess the scope of changes: number of files changed, types of changes, and runtime risk signals (new API boundaries, async logic, shared state, error-path changes).

- **Simple** — few files changed, well-understood modification, no new logic or API boundaries: skip evaluation. Proceed to Step 4.
- **Needs evaluation** — multiple files changed, new logic introduced, or runtime risk present: load the `runtime:card-implementation-evaluation` skill and follow its instructions.

## 4. Finalize

### 4.1 Stage Remaining Changes

Stage any uncommitted implementation artifacts:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
```

### 4.2 Complete or Await Review

- **gates.mergeRequestRequired is false or unset**: Load the `runtime:card-merge` skill and follow its `<instructions>`.
- **gates.mergeRequestRequired is true**: **STOP** — Merge occurs after user approval.

### 4.3 Tag Cleanup

```bash
git tag -l "implement/$CARD_ID/*" | xargs -r git tag -d
```

</instructions>

<when-to-return-to-planning>

At any point during implementation, stop and return to planning if any of the following conditions emerge:

1. **Scope exceeded the card's implied boundary** — the *in-scope* work must touch significantly more files or systems than the card described. The original estimate of limited impact was wrong. Note: discovering issues in code the change does not interact with is not this condition — create a new card for those and continue.
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
