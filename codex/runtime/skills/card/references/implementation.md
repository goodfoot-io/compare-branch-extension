
<instructions>

## 1. Prepare Environment

Pin the baseline tag at HEAD. The baseline does not advance during implementation; if the tag already exists, leave it where it is — you are resuming from a prior checkpoint.

```bash
git tag "implement/$CARD_ID/baseline" HEAD  # skip if the tag already exists
```

## 2. Implement

This is the Tier-1 path: the card describes one obvious mechanism, no plan was required. If that turns out to be false during work, see `<when-to-return-to-planning>`.

Read `CARD.md` for goals and constraints. Read `CARD.meta.json` for current `title`, `gates`, and `tags`. Implement directly from the card description.

Work proceeds in **logical units**. A logical unit is a coherent change that leaves the workspace type-check-clean and tests-passing — the natural point to commit and tag a rollback. For each unit:

1. Read relevant files.
2. Implement the change.
3. Pass the `<per-unit-gate>`.
4. Commit, then tag the rollback point: `git tag -f "implement/$CARD_ID/step-N" HEAD`.

When all units are complete, pass the `<final-validation-gate>` before proceeding to Step 3.

Every commit in this flow follows the `<workspace-commit-style>` and `<markdown-guidelines>` conventions.

When the card introduces new behavior whose contract is worth validating ahead of implementation — a new public function, API, data type, schema, or algorithm — consult the `<tdd-bootstrap>` instructions from the `$runtime:tdd-bootstrap` skill. Skip the bootstrap for refactors, spikes, UI or visual work, glue code, one-shot scripts, framework-determined shapes, and small in-place edits.

## 3. Evaluate Quality

Diff `implement/$CARD_ID/baseline..HEAD` to assess scope: number of files changed, types of changes, and runtime risk signals (new API boundaries, async logic, shared state, error-path changes).

- **Simple** — single-file change, or mechanical edit (rename, type signature update, config tweak) with no behavioral change. Skip evaluation; proceed to Step 4.
- **Behavioral or cross-file** — any new logic, new API boundary, multi-file change, or async/error-path modification. Read `./implementation-evaluation.md` and follow its instructions.

When an evaluator needs to verify behavior against the pre-implementation state, spawn a `$runtime:card-pre-existing-condition` child rather than running the comparison in the active workspace — the child owns baseline reproduction and reports the result back.

## 4. Finalize

The card is not COMPLETED until every part of this section has run. Passing the final validation gate at the end of Step 2 is not the terminal state — staging, tag cleanup, and the merge decision all follow.

**Stage remaining changes.** Stage any uncommitted implementation artifacts and commit per the workspace commit style:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
```

**Clean up tags.** The rollback window closes once implementation commits are finalized:

```bash
git tag -l "implement/$CARD_ID/*" | xargs -r git tag -d
```

**Route to merge or await review.** Based on `gates.mergeRequestRequired`:
- **false or unset** — read `./merge.md` and follow its `<instructions>`.
- **true** — **STOP**. Merge occurs after user approval.

</instructions>

<implementation-discipline>

**Scope is the card's scope.** Implement only what the card specifies; do not introduce unrelated cleanup, refactoring, or abstractions. File a card (load `$cards:cards`) for discoveries in code the change does not interact with before finalizing.

**Zero errors in affected packages.** Fix priority: pre-existing errors, then direct implementation, then test infrastructure, then environment.

**No mocks.** Test with real implementations. Use dependency injection so code stays testable, and create thin adapter interfaces with real test implementations for external services — never mock libraries or framework internals.

```typescript
function createHandler(db: Database, logger: Logger) { ... }

const db = createTestDatabase();
const handler = createHandler(db, testLogger);
```

**Iterate, then escalate.** On validation failure, fix and re-run. When repeated attempts produce no new information, stop and route via `<final-validation-gate>` rather than thrashing.

**Follow repository conventions** and existing patterns. Do not create extra artifacts unless the scope or loaded skills require them.

</implementation-discipline>

<per-unit-gate>

Lint and typecheck per the project's AGENTS.md validation conventions. Re-run only the failing test or suite until it passes; broaden to the changed package's suite once green, and defer cross-package or full-validation runs to `<final-validation-gate>`.

- **All pass** — commit, then tag the rollback point.
- **Failure originates in this unit's changes** — fix and re-run.
- **Otherwise** — proceed to `<final-validation-gate>` and apply its routing (in-scope fix, pre-existing-condition dispatch, or block).

</per-unit-gate>

<final-validation-gate>

After all logical units are complete, run validation per the workspace validation configuration. Every command must pass before proceeding to Step 3.

- **All pass** — proceed to Step 3.
- **Failure originates in files the card's diff touched** — fix and re-run.
- **Otherwise** (failure is not obviously the card's work — anything ambiguous, unfamiliar, or that "feels" pre-existing) — `spawn_agent` a child (`task_name` like `pre_existing_check`) whose `message` tells it to use `$runtime:card-pre-existing-condition`. Do not investigate the failure's origin yourself; that investigation belongs to the spawned child. The `message`:

  ```
  Use the $runtime:card-pre-existing-condition skill.

  ## Failing Command
  [the failing command]

  ## Failure Output
  [full stdout/stderr from the failing command]

  ## Active Card Diff Scope
  [list of files the active card has modified since `implement/$CARD_ID/baseline`]

  ## Task
  Decide whether this failure is pre-existing by reproducing the failing command on the baseline ref. If it reproduces, repair the root cause and re-run the full validation command. If it does not, return NOT_PRE_EXISTING with the baseline output.
  ```

  On the child's return:
  - **COMPLETED** — re-run the validation command and proceed to Step 3 if it passes.
  - **NOT_PRE_EXISTING** — the failure is in scope of this card; fix and re-run.
  - **NEEDS_REVISION or BLOCKED** — block: add `blocked` to `tags` in `CARD.meta.json` if not already present, write the failure output and the agent's report to `comments/validation-failed.md`, commit both files, and **STOP**.

</final-validation-gate>

<when-to-return-to-planning>

At any point during implementation, stop and return to planning if any of the following emerges. The first is the strongest signal — it usually means the chosen approach is wrong, not just incomplete.

1. **Implementation creates problems it then has to solve** — the approach introduces complexity that wouldn't exist with a different approach: timing windows, error-handling machinery, interface mismatches caused by the approach itself.
2. **Load-bearing assumption proved false** — the implementation depends on something about the codebase that turns out to be untrue or uncertain ("only one caller," "always returns X," "this field is optional"). The correct path forward now depends on what the truth implies.
3. **Approach fork with non-trivial tradeoffs** — a decision point arises where multiple viable paths have meaningfully different implications (correctness, performance, future extensibility) that can't be resolved by reading the code alone.
4. **Scope exceeded the card's implied boundary** — the in-scope work must touch significantly more files or systems than the card described. Discovering issues in code the change does not interact with is *not* this condition — create a new card for those and continue.

When any condition holds, **stop immediately**. Revert to baseline and discard step tags:

```bash
git reset --hard "implement/$CARD_ID/baseline"
git clean -fd
git tag -l "implement/$CARD_ID/step-*" | xargs -r git tag -d
```

Read `./plan.md` and follow its instructions. The discoveries made during implementation — the false assumption, the scope boundary, the fork — are live context for the next approach.

</when-to-return-to-planning>

