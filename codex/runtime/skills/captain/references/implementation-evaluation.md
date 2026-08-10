
<instructions>

## 1. Stage Uncommitted Changes

**Every commit below follows the `<workspace-commit-style>` and `<markdown-guidelines>` conventions.**

Commit any uncommitted workspace changes:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines> — describe the uncommitted changes]
COMMITMSG
)"
```

## 2. Pre-Evaluation Validation

Run validation per the plan's validation commands (or the workspace validation configuration, when no plan exists).

- **All validations pass**: Proceed to Step 3: Review.
- **Failure**: Treat each failure's output as an initial finding. Proceed to Step 4: Apply Fixes, then return here.

## 3. Review

Diff `implement/[CARD_ID]/baseline..HEAD` to see the full scope of changes, then read the card (and plan, if one exists) again with that diff in hand. If you implemented this yourself or the diff is large, a fresh-eyes subagent per angle will find what a re-read will not.

Evaluate from both angles below and list every finding — do not stop at the first one:

**Failure modes.** Perform a failure mode and effects analysis on the implementation. Trace consumers, data flow, and error paths for each change. Where could this break at runtime that the validation suite wouldn't catch — new API boundaries, async/error-path logic, shared state, silently drifting contracts?

**Delivered experience.** Read the card's acceptance criteria and exercise the implementation from its user-facing entry points. Does it deliver what the card asked for, not just what the diff technically implements?

- **No findings**: Proceed to Step 5: Finalize.
- **One or more findings**: Proceed to Step 4: Apply Fixes.

## 4. Apply Fixes

Fix every finding. Keep changes minimal and focused on the findings — do not use this pass to make unrelated improvements. With many findings, consider a subagent per group that shares files, validating and committing their work yourself.

## 5. Validate and Commit

Lint and typecheck per the project's AGENTS.md validation conventions. Re-run only the failing test or suite until it passes; broaden to the changed package's suite once green, and defer cross-package or full-validation runs to Step 2.

- **All pass**: Commit per `<workspace-commit-style>` and `<markdown-guidelines>`. If you arrived from Step 2, return there. Otherwise return to Step 3 and re-review against the new HEAD — a fix can introduce a finding of its own.
- **Failure**: Fix and re-run.

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
```

## 6. Finalize

Reached only once Step 3 completes with no findings. Do not modify gates in `CARD.meta.json`. Return control to the caller.

</instructions>
