---
name: bug
description: Fix testable bugs using test-first methodology.
---


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
Enforce strict test-first verification:

1. Reproduction test MUST fail before fix
2. Any test modification during resolution requires re-validation
3. Test MUST pass after fix
</test-first-invariant>

<instructions>

## 1. Explore Workspace based on Card Content

### 1.1 Validate Workspace State

Check git state and establish baseline:

```bash
cd $WORKSPACE_PATH
# Verify clean working tree
if [ -n "$(git status --porcelain)" ]; then
  # Write comment: working tree is dirty, cannot proceed safely
  # Add `blocked` tag to CARD.meta.json, commit, STOP
fi

git tag -f "bug/${CARD_ID}/baseline" HEAD
```

### 1.2 Read Card and Extract Context

Read `CARD.meta.json` and `CARD.md` from the card repository. Extract:

- BUG_DESCRIPTION — One-sentence summary: "[Expected behavior] but [actual behavior]"
- SCOPE_HINT — Files, packages, or functions mentioned
- Error messages / stack traces (verbatim)

### 1.3 Launch Exploration

Launch parallel Explore subagents (haiku model) in the workspace repository. Launch multiple subagents with distinct, targeted prompts based on the card content:

```xml
<invoke name="Task">
<parameter name="description">explore-[target-a]</parameter>
<parameter name="subagent_type">Explore</parameter>
<parameter name="model">haiku</parameter>
<parameter name="prompt">[Distinct exploration task derived from card]</parameter>
</invoke>
<invoke name="Task">
<parameter name="description">explore-[target-b]</parameter>
<parameter name="subagent_type">Explore</parameter>
<parameter name="model">haiku</parameter>
<parameter name="prompt">[Distinct exploration task derived from card]</parameter>
</invoke>
```

### 1.4 Clarify Bug

Collect exploration results via TaskOutput.

Evaluate whether the title and description clearly describe the bug. A good bug title describes behavior: *"[Component] fails when [action]"* or *"[Expected] but [actual]"*.

**Clarify title when:**
- Title is truncated or incomplete
- Title describes implementation detail rather than observable behavior
- Title references wrong component, file, or feature

**Clarify description when:**
- Description contains factual errors (wrong paths, incorrect component names)
- Error messages or stack traces are missing but available

**Leave unchanged when:** Only minor phrasing or style preferences would change.

**Clarification principles:**
- Preserve all user-provided details, especially error messages and reproduction steps
- Maintain user intent — the clarified version must describe the same bug
- Correct factual errors in the main text; append a footnote: `*Corrections: Changed X to Y (reason)*`

**Enrich descriptions** with context discovered during exploration:
- Correct file paths and component names
- Related error messages or stack traces
- Environment or configuration details (if relevant)

Do not expand scope beyond the reported bug.

If changes are needed, update `CARD.meta.json` (for title) and/or `CARD.md` (for description) in the card repository. Commit to the card repository:

```bash
cd $CARD_REPO_PATH
git add CARD.meta.json CARD.md
git commit -m "clarify: [what was corrected]"  # <card-repo-commit-style>
```

Skip the commit entirely if no clarification is needed.

## 2. Create Reproduction Test

Initialize: REPRODUCTION_ATTEMPT = 0 (max 3)

### 2.1 Delegate to Subagent

Launch additional Explore subagents if new information reveals unexplored areas.

Increment REPRODUCTION_ATTEMPT, then invoke:

```xml
<invoke name="Task">
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

Parse response: SUBAGENT_STATUS, TEST_FILE_PATH, SUBAGENT_REASONING

Verify using git (do not rely solely on subagent status):

```bash
cd $WORKSPACE_PATH
# Verify file exists
if [ ! -f "$TEST_FILE_PATH" ]; then
  if [ "$REPRODUCTION_ATTEMPT" -lt 3 ]; then
    # Return to Delegate to Subagent
  else
    # Write failure comment, STOP
  fi
fi

# Check for unexpected modifications
MODIFIED_FILES=$(git diff "bug/${CARD_ID}/baseline" --name-only --diff-filter=M)
if [ -n "$MODIFIED_FILES" ]; then
  # Write comment asking user: proceed or revert?
  # STOP — await user direction
fi

# Run test
git add "$TEST_FILE_PATH"
TEST_OUTPUT=$(yarn test "$TEST_FILE_PATH" 2>&1)
TEST_EXIT_CODE=$?
```

### 2.3 Outcomes

Based on subagent response and test result:

- **BLOCKED or CANNOT_COMPLETE**: Write a comment to the card repository with SUBAGENT_REASONING, add `blocked` tag to `CARD.meta.json`, commit. **STOP** — Awaiting user intervention.

- **Test FAILS (expected)**:
  - Commit the test: `git add "$TEST_FILE_PATH" && git commit -m "[reproduction test: what it checks]"`  <!-- <workspace-commit-style> -->
  - Tag: `git tag -f "bug/${CARD_ID}/reproduction" HEAD`
  - Capture: `TEST_FAILURE_OUTPUT=$TEST_OUTPUT`
  - Write a progress comment to the card repository explaining the reproduction test and why it currently fails. Commit to the card repository.
  - Proceed to Step 3

- **Test PASSES (unexpected) and attempts < 3**:
  - Synthesize TEST_PASS_ANALYSIS: "[Test name] passed because [reason]. Expected failure due to [bug behavior]."
  - Revert changed files to baseline:
    ```bash
    # Restore files modified or deleted since baseline
    git diff "bug/${CARD_ID}/baseline" --name-only --diff-filter=MD | \
      xargs -r git checkout "bug/${CARD_ID}/baseline" --
    # Remove files added since baseline
    git diff "bug/${CARD_ID}/baseline" --name-only --diff-filter=A | \
      xargs -r git rm -f
    ```
  - Return to Delegate to Subagent

- **Test PASSES (unexpected) and attempts >= 3**:
  Write a comment to the card repository reporting that you were unable to create a test that reproduces the reported bug. Summarize what you tried in each attempt and share your hypothesis about why reproduction failed. Commit to the card repository.
  **STOP** — Reproduction failed after maximum attempts.

## 3. Resolve Bug

Initialize: RESOLVE_ATTEMPT = 0 (max 3), TEST_CORRECTION_COUNT = 0 (max 2)

### 3.1 Trace Data Flow

Before proposing a fix, map how bad data flows from origin to symptom:

1. **Find [DATA_FLOW_SYMPTOM]** — Where in code does the bug manifest? (from [TEST_FAILURE_OUTPUT])
2. **Find [DATA_FLOW_SOURCE]** — Trace backward: what data/state causes it? Where is that set?
3. **Map [DATA_FLOW_PATH]** — Document the chain: `[DATA_FLOW_SOURCE] -> [...] -> [DATA_FLOW_SYMPTOM]`

**Verification rule:** Any fix must modify [DATA_FLOW_PATH] such that correct data flows from source to symptom.

- If fix adds new read -> verify something writes the data
- If fix adds new write -> verify something reads the data
- If fix adds new parameter -> verify callers pass it
- If fix adds new branch -> verify production code triggers it

Fixes that fail this check create "dead code" — new capabilities that are never exercised.

### 3.2 Delegate to Subagent

Increment RESOLVE_ATTEMPT, then invoke:

```xml
<invoke name="Task">
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

```bash
cd $WORKSPACE_PATH
ALL_CHANGES=$(git diff "bug/${CARD_ID}/reproduction" --name-only)
git diff --quiet "bug/${CARD_ID}/reproduction" -- "$TEST_FILE_PATH"
TEST_FILE_MODIFIED=$?  # 0=unchanged, 1=modified
SOURCE_CHANGES=$(echo "$ALL_CHANGES" | grep -v -F "$TEST_FILE_PATH")
```

### 3.4 Outcomes

Based on changes detected:

- **BLOCKED or CANNOT_COMPLETE**: Write a comment to the card repository with RESOLVER_REASONING, add `blocked` tag to `CARD.meta.json`, commit. **STOP** — Awaiting user intervention.

- **Test modified**: Go to Test Correction Flow (Step 3.5)

- **Only source changed and test PASSES**: Proceed to Step 4

- **Only source changed and test FAILS**:
  - Capture `PREVIOUS_FAILURE_OUTPUT=$TEST_OUTPUT`
  - **If attempts < 3**: Return to Step 3.2
  - **If attempts >= 3**: Write a comment to the card repository explaining what you tried and the specific technical obstacle preventing resolution. Commit to the card repository.
    **STOP** — Resolution failed after maximum attempts.

### 3.5 Test Correction Flow

1. Increment TEST_CORRECTION_COUNT
2. **If > 2**: Write a comment to the card repository reporting that the reproduction test became unreliable during the fix process. Describe what went wrong with the test behavior and why it cannot be trusted to verify the fix. Commit to the card repository.
   **STOP** — Test became unreliable.
3. Revert source changes: `git checkout "bug/${CARD_ID}/reproduction" -- $SOURCE_CHANGES`
4. Run test to verify it still fails
5. Based on corrected test result:
   - **FAILS (valid)**: Commit correction, update tag: `git tag -f "bug/${CARD_ID}/reproduction" HEAD`, capture new TEST_FAILURE_OUTPUT, reset RESOLVE_ATTEMPT = 0, return to Step 3.2
   - **PASSES (invalid)**: Revert test. If < 3 attempts, return to Step 3.2. Else write comment explaining test validation failure. **STOP** — Test correction failed.

## 4. Validate Full Suite

Run linting, type checking, and tests.

<validation-gate>
**Gate requirement:** ALL validation commands must pass. No exceptions, no workarounds, no rationalizations.

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

There is no "probably fine" state. If you cannot make validation pass, you MUST block.

**When validation fails:**
- If the error is in code you can modify, fix it and re-run
- If the error is in infrastructure or code outside your scope, block immediately — do not retry hoping it resolves itself

**When blocked:**
1. Write error comment with exact failure output to the card
2. Add `blocked` tag to `CARD.meta.json`
3. Commit changes
4. **STOP** — Do not proceed under any circumstances
</validation-gate>

Based on validation result:
- **All validation passes**: Proceed to Step 5
- **Validation fails**: Write comment listing failures, add `blocked` tag, commit, **STOP** — Validation failed.

## 5. Finalize

### 5.1 Squash Commits

Squash all commits since baseline into one:

```bash
cd $WORKSPACE_PATH
COMMIT_COUNT=$(git rev-list --count "bug/${CARD_ID}/baseline"..HEAD)
if [ "$COMMIT_COUNT" -gt 1 ]; then
  git reset --soft "bug/${CARD_ID}/baseline"
  git commit -m "$(cat <<'COMMITMSG'
[final commit message per <workspace-commit-style>]
COMMITMSG
)"
fi
```

Clean up checkpoint tags:

```bash
cd $WORKSPACE_PATH
git tag -d "bug/${CARD_ID}/baseline" "bug/${CARD_ID}/reproduction" 2>/dev/null
```

### 5.2 Complete

Based on review requirement:

- **Review required (gates.reviewRequired is true)**:
  Write a comment to the card repository summarizing the bug, the fix approach, and confirming that both the reproduction test and full test suite pass. Commit to the card repository:

  ```bash
  cd $CARD_REPO_PATH
  export COMMENT_ID=$($NODE !`echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
  cat <<'EOF' > comment/$COMMENT_ID.md
  [bug summary, fix approach, and confirmation that reproduction test and full test suite pass]
  EOF
  git add comment/$COMMENT_ID.md
  git commit -m "bug fix complete, awaiting review"  # <card-repo-commit-style>
  ```

  **STOP** — Merge occurs after user approval.

- **Review NOT required (gates.reviewRequired is false or unset)**:
  Write a completion comment to the card repository summarizing the bug, the fix approach, and confirming all tests pass. Commit to the card repository:

  ```bash
  cd $CARD_REPO_PATH
  export COMMENT_ID=$($NODE !`echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
  cat <<'EOF' > comment/$COMMENT_ID.md
  [bug summary, fix approach, and confirmation that reproduction test and full test suite pass]
  EOF
  git add comment/$COMMENT_ID.md
  git commit -m "bug fix complete"  # <card-repo-commit-style>
  ```

  Then launch the merge agent:

  ```xml
  <invoke name="Task">
  <parameter name="description">Merge</parameter>
  <parameter name="subagent_type">runtime:card:merge</parameter>
  <parameter name="prompt">!`echo "Merge the \"$WORKSPACE_BRANCH\" branch into the \"$BASE_BRANCH\" branch."`</parameter>
  </invoke>
  ```

</instructions>
