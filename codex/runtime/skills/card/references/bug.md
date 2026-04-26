

<placeholder-variables>
[BUG_DESCRIPTION] — One-sentence summary: "[Expected behavior] but [actual behavior]" (extracted in Step 1)
[SCOPE_HINT] — Files, packages, or functions mentioned in card (extracted in Step 1)
[TEST_FILE_PATH] — Absolute path to reproduction test
[TEST_FAILURE_OUTPUT] — Captured test output when test fails
[TEST_PASS_ANALYSIS] — Synthesized explanation when test unexpectedly passes
[PREVIOUS_FAILURE_OUTPUT] — Captured output from failed fix attempt
[RESOLVER_REASONING] — Fix explanation from resolver subagent
[DATA_FLOW_SOURCE] — Where the bad data originates (file:line or component)
[DATA_FLOW_SYMPTOM] — Where the bad data causes the bug (file:line or component)
[DATA_FLOW_PATH] — Chain from source to symptom: `SOURCE -> [intermediates] -> SYMPTOM`
</placeholder-variables>

<test-first-invariant>
1. Reproduction test MUST fail before fix
2. Any test modification during resolution requires re-validation
3. Test MUST pass after fix
</test-first-invariant>

<instructions>

## 1. Research Workspace based on Card Content

### 1.1 Validate Workspace State

Run `git status --porcelain`. A clean tree is the happy path — proceed.

If dirty, the worktree is dedicated to this card, so the changes are almost certainly partial work from a prior attempt that did not finish (e.g., a crashed session). Triage before blocking:

1. **Inspect the changes** with `git diff` and `git diff --cached`. Compare against the card's branch baseline (`bug/$CARD_ID/baseline` if it exists, otherwise `$BASE_BRANCH`).
2. **Classify the dirt** into one of:
   - **On-card and coherent** — the changes are recognizable progress toward this card's goal (e.g., a partial fix, a reproducer test, scaffolding named in the plan). Treat as recoverable: commit it on the current branch with a message like `wip: recovered from prior attempt — <one-line summary>`, note the recovery in a card comment, and continue with the bug flow. The next steps will build on or supersede it.
   - **On-card but incoherent** — touches files in the card's scope but the changes don't form a meaningful step (random edits, half-applied refactor, conflicting hunks). Stash with `git stash push -m "card/$CARD_ID/pre-bug-triage"`, write a comment recording the stash ref and a short description of what was discarded, and proceed with a clean tree.
   - **Off-card** — touches files unrelated to this card. This should not happen in a card-dedicated worktree; it indicates worktree contamination. Add `blocked` tag to `CARD.meta.json`, write a comment with the offending paths, commit, and **STOP**.
3. Only the **off-card** branch blocks. The other two recover and continue.

If classification is genuinely ambiguous after inspection, prefer the **incoherent** path (stash + comment + proceed) over asking the user — the stash preserves the work, and the next implementation attempt is the right place to decide whether to restore it.

Create baseline tag if one does not already exist:

```bash
if git rev-parse "bug/$CARD_ID/baseline" >/dev/null 2>&1; then
  echo "Baseline tag already exists — resuming from prior checkpoint."
else
  git tag "bug/$CARD_ID/baseline" HEAD
fi
```

### 1.2 Read Card and Extract Context

Read `CARD.md` from the card repository. Card metadata (title, gates, tags) is available in the `<card>` block. Extract:

- BUG_DESCRIPTION — One-sentence summary: "[Expected behavior] but [actual behavior]"
- SCOPE_HINT — Files, packages, or functions mentioned
- Error messages / stack traces (verbatim)

### 1.3 Identify Root Cause Hypotheses

Enumerate all plausible root causes based on card content, error messages, and stack traces. For each hypothesis, state:
- What could cause this behavior
- Which code paths or data flow segments are implicated
- What evidence supports or contradicts it

### 1.4 Write Reproduction Tests for All Viable Pathways

For each hypothesis, launch a parallel general-purpose subagent to explore the code and, if viable, write a minimal reproduction test:

```xml
<invoke name="Agent">
<parameter name="description">test-pathway-[a]</parameter>
<parameter name="subagent_type">general-purpose</parameter>
<parameter name="prompt"># Task: Write Reproduction Test for Root Cause Hypothesis

## Bug
${BUG_DESCRIPTION}

## Scope
${SCOPE_HINT}

## Hypothesis
[Specific root cause being tested, with implicated code paths]

## Requirements
- Trace code and data flow paths in the workspace to assess whether this hypothesis is viable
- If viable: create a NEW test file that MUST FAIL against the current (unfixed) code
- If not viable: explain why and return status NOT_VIABLE
- Do not modify existing tests
- The test should be minimal and directly target this hypothesis
- Follow existing test patterns
- Do NOT fix the bug

## Response Format
## Status
[SUCCESS | NOT_VIABLE | BLOCKED | CANNOT_COMPLETE]

## Result
[Absolute file path, or "None"]

## Reasoning
[How the test reproduces this specific pathway, why the hypothesis was ruled out, or why blocked]
</parameter>
</invoke>
```

### 1.5 Load Skills and Commit Failing Tests

Load the `cards:markdown` and `runtime:workspace-commit-style` skills. The `<workspace-commit-style>` convention used in workspace commit messages throughout these instructions is defined in `runtime:workspace-commit-style` — it must be loaded before any commits are made.

After all subagents complete, run each test file to confirm it fails. Discard any test that passes. Commit all failing tests together:

```bash
git add [test files]
git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
```

Tag the state: `git tag -f "bug/$CARD_ID/reproduction" HEAD`

Capture the combined `TEST_FAILURE_OUTPUT` from all failing tests. Write a progress comment to the card repository listing each viable pathway and its corresponding test. Commit to the card repository.

- **No tests fail**: Write a comment explaining what was tried and why reproduction failed, then **STOP** — awaiting user direction.

## 2. Create Reproduction Test

Initialize: REPRODUCTION_ATTEMPT = 0 (max 3)

### 2.1 Delegate to Subagent

Review reproduction test outputs and failure analysis from Step 1.4. If new information has emerged — unexpected code paths, unfamiliar dependencies, or uncovered failure modes — enumerate additional root cause hypotheses and reassess viable pathways.

Increment REPRODUCTION_ATTEMPT, then invoke:

```xml
<invoke name="Agent">
<parameter name="description">create-reproduction-test</parameter>
<parameter name="subagent_type">general-purpose</parameter>
<parameter name="prompt"># Task: Create Minimal Reproduction Test

## Bug
${BUG_DESCRIPTION}

## Scope
${SCOPE_HINT}

[If REPRODUCTION_ATTEMPT > 1:]
## Previous Attempt Failed
Test PASSED when it should have FAILED:
${TEST_PASS_ANALYSIS}
[End if]

## Requirements
- Create NEW test file (do not modify existing tests)
- Test must be minimal and MUST FAIL
- Follow existing test patterns
- Do NOT fix the bug

## Response Format
## Status
[SUCCESS | BLOCKED | CANNOT_COMPLETE]

## Result
[Absolute file path, or "None"]

## Reasoning
[How test reproduces bug, or why blocked]
</parameter>
</invoke>
```

### 2.2 Capture and Validate

Parse the subagent response to extract SUBAGENT_STATUS, TEST_FILE_PATH, and SUBAGENT_REASONING.

Verify independently using git — do not rely solely on the subagent status:

1. **Verify file exists.** If TEST_FILE_PATH does not exist and attempts remain (< 3), return to Step 2.1. If no attempts remain, write a failure comment and **STOP**.

2. **Check for unexpected modifications.** Compare against the baseline tag (`git diff "bug/$CARD_ID/baseline" --name-only --diff-filter=M`). If existing files were modified, write a comment asking whether to proceed or revert, and **STOP**.

3. **Run the test.** Stage and run:

   ```bash
      git add "$TEST_FILE_PATH"
   ```

   Run the test file using the project's test command. Capture full output and exit code.

### 2.3 Outcomes

- **BLOCKED or CANNOT_COMPLETE**: Write a comment with SUBAGENT_REASONING, add `blocked` tag to `CARD.meta.json`, commit. **STOP**.

- **Test FAILS (expected)**:
  - Commit: `git add "$TEST_FILE_PATH" && git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
  - Tag: `git tag -f "bug/$CARD_ID/reproduction" HEAD`
  - Capture: `TEST_FAILURE_OUTPUT=$TEST_OUTPUT`
  - Write a progress comment explaining the reproduction test and why it currently fails. Commit to the card repository.
  - Proceed to Step 3

- **Test PASSES (unexpected), attempts < 3**:
  - Synthesize TEST_PASS_ANALYSIS: "[Test name] passed because [reason]. Expected failure due to [bug behavior]."
  - Revert all workspace changes to baseline:

    ```bash
        git diff "bug/$CARD_ID/baseline" --name-only --diff-filter=MD | \
      xargs -r git checkout "bug/$CARD_ID/baseline" --
    git diff "bug/$CARD_ID/baseline" --name-only --diff-filter=A | \
      xargs -r git rm -f
    ```
  - Return to Step 2.1

- **Test PASSES (unexpected), attempts >= 3**:
  Write a comment reporting inability to create a reproducing test. Summarize each attempt and hypothesize why reproduction failed. Commit to the card repository.
  **STOP** — Reproduction failed after maximum attempts.

## 3. Resolve Bug

Initialize: RESOLVE_ATTEMPT = 0 (max 3), TEST_CORRECTION_COUNT = 0 (max 1)

### 3.1 Trace Data Flow

<scope-rules>
**Non-deterministic bugs**: If [TEST_FAILURE_OUTPUT] lacks file:line location information (e.g., timeout, race condition), data flow tracing may not be possible. Document what is known and pass available context to the resolver. The data flow path becomes a hypothesis rather than a trace.
</scope-rules>

Before proposing a fix, map how bad data flows from origin to symptom:

1. **Find [DATA_FLOW_SYMPTOM]** — Where does the bug manifest? (from [TEST_FAILURE_OUTPUT])
2. **Find [DATA_FLOW_SOURCE]** — Trace backward: what data/state causes it? Where is that set?
3. **Map [DATA_FLOW_PATH]** — Document the chain: `[DATA_FLOW_SOURCE] -> [...] -> [DATA_FLOW_SYMPTOM]`

Record these three values for the resolver subagent in Step 3.2.

**Verification rule:** Any fix must modify [DATA_FLOW_PATH] such that correct data flows from source to symptom.
- **Fix adds new read**: Verify something writes the data
- **Fix adds new write**: Verify something reads the data
- **Fix adds new parameter**: Verify callers pass it
- **Fix adds new branch**: Verify production code triggers it

Fixes that fail this check create dead code — new capabilities never exercised.

### 3.2 Delegate to Subagent

Increment RESOLVE_ATTEMPT, then invoke:

```xml
<invoke name="Agent">
<parameter name="description">resolve-bug</parameter>
<parameter name="subagent_type">general-purpose</parameter>
<parameter name="prompt"># Task: Fix Bug to Make Test Pass

## Bug
${BUG_DESCRIPTION}

## Failing Test
File: ${TEST_FILE_PATH}
```
${TEST_FAILURE_OUTPUT}
```

[If RESOLVE_ATTEMPT > 1:]
## Previous Attempt Failed
${PREVIOUS_FAILURE_OUTPUT}
[End if]

## Data Flow
Source: [DATA_FLOW_SOURCE]
Symptom: [DATA_FLOW_SYMPTOM]
Path: [DATA_FLOW_PATH]

## Requirements
- Fix source code to make test pass
- Fix must modify the data flow path so correct data reaches the symptom
- If adding new parameter: confirm callers will pass it
- If adding new read: confirm something writes the data
- Do not break existing functionality
- Run linting after changes

## If Test Needs Correction
Modify ONLY the test, return status TEST_MODIFIED.
Orchestrator will verify corrected test still fails, then re-invoke.

## Response Format
## Status
[SUCCESS | TEST_MODIFIED | BLOCKED | CANNOT_COMPLETE]

## Result
[File paths modified, or "None"]

## Reasoning
[Fix explanation, or why blocked]
</parameter>
</invoke>
```

Capture RESOLVER_REASONING from response.

### 3.3 Validate

Determine what changed since the reproduction tag:

1. List all files changed since `bug/$CARD_ID/reproduction` (`git diff "bug/$CARD_ID/reproduction" --name-only`).
2. Check whether the test file was modified (`git diff --quiet "bug/$CARD_ID/reproduction" -- "$TEST_FILE_PATH"`).
3. Identify source-only changes by excluding the test file from the change list.
4. Run the reproduction test and capture the output.

### 3.4 Outcomes

- **BLOCKED or CANNOT_COMPLETE**: Write a comment with RESOLVER_REASONING, add `blocked` tag to `CARD.meta.json`, commit. **STOP**.

- **Test modified**: Go to Test Correction Flow (Step 3.5)

- **Only source changed, test PASSES**: Proceed to Step 4

- **Only source changed, test FAILS**:
  - Capture `PREVIOUS_FAILURE_OUTPUT=$TEST_OUTPUT`
  - **Attempts < 3**: Return to Step 3.2
  - **Attempts >= 3**: Write a comment explaining attempts and the specific technical obstacle. Commit to the card repository. **STOP**.

### 3.5 Test Correction Flow

1. Increment TEST_CORRECTION_COUNT
2. **Count > 2**: Write a comment reporting the reproduction test became unreliable during the fix process. Describe what went wrong and why it cannot be trusted to verify the fix. Commit. **STOP**.
3. Revert source changes: `git checkout "bug/$CARD_ID/reproduction" -- $SOURCE_CHANGES`
4. Run test to verify it still fails
5. Based on corrected test result:
   - **FAILS (valid)**: Commit correction, update tag: `git tag -f "bug/$CARD_ID/reproduction" HEAD`, capture new TEST_FAILURE_OUTPUT, reset RESOLVE_ATTEMPT = 0, return to Step 3.2
   - **PASSES (invalid)**: Revert test. If < 3 attempts, return to Step 3.2. Else write comment explaining test validation failure. **STOP**.

## 4. Validate Full Suite

Run linting, type checking, and tests.

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

**Validation is binary:**
- ALL pass -> proceed
- ANY fail -> block and report

There is no "probably fine" state.

- **Resolvable error**: Fix it, re-run
- **Unresolvable error**: Block immediately — do not retry hoping it resolves itself

**When blocked:**
1. Write error comment with exact failure output to the card
2. Add `blocked` tag to `CARD.meta.json`
3. Commit changes
4. **STOP**
</validation-gate>

- **All validation passes**: Proceed to Step 5
- **Validation fails**: Write comment listing failures, add `blocked` tag, commit, **STOP**.

## 5. Finalize

### 5.1 Clean Up Tags

```bash
git tag -d "bug/$CARD_ID/baseline" "bug/$CARD_ID/reproduction" 2>/dev/null
```

### 5.2 Complete

- **gates.mergeRequestRequired is true**: **STOP** — Merge occurs after user approval.
- **gates.mergeRequestRequired is false or unset**: Read `./merge.md` and follow its `<instructions>`.

</instructions>
