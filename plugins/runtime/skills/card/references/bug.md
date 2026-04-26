
<placeholder-variables>
[BUG_DESCRIPTION] — One-sentence summary extracted in Step 1.2: "[Expected behavior] but [actual behavior]"
[SCOPE_HINT] — Files, packages, or functions mentioned in the card, extracted in Step 1.2
[SHORT_LABEL] — Short identifier for a single root-cause hypothesis (one per parallel subagent in Step 1.4)
[TEST_FAILURE_OUTPUT] — Combined failure output from the reproduction tests, captured in Step 1.5
</placeholder-variables>

<test-first-invariant>
1. Every reproduction test MUST fail before the fix.
2. Any test modification during resolution requires re-validation.
3. Every reproduction test MUST pass after the fix.
</test-first-invariant>

<instructions>

## 1. Prepare and Reproduce

### 1.1 Validate Workspace State

Run `git status --porcelain`. A clean tree is the happy path — proceed.

If dirty, the worktree is dedicated to this card, so the changes are almost certainly partial work from a prior attempt that did not finish (e.g., a crashed session). Triage before blocking:

1. **Inspect the changes** with `git diff` and `git diff --cached`. Compare against the card's branch baseline (`bug/$CARD_ID/baseline` if it exists, otherwise `$BASE_BRANCH`).
2. **Classify the dirt** into one of:
   - **On-card and coherent** — the changes are recognizable progress toward this card's goal (e.g., a partial fix, a reproducer test, scaffolding named in the plan). Treat as recoverable: commit it on the current branch with a message like `wip: recovered from prior attempt — <one-line summary>`, note the recovery in a card comment, and continue with the bug flow. The next steps will build on or supersede it.
   - **On-card but incoherent** — touches files in the card's scope but the changes don't form a meaningful step (random edits, half-applied refactor, conflicting hunks). Stash with `git stash push -m "card/$CARD_ID/pre-bug-triage"`, write a comment recording the stash ref and a short description of what was discarded, and proceed with a clean tree.
   - **Off-card** — touches files unrelated to this card. This should not happen in a card-dedicated worktree; it indicates worktree contamination. Add `blocked` to `tags` in `CARD.meta.json`, write a comment with the offending paths, commit, and **STOP**.
3. Only the **off-card** branch blocks. The other two recover and continue.

If classification is genuinely ambiguous after inspection, prefer the **incoherent** path (stash + comment + proceed) over asking the user — the stash preserves the work, and the next implementation attempt is the right place to decide whether to restore it.

Create the baseline tag if one does not already exist. The baseline is pinned — it does not advance during bug resolution.

```bash
if git rev-parse "bug/$CARD_ID/baseline" >/dev/null 2>&1; then
  echo "Baseline tag already exists — resuming from prior checkpoint."
else
  git tag "bug/$CARD_ID/baseline" HEAD
fi
```

### 1.2 Read Card and Extract Context

Read `CARD.md` from the card repository. Card metadata (title, gates, tags) is available in the `<card>` block. Extract `[BUG_DESCRIPTION]`, `[SCOPE_HINT]`, and any verbatim error messages or stack traces.

Based on the card's shape:
- **Describes a capability gap** (language like "add", "implement", "support", or an inability to fill in "[Expected] but [Actual]" because no actual behavior exists): This is a feature request, not a bug. Write a comment explaining the triage, commit, and Read `./plan.md` to continue.
- **Describes an observed-vs-expected mismatch**: Proceed to Step 1.3: Identify Root Cause Hypotheses.

### 1.3 Identify Root Cause Hypotheses

Enumerate all plausible root causes based on card content, error messages, and stack traces. For each hypothesis, state:
- What could cause this behavior.
- Which code paths or data-flow segments are implicated.
- What evidence supports or contradicts it.

If every hypothesis reduces to "the described behavior is not implemented anywhere," the card is a missing-feature request rather than a bug. Write a comment explaining the finding, commit, and Read `./plan.md` to continue.

### 1.4 Write Reproduction Tests in Parallel

For each viable hypothesis, dispatch one foreground subagent in a single message so they run concurrently:

```xml
<invoke name="Agent">
<parameter name="description">Reproduce hypothesis: [SHORT_LABEL]</parameter>
<parameter name="subagent_type">general-purpose</parameter>
<parameter name="run_in_background">false</parameter>
<parameter name="prompt">
## Task
Write a minimal reproduction test for a single root-cause hypothesis.

## Bug
[BUG_DESCRIPTION]

## Scope
[SCOPE_HINT]

## Hypothesis
[Specific root cause being tested, with implicated code paths]

## Requirements
- Trace code and data-flow paths in the workspace to assess whether this hypothesis is viable.
- If viable: create a new test file that MUST FAIL against the current unfixed code.
- If not viable: return status NOT_VIABLE and explain why.
- Do not modify existing tests.
- Follow existing test patterns.
- Do NOT fix the bug.

## Response Format
## Status
[SUCCESS | NOT_VIABLE | BLOCKED | CANNOT_COMPLETE]

## Result
[Absolute file path, or "None"]

## Reasoning
[How the test reproduces this pathway, why the hypothesis was ruled out, or why blocked]
</parameter>
</invoke>
```

After every subagent returns, run each new test file and discard any that passes — only tests that actually fail are kept.

### 1.5 Commit Reproduction

**You must load the `cards:markdown` and `runtime:workspace-commit-style` skills before the first commit.**

Based on the reproduction results:
- **One or more tests fail**: Commit all failing tests in one commit, tag the state, capture `[TEST_FAILURE_OUTPUT]`, write a progress comment to the card repository listing each viable pathway and its test, commit the card repository, and proceed to Step 2: Resolve Bug.
- **No tests fail, new evidence expanded the hypothesis set** (max 3 rounds total across Step 1.3–1.5): Return to Step 1.3: Identify Root Cause Hypotheses.
- **No tests fail, hypotheses exhausted**: Write a comment explaining what was tried and why reproduction failed, and **STOP** — awaiting user direction.

```bash
git add [test files]
git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
git tag -f "bug/$CARD_ID/reproduction" HEAD
```

## 2. Resolve Bug

Resolve is a retry loop, bounded at 3 attempts. Each attempt runs Step 2.1: Trace Data Flow, Step 2.2: Delegate to Resolver, and Step 2.3: Validate and Commit.

### 2.1 Trace Data Flow

<scope-rules>
**Non-deterministic bugs**: If `[TEST_FAILURE_OUTPUT]` lacks `file:line` location information (for example, timeout or race condition), data-flow tracing may not be possible. Document what is known and pass available context to the resolver. The data-flow path becomes a hypothesis rather than a trace.
</scope-rules>

For each failing reproduction test, map how bad data flows from origin to symptom:

1. **Symptom** — where the bug manifests, taken from `[TEST_FAILURE_OUTPUT]`.
2. **Source** — trace backward: what data or state causes the symptom, and where is that set.
3. **Path** — the chain `source → [intermediates] → symptom`.

**Verification rule:** Any fix must modify the data-flow path such that correct data flows from source to symptom.
- **Fix adds a new read**: verify something writes the data.
- **Fix adds a new write**: verify something reads the data.
- **Fix adds a new parameter**: verify callers pass it.
- **Fix adds a new branch**: verify production code triggers it.

Fixes that fail this check create dead code — new capabilities never exercised.

### 2.2 Delegate to Resolver

Dispatch the resolver with every failing test and its output inlined:

```xml
<invoke name="Agent">
<parameter name="description">Resolve bug</parameter>
<parameter name="subagent_type">general-purpose</parameter>
<parameter name="run_in_background">false</parameter>
<parameter name="prompt">
## Task
Fix source code so every failing reproduction test passes.

## Bug
[BUG_DESCRIPTION]

## Failing Tests
[For each test: absolute file path, followed by a fenced code block containing its failure output.]

[If a prior resolve attempt failed, include its output under a `## Previous Attempt` heading.]

## Data Flow
[Source, Symptom, and Path from Step 2.1 — per test if they differ.]

## Requirements
- Fix source code so every failing test passes.
- The fix must modify the data-flow path so correct data reaches every symptom.
- If adding a new parameter, confirm callers will pass it.
- If adding a new read, confirm something writes the data.
- Do not break existing functionality.
- Do not run workspace-wide validation — the orchestrator validates after you return.

## If a Test Needs Correction
Modify only the test and return status TEST_MODIFIED. The orchestrator will verify the corrected test still fails, then re-invoke.

## Response Format
## Status
[SUCCESS | TEST_MODIFIED | BLOCKED | CANNOT_COMPLETE]

## Result
[Files modified, or "None"]

## Reasoning
[Fix explanation, or why blocked]
</parameter>
</invoke>
```

### 2.3 Validate and Commit

Based on the resolver's status:
- **BLOCKED or CANNOT_COMPLETE**: Write a comment with the resolver's reasoning, add `blocked` to `tags` in `CARD.meta.json`, commit, and **STOP**.
- **TEST_MODIFIED**: Proceed to Step 2.4: Test Correction Flow.
- **SUCCESS**: Continue below.

Run every reproduction test. Then run the repository's workspace-level type-check and lint commands from the workspace root. Then run tests scoped to what the resolver changed:
- **Changes isolated to a single package**: Run that package's test suite.
- **Changes span multiple packages, or the package boundary is unclear**: Run the workspace's full validation suite.

Based on the combined result:
- **All reproduction tests pass and all validations pass**: Commit the fix and proceed to Step 3: Validate Full Suite.
- **Error within orchestrator scope** (syntax error, import correction, config typo, test polyfill): Fix inline and re-run the validations above.
- **Reproduction test still fails, or validation fails on implementation grounds**: Treat as NEEDS_REVISION. Discard the resolver's uncommitted work and retry per Step 2. If retries are exhausted (3 attempts), write a comment explaining attempts and the specific technical obstacle, commit, and **STOP**.

Commit on success:

```bash
git add -A
git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
```

NEEDS_REVISION rollback:

```bash
git restore .
git clean -fd
```

### 2.4 Test Correction Flow

The resolver has modified a reproduction test. Validate the correction before accepting it. This flow is bounded at 2 corrections across the whole resolve loop.

1. Revert any non-test source changes the resolver made since `bug/$CARD_ID/reproduction`.
2. Run the corrected test.

Based on the corrected test's result:
- **Fails (valid correction)**: Commit the corrected test, update the tag (`git tag -f "bug/$CARD_ID/reproduction" HEAD`), capture new `[TEST_FAILURE_OUTPUT]`, and return to Step 2.2: Delegate to Resolver.
- **Passes (invalid correction)**: Revert the test. If resolve attempts remain, return to Step 2.2: Delegate to Resolver. Otherwise write a comment explaining test-validation failure and **STOP**.
- **Corrections exhausted (2 already applied)**: Write a comment reporting that the reproduction test became unreliable during the fix process, describing what went wrong and why it cannot be trusted to verify the fix, commit, and **STOP**.

## 3. Validate Full Suite

Run the repository's full validation suite: lint, type check, tests.

<validation-gate>
**Gate requirement:** ALL validation commands must pass.

| Rationalization | Why it is wrong |
|-----------------|----------------|
| "Pre-existing issue" | You must fix it or block |
| "Unrelated to my changes" | Prove it by fixing it, or block |
| "Infrastructure failure" | Infrastructure IS the product |
| "Only linting/types pass" | Tests are required, not optional |
| "Change is purely cosmetic" | Cosmetic changes can still break tests |
| "Tests are flaky" | Flaky = race condition = production bug |
| "Works in other environments" | Must work HERE |

Validation is binary — there is no "probably fine" state.
</validation-gate>

Based on the result:
- **All validations pass**: Proceed to Step 4: Finalize.
- **Resolvable error**: Fix it and re-run validation.
- **Unresolvable error**: Write a comment with the exact failure output, add `blocked` to `tags` in `CARD.meta.json`, commit, and **STOP** — do not retry hoping it resolves itself.

## 4. Finalize

### 4.1 Tag Cleanup

Remove the baseline and reproduction tags — the rollback window is closed once the fix is finalized.

```bash
git tag -d "bug/$CARD_ID/baseline" "bug/$CARD_ID/reproduction" 2>/dev/null
```

### 4.2 Complete or Await Review

Based on `gates.mergeRequestRequired`:
- **false or unset**: Read `./merge.md` and follow its `<instructions>`.
- **true**: **STOP** — Merge occurs after user approval.

</instructions>

<baseline-worktree-testing>

The `create-worktree` command is a plugin-provided executable on `PATH`. Use it directly when you need an isolated Git worktree.

To test against the baseline, create a temporary worktree — never switch branches or stash in the current workspace:

```bash
create-worktree "bug/$CARD_ID/baseline"
```

Run tests in the worktree, then delete the worktree and branch.

</baseline-worktree-testing>
