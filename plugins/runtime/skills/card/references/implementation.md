
<instructions>

## 1. Prepare Environment

Create the baseline tag if one does not already exist. The baseline is pinned — it does not advance during implementation.

```bash
if git rev-parse "implement/$CARD_ID/baseline" >/dev/null 2>&1; then
  echo "Baseline tag already exists — resuming from prior checkpoint."
else
  git tag "implement/$CARD_ID/baseline" HEAD
fi
```

## 2. Implement

Load the `runtime:card-developer` skill for implementation approach (TDD, no mocks, real implementations).

Read `CARD.md` for goals and constraints. Read CARD.meta.json for current `title`, `gates`, and `tags`. Implement directly from the card description.

When the card introduces new behavior whose contract is worth validating ahead of implementation — a new public function, API, data type, schema, or algorithm — **you must consult the `<tdd-bootstrap>` instructions** from the `runtime:tdd-bootstrap` skill and sequence the work along the three phases. Skip the bootstrap for refactors, spikes, UI or visual work, glue code, one-shot scripts, framework-determined shapes, and small in-place edits.

Work proceeds in logical units. A logical unit is a coherent change that leaves the workspace in a type-check-clean, test-passing state — the natural point to commit and tag a rollback. For each logical unit:

1. Read relevant files.
2. Implement the change.
3. Run the per-unit validation gate from Step 2.1: Validate and Commit.
4. Tag the rollback point on success:

```bash
git tag -f "implement/$CARD_ID/step-N" HEAD
```

### 2.1 Validate and Commit

**You must load the `cards:markdown` and `runtime:workspace-commit-style` skills before the first commit.**

Run the repository's workspace-level type-check and lint commands from the workspace root.

Then run tests scoped to what the unit changed:
- **Changes isolated to a single package**: Run that package's test suite.
- **Changes span multiple packages, or the package boundary is unclear**: Run the workspace's full validation suite.

Based on the combined result:
- **All validations pass**: Commit the unit's changes, then tag the rollback point per Step 2 item 4.
- **Resolvable error**: Fix it and re-run the validations above.
- **Unresolvable error**: Proceed to Step 2.2: Final Validation Gate's block procedure.

Commit on success:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
```

### 2.2 Final Validation Gate

After all logical units are complete, run validation per the workspace validation configuration.

**Requirement:** ALL validation commands must pass before proceeding.

Based on the result:
- **All validations pass**: Proceed to Step 3: Evaluate Quality.
- **Resolvable error**: Fix it and re-run validation.
- **Unresolvable error**: Block immediately.

**When blocked**: Add `blocked` to `tags` in `CARD.meta.json` if not already present. Write the exact failure output to `comment/validation-failed.md`. Commit both files and **STOP**.

## 3. Evaluate Quality

Diff the workspace against the baseline to assess the scope of changes: number of files changed, types of changes, and runtime risk signals (new API boundaries, async logic, shared state, error-path changes).

Based on scope:
- **Simple**: Single-file change, or a mechanical edit (rename, type signature update, config tweak) with no behavioral change. Skip evaluation — proceed to Step 4: Finalize.
- **Behavioral or cross-file**: Any new logic, new API boundary, multi-file change, or async/error-path modification. Read `./implementation-evaluation.md` and follow its instructions.

When an evaluator needs to verify behavior against the pre-implementation state, follow `<baseline-worktree-testing>` rather than switching branches in the active workspace.

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

### 4.2 Tag Cleanup

Remove the baseline and per-step tags — the rollback window is closed once the implementation commits are finalized.

```bash
git tag -l "implement/$CARD_ID/*" | xargs -r git tag -d
```

### 4.3 Complete or Await Review

Based on `gates.mergeRequestRequired`:
- **false or unset**: Read `./merge.md` and follow its `<instructions>`.
- **true**: **STOP** — Merge occurs after user approval.

</instructions>

<when-to-return-to-planning>

At any point during implementation, stop and return to planning if any of the following conditions emerge:

1. **Scope exceeded the card's implied boundary** — the *in-scope* work must touch significantly more files or systems than the card described. The original estimate of limited impact was wrong. Note: discovering issues in code the change does not interact with is not this condition — create a new card for those and continue.
2. **Approach fork with non-trivial tradeoffs** — a decision point arises where multiple viable paths have meaningfully different implications (correctness, performance, future extensibility) that can't be resolved by reading the code alone.
3. **Load-bearing assumption proved false** — the implementation depends on something about the codebase that turns out to be untrue or uncertain ("only one caller," "always returns X," "this field is optional"). The correct path forward now depends on what the truth implies.
4. **Implementation creates problems it then has to solve** — the approach introduces complexity that wouldn't exist with a different approach: timing windows, error-handling machinery, interface mismatches caused by the approach itself. This signals the approach is wrong, not just incomplete.

When any condition is met, **stop immediately** — do not continue implementing. Revert all changes to the baseline and discard orphaned step tags:

```bash
git reset --hard "implement/$CARD_ID/baseline"
git clean -fd
git tag -l "implement/$CARD_ID/step-*" | xargs -r git tag -d
```

Read `./plan.md` and follow its instructions. The discoveries made during implementation — the false assumption, the scope boundary, the fork — are live context to incorporate when selecting an approach.

</when-to-return-to-planning>

<baseline-worktree-testing>

The `create-worktree` command is a plugin-provided executable on `PATH`. Use it directly when you need an isolated Git worktree.

To test against the baseline, create a temporary worktree — never switch branches or stash in the current workspace:

```bash
create-worktree "implement/$CARD_ID/baseline"
```

Run tests in the worktree, then delete the worktree and branch.

</baseline-worktree-testing>
