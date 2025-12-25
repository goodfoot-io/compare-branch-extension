---
name: issue-bug
description: Fix testable bugs using test-first methodology in an isolated worktree. Creates reproduction test that must fail, then fixes source code while tracking any test modifications. Use when issue describes a programmatically verifiable defect (not CSS/visual issues).
---

<input-format>
Extract from issue data:

**Required Fields:**
- [ISSUE_ID] = The issue's unique identifier (`id`)
- [TITLE] = The issue title (`title`)
- [DESCRIPTION] = The issue description with requirements (`description`)
- [COMMENTS] = Array of comments with author, body, timestamps (`comments`)
- [REVIEW_REQUIRED] = Whether merge approval is needed (`review` field, default: false)

**Derived Fields:**
- [FILES_TO_MODIFY] = Files referenced in [DESCRIPTION] or [COMMENTS]
- [BRANCH_NAME] = Generated branch name: `issue-[ISSUE_ID with : and / replaced by -]-[slugified-short-title]`
</input-format>

<instructions>

## Fix Bug with Reproduction Test

Use for issues describing programmatically testable defects. All work happens in an isolated worktree with strict test-first verification.

**This skill enforces the test-first invariant:**
1. Reproduction test MUST fail before fix
2. Any test modification during resolution requires re-validation
3. Test MUST pass after fix

### Check for Existing Work (Resumption Detection)

If [IS_RESUMABLE] is true (prior work exists without completion):
1. Check if worktree exists:
   ```bash
   ls -d .worktrees/issue-[ISSUE_ID]-* 2>/dev/null
   ```
2. If worktree exists:
   - Navigate to it: `cd ".worktrees/$BRANCH_NAME"`
   - Run `git status` to check for uncommitted changes
   - Determine phase: check for reproduction test file, check if test passes/fails
   - Resume at appropriate phase
3. If worktree doesn't exist but branch does:
   - Reattach worktree: `git worktree add ".worktrees/$BRANCH_NAME" "$BRANCH_NAME"`

If [IS_RESUMABLE] is false, proceed to Phase 1.

## Phase 1: Initialize Bug Fix

### Step 1.1: Record Start of Work

Get current commit SHA and record on issue:
```bash
CURRENT_SHA=$(git rev-parse HEAD)
```

```
PATCH /issues/[ISSUE_ID]
{
  "commitSha": "[CURRENT_SHA]"
}
```

### Step 1.2: Create Checkpoint Commit

**Skip if [IS_RESUMABLE] is true.**

Create a checkpoint marker on [BASE_BRANCH]:
```bash
git commit --allow-empty -m "checkpoint: [ISSUE_ID] before bug fix

Issue: [ISSUE_ID]
Title: [TITLE]"
```

**Note:** Do not stage files for the checkpoint. The checkpoint is just a marker in git history. Any uncommitted files in the working directory (artifacts from concurrent agents, user's pending work) should remain uncommitted.

### Step 1.3: Create Worktree

```bash
BRANCH_NAME="issue-[ISSUE_ID with : and / replaced by -]-[slugified-short-title]"
instant-worktree "$BRANCH_NAME"
cd ".worktrees/$BRANCH_NAME"
```

Record baseline for change detection:
```bash
WORKTREE_BASELINE=$(git rev-parse HEAD)
```

---

## Phase 2: Subagent Creates Reproduction Test

**Pattern:** Prepare context → Delegate to subagent → Validate output → Retry if needed

Initialize: [REPRODUCTION_ATTEMPT] = 0 (max 3)

### Prepare Context

Extract from [DESCRIPTION] and [COMMENTS]:
- Expected vs actual behavior
- Error messages / stack traces
- Scope hints (files, packages, functions)

### Subagent Task

Increment [REPRODUCTION_ATTEMPT]

Use the Task tool to delegate test creation:

```xml
<invoke name="Task">
<parameter name="description">create-reproduction-test</parameter>
<parameter name="subagent_type">general-purpose</parameter>
<parameter name="prompt"># Task: Create Minimal Reproduction Test

## Bug
[BUG_DESCRIPTION from issue]

## Scope
[SCOPE_HINT - files/packages mentioned]

[If REPRODUCTION_ATTEMPT > 1:]
## Previous Attempt Failed
The previous test PASSED when it should have FAILED:

[TEST_PASS_ANALYSIS]

Previous test code (DO NOT repeat this approach):
```
[previous test content]
```
[End if]

## Requirements
- Create a NEW test file (do not modify existing tests)
- Test must be minimal and MUST FAIL, demonstrating the bug
- Follow existing test patterns in the codebase
- Do NOT fix the bug - only write a test that exposes it

## Response Format
## Status
[SUCCESS | BLOCKED | CANNOT_COMPLETE]

## Result
[Absolute file path created, or "None"]

## Reasoning
[How test reproduces the bug, or why blocked]
</parameter>
</invoke>
```

### Validate Output

**Trust git over subagent reports.**

Verify test file exists:
```bash
if [ ! -f "[TEST_FILE_PATH]" ]; then
  # Subagent claimed success but file missing - retry if attempts remain
fi
```

Check for unexpected modifications:
```bash
MODIFIED_FILES=$(git diff "$WORKTREE_BASELINE" --name-only --diff-filter=M)
if [ -n "$MODIFIED_FILES" ]; then
  # Ask user: "Were these changes expected? [Yes, proceed] / [No, revert them]"
  # If revert: git checkout "$WORKTREE_BASELINE" -- $MODIFIED_FILES
fi
```

Run test and verify it fails:
```bash
git add "[TEST_FILE_PATH]"
yarn test "[TEST_FILE_PATH]" 2>&1
TEST_EXIT_CODE=$?
```

### Outcomes

**Test FAILS (expected):** Success path
- Capture [TEST_FAILURE_OUTPUT]
- Commit test:
  ```bash
  git add -A
  git commit -m "test: add reproduction test for [ISSUE_ID]

  Bug: [brief bug description]
  Test demonstrates the defect by failing against current code."
  ```
- Record checkpoint: `TEST_READY_SHA=$(git rev-parse HEAD)`
- Post progress comment:
  ```
  POST /issues/[ISSUE_ID]/comments
  {
    "body": "## Reproduction Test Created\n\nTest file: `[TEST_FILE_PATH]`\n\n### Test Output (failing as expected)\n```\n[TEST_FAILURE_OUTPUT snippet]\n```\n\nProceeding to fix.",
    "author": "agent",
    "codeReferences": [{"uri": "[TEST_FILE_PATH]", "range": {...}}]
  }
  ```
- Proceed to Phase 3

**Test PASSES (unexpected):** Retry with feedback
- Analyze why test passes when it should fail
- Capture analysis as [TEST_PASS_ANALYSIS]
- Revert to baseline:
  ```bash
  git checkout "$WORKTREE_BASELINE" -- .
  git clean -fd
  ```
- **If [REPRODUCTION_ATTEMPT] < 3:** Return to "Subagent Task" with [TEST_PASS_ANALYSIS]
- **If [REPRODUCTION_ATTEMPT] >= 3:** Post comment, set `needs_review`, **STOP**

---

## Phase 3: Subagent Resolves Bug

**Pattern:** Delegate fix → Validate output → Handle test modifications → Retry if needed

Initialize: [RESOLVE_ATTEMPT] = 0 (max 3)

### Subagent Task

Increment [RESOLVE_ATTEMPT]

Use the Task tool to delegate bug resolution:

```xml
<invoke name="Task">
<parameter name="description">resolve-bug</parameter>
<parameter name="subagent_type">general-purpose</parameter>
<parameter name="prompt"># Task: Fix Bug to Make Test Pass

## Bug
[BUG_DESCRIPTION]

## Failing Test
File: [TEST_FILE_PATH]

## Test Output
```
[TEST_FAILURE_OUTPUT]
```

[If RESOLVE_ATTEMPT > 1:]
## Previous Attempt Failed
The previous fix did not make the test pass:
```
[previous failure output]
```
[End if]

## Requirements
- Fix the source code to make the test pass
- Do not break existing functionality
- Run linting after changes

## If Test Needs Correction
If the test itself has incorrect assertions, wrong setup, or doesn't actually
capture the bug properly:
1. Modify ONLY the test - do NOT also fix source code in the same attempt
2. Return status TEST_MODIFIED
The orchestrator will verify the modified test still fails, then re-invoke you
to fix the source code.

## Response Format
## Status
[SUCCESS | TEST_MODIFIED | BLOCKED | CANNOT_COMPLETE]

## Result
[File paths modified, or "None"]

## Reasoning
[Fix explanation, or why test was modified, or why blocked]
</parameter>
</invoke>
```

Capture [RESOLVER_REASONING] from response.

### Validate Output

**Trust git over subagent reports.**

Detect what actually changed:
```bash
ALL_CHANGES=$(git diff "$TEST_READY_SHA" --name-only)

git diff --quiet "$TEST_READY_SHA" -- "[TEST_FILE_PATH]"
TEST_FILE_MODIFIED=$?  # 0=unchanged, 1=modified

SOURCE_CHANGES=$(echo "$ALL_CHANGES" | grep -v "[TEST_FILE_PATH]")
```

### Outcomes

**BLOCKED or CANNOT_COMPLETE:**
- Post comment with reasoning
- Set status to `needs_review`
- **STOP** - Leave worktree intact

**Test was modified (TEST_FILE_MODIFIED = 1):**

Subagent touched the test file—validate the correction before proceeding.

```bash
# If subagent ALSO changed source files, revert them first
# (validate test change in isolation)
if [ -n "$SOURCE_CHANGES" ]; then
  git checkout "$TEST_READY_SHA" -- $SOURCE_CHANGES
fi
```

Run test to verify it still fails (still reproduces bug):
```bash
yarn test "[TEST_FILE_PATH]" 2>&1
CORRECTED_TEST_EXIT_CODE=$?
```

- **Test FAILS (valid correction):**
  - Commit test correction:
    ```bash
    git add "[TEST_FILE_PATH]"
    git commit -m "test: correct reproduction test for [ISSUE_ID]

    Reason: [RESOLVER_REASONING]"
    ```
  - Update checkpoint: `TEST_READY_SHA=$(git rev-parse HEAD)`
  - Capture new [TEST_FAILURE_OUTPUT]
  - **Reset [RESOLVE_ATTEMPT] = 0** (fresh attempts with corrected test)
  - Return to "Subagent Task"

- **Test PASSES (invalid correction):**
  - Revert test: `git checkout "$TEST_READY_SHA" -- "[TEST_FILE_PATH]"`
  - **If [RESOLVE_ATTEMPT] < 3:** Return to "Subagent Task" with note about invalid modification
  - **If [RESOLVE_ATTEMPT] >= 3:** Post comment, set `needs_review`, **STOP**

**Only source changed (SUCCESS path):**

Run test to verify fix:
```bash
yarn test "[TEST_FILE_PATH]" 2>&1
FIX_TEST_EXIT_CODE=$?
```

- **Test PASSES:** Proceed to Phase 4
- **Test FAILS:**
  - **If [RESOLVE_ATTEMPT] < 3:** Return to "Subagent Task" with failure context
  - **If [RESOLVE_ATTEMPT] >= 3:** Post comment, set `needs_review`, **STOP**

---

## Phase 4: Validate Full Test Suite

```bash
yarn test 2>&1
FULL_SUITE_EXIT_CODE=$?
```

**If all tests pass:** Proceed to Phase 5

**If regressions detected:**
- Post comment listing failed tests
- Set status to `needs_review`
- **STOP** - Leave worktree intact
- User can: investigate / provide guidance / accept regressions

---

## Phase 5: Finalize (Squashed Commit)

### Step 5.1: Squash Commits in Worktree

Squash all commits since branching into single commit:

```bash
# Count commits since branch point
COMMIT_COUNT=$(git rev-list --count "$WORKTREE_BASELINE"..HEAD)

if [ "$COMMIT_COUNT" -gt 1 ]; then
  git reset --soft "$WORKTREE_BASELINE"
  git commit -m "fix: [brief description]

Issue: [ISSUE_ID]
Bug: [BUG_DESCRIPTION summary]

Root cause: [RESOLVER_REASONING]

Test: [TEST_FILE_PATH]
- Reproduction test verifies the fix
- Test failed before fix, passes after"
fi
```

### Step 5.2: Check Review Requirement

**If [REVIEW_REQUIRED] is true:**

Post bug fix summary for user review (do NOT merge yet):

```bash
cd ".worktrees/$BRANCH_NAME"
IMPL_SHA=$(git rev-parse HEAD)
```

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Bug Fix Ready for Review\n\n### Bug\n[BUG_DESCRIPTION]\n\n### Reproduction Test\n- File: `[TEST_FILE_PATH]`\n- Verified: failed before fix, passes after\n\n### Fix\n- Files modified: [list from git diff]\n- Approach: [RESOLVER_REASONING]\n\n### Validation\n- Reproduction test: Passes\n- Full test suite: All pass\n\nAwaiting approval to merge.",
  "author": "agent",
  "commitSha": "[IMPL_SHA]",
  "codeReferences": [/* test file + all modified source files */]
}
```

```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review"
}
```

**STOP here.** The merge will occur after user approval via the `issue-merge-approved` skill.

---

**If [REVIEW_REQUIRED] is false:**

Post bug fix completion and merge:

```bash
cd ".worktrees/$BRANCH_NAME"
IMPL_SHA=$(git rev-parse HEAD)
```

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Bug Fix Complete\n\n### Bug\n[BUG_DESCRIPTION]\n\n### Reproduction Test\n- File: `[TEST_FILE_PATH]`\n- Verified: failed before fix, passes after\n\n### Fix\n- Approach: [RESOLVER_REASONING]\n\n### Validation\n- Reproduction test: Passes\n- Full test suite: All pass",
  "author": "agent",
  "commitSha": "[IMPL_SHA]",
  "codeReferences": [/* test file + all modified source files */]
}
```

Load the `claude-code-cli:issue-merge-approved` skill to merge the bug fix:

```xml
<invoke name="Skill">
<parameter name="skill">claude-code-cli:issue-merge-approved</parameter>
</invoke>
```

</instructions>
