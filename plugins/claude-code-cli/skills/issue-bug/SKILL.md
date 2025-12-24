---
name: issue-bug
description: Fix testable bugs using test-first methodology in an isolated worktree. Creates reproduction test that must fail, then fixes source code while tracking any test modifications. Use when issue describes a programmatically verifiable defect (not CSS/visual issues).
---

<input-format>
Extract from issue data:

**Required Fields:**
- [TITLE] = The issue title (`title`)
- [DESCRIPTION] = The issue description with requirements (`description`)
- [COMMENTS] = Array of comments with author, body, timestamps (`comments`)

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

## Phase 2: Create Reproduction Test

**Goal:** Create a minimal test that FAILS, demonstrating the bug.

Initialize: [REPRODUCTION_ATTEMPT] = 0 (max 3)

### Step 2.1: Analyze Bug Description

Extract from [DESCRIPTION] and [COMMENTS]:
- Expected behavior
- Actual behavior
- Error messages / stack traces
- Scope hints (files, packages, functions)

### Step 2.2: Launch Test Creation Subagent

Increment [REPRODUCTION_ATTEMPT]

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

### Step 2.3: Verify Test File Created and No Unexpected Changes

**Trust git over subagent reports.**

```bash
# Verify file was created
if [ ! -f "[TEST_FILE_PATH]" ]; then
  # Subagent claimed success but file missing
  # Retry Step A.2 if attempts remain, else report error
fi

# Check for unexpected modifications to existing files
MODIFIED_FILES=$(git diff "$WORKTREE_BASELINE" --name-only --diff-filter=M)
if [ -n "$MODIFIED_FILES" ]; then
  # Report unexpected modifications to user via comment
  # Ask: "Were these changes expected? [Yes, proceed] / [No, revert them]"
  # If revert: git checkout "$WORKTREE_BASELINE" -- $MODIFIED_FILES
fi
```

### Step 2.4: Execute Test and Verify Failure

```bash
git add "[TEST_FILE_PATH]"
yarn test "[TEST_FILE_PATH]" 2>&1
TEST_EXIT_CODE=$?
```

**If test FAILS (exit code != 0):**
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

**If test PASSES (unexpected):**
- Read test file content
- Analyze why it passes when it should fail
- Capture analysis as [TEST_PASS_ANALYSIS]
- Revert to baseline:
  ```bash
  git checkout "$WORKTREE_BASELINE" -- .
  git clean -fd
  ```
- **If [REPRODUCTION_ATTEMPT] < 3:** Return to Step 2.2 with [TEST_PASS_ANALYSIS]
- **If [REPRODUCTION_ATTEMPT] >= 3:**
  - Post comment asking user for guidance
  - Set status to `needs_review`
  - **STOP** - Leave worktree intact for manual investigation

---

## Phase 3: Resolve Bug

**Goal:** Fix source code so test passes. Test modifications are allowed but require re-validation.

Initialize: [RESOLVE_ATTEMPT] = 0 (max 3)

### Step 3.1: Launch Bug Resolution Subagent

Increment [RESOLVE_ATTEMPT]

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

### Step 3.2: Detect Actual File Changes

**Trust git over subagent reports.**

```bash
# What changed since test-ready checkpoint?
ALL_CHANGES=$(git diff "$TEST_READY_SHA" --name-only)

# Was test file modified?
git diff --quiet "$TEST_READY_SHA" -- "[TEST_FILE_PATH]"
TEST_FILE_MODIFIED=$?  # 0=unchanged, 1=modified

# Source files changed (excluding test)
SOURCE_CHANGES=$(echo "$ALL_CHANGES" | grep -v "[TEST_FILE_PATH]")
```

### Step 3.3: Handle Based on What Changed

**Case 1: BLOCKED or CANNOT_COMPLETE**
- Post comment with reasoning
- Set status to `needs_review`
- **STOP** - Leave worktree intact

**Case 2: Test was modified (TEST_FILE_MODIFIED = 1)**

The resolver touched the test file. This requires validation.

```bash
# If resolver ALSO changed source files, revert source changes
# (We need to validate test change in isolation first)
if [ -n "$SOURCE_CHANGES" ]; then
  git checkout "$TEST_READY_SHA" -- $SOURCE_CHANGES
fi
```

Go to Step 3.5 (Validate Test Correction)

**Case 3: Only source changed (SUCCESS path)**

Proceed to Step 3.4

### Step 3.4: Validate Fix

```bash
yarn test "[TEST_FILE_PATH]" 2>&1
FIX_TEST_EXIT_CODE=$?
```

**If test PASSES:** Proceed to Phase 4

**If test FAILS:**
- Capture new failure output
- **If [RESOLVE_ATTEMPT] < 3:** Return to Step 3.1 with failure context
- **If [RESOLVE_ATTEMPT] >= 3:**
  - Post comment with failure details
  - Set status to `needs_review`
  - **STOP** - Leave worktree intact for manual intervention

### Step 3.5: Validate Test Correction

The resolver modified the test. Verify modified test STILL FAILS (still reproduces bug):

```bash
yarn test "[TEST_FILE_PATH]" 2>&1
CORRECTED_TEST_EXIT_CODE=$?
```

**If test FAILS (valid correction):**
- Commit test correction:
  ```bash
  git add "[TEST_FILE_PATH]"
  git commit -m "test: correct reproduction test for [ISSUE_ID]

  Reason: [RESOLVER_REASONING]"
  ```
- Update checkpoint: `TEST_READY_SHA=$(git rev-parse HEAD)`
- Capture new [TEST_FAILURE_OUTPUT]
- **Reset [RESOLVE_ATTEMPT] = 0** (fresh attempts with corrected test)
- Return to Step 3.1

**If test PASSES (invalid correction):**
- The test change made it pass without fixing the bug - invalid
- Revert test:
  ```bash
  git checkout "$TEST_READY_SHA" -- "[TEST_FILE_PATH]"
  ```
- **If [RESOLVE_ATTEMPT] < 3:** Return to Step 3.1 with note about invalid test modification
- **If [RESOLVE_ATTEMPT] >= 3:**
  - Post comment explaining situation
  - Set status to `needs_review`
  - **STOP**

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
- Test failed before fix, passes after

Generated with Claude Code"
fi
```

### Step 5.2: Merge Back to Main

First, return to the main workspace and check for uncommitted files:
```bash
cd "$(git rev-parse --show-toplevel)"
git status --porcelain
```

If uncommitted files exist, assess and handle them before merging:
- **Known artifacts** (e.g., `.compare-branch/claude-launcher-*.mjs`): Delete them
- **Legitimate uncommitted work**: Stash and restore after merge
- **Potential conflicts with incoming changes**: Resolve before proceeding

Then merge:
```bash
git merge --no-ff "$BRANCH_NAME" -m "Merge branch '$BRANCH_NAME'

Issue: [ISSUE_ID]
Title: [TITLE]"
```

**If merge conflict:**
1. Abort merge: `git merge --abort`
2. Attempt resolution via rebase in worktree
3. If unresolvable: execute `claude-code-cli:issue-error-recovery`

### Step 5.3: Clean Up Worktree

```bash
FINAL_SHA=$(remove-instant-worktree "$BRANCH_NAME")
```

### Step 5.4: Post Completion Comment

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Bug Fix Complete\n\n### Bug\n[BUG_DESCRIPTION]\n\n### Reproduction Test\n- File: `[TEST_FILE_PATH]`\n- Verified: failed before fix, passes after\n\n### Fix\n- Files modified: [list from git diff]\n- Approach: [RESOLVER_REASONING]\n\n### Validation\n- Reproduction test: Passes\n- Full test suite: All pass\n\nReady for review.",
  "author": "agent",
  "commitSha": "[FINAL_SHA]",
  "codeReferences": [/* test file + all modified source files */]
}
```

### Step 5.5: Update Status

```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review",
  "commitSha": "[FINAL_SHA]"
}
```

</instructions>
