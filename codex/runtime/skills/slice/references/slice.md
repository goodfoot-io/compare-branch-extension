
<placeholder-variables>
[SLICE_LABEL] — Short semantic slug naming the current slice (e.g. `types-and-stubs`, `core-function-signatures`, `integration-test-surface`)
</placeholder-variables>

<instructions>

Slicing reads the card holistically and implements it as a sequence of bounded, validated slices — each slice shipping public API boundaries (types, signatures, stubs) and behavioral expectations (skipped integration tests). No plan file is written or consulted; CARD.md, its comments, and its notes are the full brief.

## 1. Prepare Environment

Create the baseline tag if one does not already exist. The baseline is pinned — it does not advance during slicing and serves as the rollback target if the card has to exit to `$card` for planning.

```bash
if git rev-parse "slice/$CARD_ID/baseline" >/dev/null 2>&1; then
  echo "Baseline tag already exists — resuming from prior slice."
else
  git tag "slice/$CARD_ID/baseline" HEAD
fi
```

## 2. Read the Card Holistically

Read, in parallel:

- `CARD.md` — problem, desired outcomes, acceptance criteria
- `CARD.meta.json` — gates, tags, relations
- `comment/*.md` — questions, feedback, clarifications (most recent last)
- `notes/*` — research and architectural context
- Any files named in CARD.md or comments — verify they exist and read the referenced regions

Questions and implementation feedback are absorbed here: answer a pure information-seeking question inline as a comment before slicing, and fold any implementation feedback into the next slice's brief. Do not dispatch a subagent solely to answer a question.

## 3. Derive the Slice Sequence

Identify the public-API surface the card requires and break it into an ordered list of slices. Each slice must be:

- **Bounded** — one coherent boundary (one module, one set of related types, one interface). A slice that touches more than a handful of files is two slices.
- **Validated** — its output can be checked by `yarn lint`, `yarn typecheck`, and `yarn test` without the next slice in place. Skipped tests count as validated once they compile and the skip marker is recognized.
- **Ordered** — later slices may depend on earlier ones; earlier slices must not depend on later ones.

A typical sequence:
1. Data structures and type definitions
2. Function and method signatures with throwing stubs
3. Skipped integration tests asserting behavioral expectations
4. (Subsequent sessions) Unskip and implement one behavior at a time

Track the sequence in your working context — one entry per slice. Mark the first slice active and proceed.

## 4. Dispatch the Current Slice

`spawn_agent` one child per slice (`task_name` like `slice_[SLICE_LABEL]`). Sequential — never parallel: spawn the next slice's child only after the current slice returns and clears Step 5. The diff-review and validation gate between slices is load-bearing. The spawn `message`:

```
## Task
Implement the public API boundary and behavioral expectations for [SLICE_LABEL].

## Card
@[CARD_REPO_PATH]/CARD.md
@[CARD_REPO_PATH]/comment/
@[CARD_REPO_PATH]/notes/

## Scope
[Exact boundary of this slice: files to touch, types to define, signatures to declare, skipped tests to write. Name each file by absolute path. Do not implement bodies beyond throwing stubs unless this slice is explicitly a body-fill slice.]

## Technique
- Types and stubs first: define all input/output types; export functions/methods with correct signatures; stub bodies throw `new Error('not implemented')`.
- Skipped integration tests: write tests marked `.skip` that document the expected contract — expected behavior, error cases, edge cases.
- Do not unskip tests in this slice unless the scope explicitly says so.
- Do not add capability without connectivity — every write needs a reader, every read needs a writer, every parameter needs a caller.

## Constraints
- Touch only the files named in Scope.
- Follow the repository's `<golden-rule>`: run the package's lint, typecheck, and test commands before returning.
- Commit each logical step per `<workspace-commit-style>`.

## Success Criteria
- [ ] Types and signatures in place
- [ ] Stubs throw `not implemented`
- [ ] Skipped tests compile and are discovered by the test runner
- [ ] Package-scoped lint, typecheck, and test all pass
```

## 5. Review, Validate, and Commit

When the slice's child returns:

### 5.1 Review the Diff

Read the full diff against the prior commit. Check:

- Scope — did the child touch only files named in its brief?
- Data flow — every added parameter has a caller; every added property has a reader; every returned promise is awaited or explicitly voided with a reason.
- Test shape — skipped tests compile, use real types (not `any` shims), and describe the behavior CARD.md actually requires.
- Stubs — function bodies throw, not silently return `undefined` or `[]`.

### 5.2 Run Validation

Validate per CLAUDE.md `<validation>`. Lint and typecheck the project; re-run only the failing test or suite until it passes, then run the changed package's suite. Defer cross-package or full-validation runs to Step 6: Complete or Await Review (merge.md owns the final gate).

### 5.3 Route on Result

Based on the combined review + validation:

- **Clean (review passes, validation passes)**: The slice is good. Commit the child's work if it left anything unstaged, mark the slice complete in your tracking, and return to Step 4 with the next slice.
- **Trivially wrong within the same slice** (typo, missing import, off-by-one in the commit message) and the fix is obviously inside the boundary the child already touched: fix inline, re-validate, commit, advance.
- **Non-trivial wrong** (missed scope, wrong types, swallowed errors, ad-hoc skipped-test bodies, scope creep): do **not** fix inline. `spawn_agent` a corrective child with a focused `message` that names the specific defects and the files to change. Return to Step 5 on its return.

Do not mark the slice complete until validation passes cleanly.

### 5.4 Drift Check

After each successful slice, re-read the remaining slice sequence. If the last slice revealed consumers, dependencies, or constraints that invalidate the remaining sequence, revise the sequence before spawning the next slice. If the revision requires a different strategy — not just reordering — read `<when-to-return-to-planning>` below.

## 6. Complete or Await Review

When every slice in the sequence is complete:

Based on `gates.mergeRequestRequired`:
- **false or unset**: Read `./merge.md` and follow its `<instructions>`.
- **true**: Stage any uncommitted artifacts, then **STOP** — merge occurs after user approval.

### 6.1 Tag Cleanup

Once the card reaches merge or the awaiting-review stop, delete the baseline tag:

```bash
git tag -d "slice/$CARD_ID/baseline" 2>/dev/null
```

</instructions>

<rollback>

| Tag | Created At | Advances | Purpose |
|-----|------------|----------|---------|
| `slice/[CARD_ID]/baseline` | Step 1: Prepare Environment | Never | Pre-slicing rollback target for `<when-to-return-to-planning>`. |

Per-slice commits from Step 5.3 are the rollback target within slicing — a failed slice reverts only its uncommitted changes (`git restore . && git clean -fd`) before re-dispatching, leaving prior successful slices intact.

</rollback>

<when-to-return-to-planning>

The Slice action bets that the card's public-API surface is legible from CARD.md alone. Return-to-planning triggers surface when that bet is wrong:

1. **The slice sequence keeps rewriting itself** — every slice invalidates the next one. The surface isn't discoverable incrementally.
2. **A slice reveals a second plausible approach with real trade-offs** — slicing assumes one obvious mechanism; the appearance of a genuine fork is evidence planning was skipped too early.
3. **A load-bearing assumption from CARD.md proves false** — the card described a surface the codebase doesn't actually expose, or the exposed surface has constraints CARD.md didn't know about.
4. **Scope keeps expanding** — slices touch consumers the card didn't name, and accommodating them requires rethinking the boundary, not adding more slices.
5. **Requirements changed mid-slice** — the user's comments or new constraints arrived after slicing started and are incompatible with the remaining sequence.

When any condition holds, **stop immediately**. Revert all changes to the baseline:

```bash
git reset --hard "slice/$CARD_ID/baseline"
git clean -fd
```

Write a comment to the card repository naming which trigger fired and what the slicing session learned, then ask the user to run the Launch action so `$card` can route the card through `card-plan`. **STOP** — do not re-dispatch slices.

</when-to-return-to-planning>

<orchestrator-constraints>
The orchestrator coordinates — it does NOT implement code.

| Orchestrator handles directly | Subagents handle via delegation |
|------------------------------|---------------------------------|
| Reading the card | Type and signature declaration |
| Deriving the slice sequence | Skipped-test authoring |
| Reviewing diffs | Stub bodies |
| Running validation | Feature implementation |
| Committing clean slices | Multi-file refactoring |
| Inline fixes for trivial same-slice typos | Corrective passes on non-trivial defects |

Never update card status directly. Never include commitSha in comments after commits — hooks handle commit tracking automatically.
</orchestrator-constraints>
