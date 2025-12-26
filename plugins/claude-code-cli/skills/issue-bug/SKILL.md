---
name: issue-bug
description: Fix testable bugs using test-first methodology in an isolated worktree. Creates reproduction test that must fail, then fixes source code while tracking any test modifications.
---

<placeholder-variables>
[FILES_TO_MODIFY] — Files referenced in [DESCRIPTION] or [COMMENTS]
[BRANCH_NAME] — `issue-[ISSUE_ID]-[slugified-title]` (`:` and `/` replaced with `-`)
</placeholder-variables>

<tools>

**instant-worktree** — Creates git worktree with symlinked dependencies (~2 seconds).

```bash
instant-worktree "[BRANCH_NAME]"
```

Creates worktree at `.worktrees/[BRANCH_NAME]`. Creates new branch if needed, or attaches to existing branch.

</tools>

<instructions>

## Test-First Invariant

This skill enforces strict test-first verification:

1. Reproduction test MUST fail before fix
2. Any test modification during resolution requires re-validation
3. Test MUST pass after fix

## 1. Prepare Environment

Determine path using first matching condition:
- **[IS_RESUMABLE] AND worktree exists**: Resume
- **[IS_RESUMABLE] AND branch exists (no worktree)**: Recreate
- **Otherwise**: New

### Resume

```bash
cd ".worktrees/[BRANCH_NAME]"
git status
WORKTREE_BASELINE=$(git log --format=%H --grep="checkpoint: [ISSUE_ID]" -1)
TEST_FILE_PATH=$(git log --oneline --name-only "$WORKTREE_BASELINE"..HEAD | grep -E '\.test\.(ts|js|tsx|jsx)$' | head -1)
```

Determine resume point:
- **TEST_FILE_PATH empty**: 2. Create Reproduction Test
- **TEST_FILE_PATH exists AND `yarn test "$TEST_FILE_PATH"` fails**: 3. Resolve Bug (capture TEST_FAILURE_OUTPUT first)
- **TEST_FILE_PATH exists AND test passes**: 4. Validate Full Suite

### Recreate

```bash
git worktree add ".worktrees/[BRANCH_NAME]" "[BRANCH_NAME]"
cd ".worktrees/[BRANCH_NAME]"
```

Then follow Resume steps above.

### New

1. Create worktree:
   ```bash
   WORKTREE_JSON=$(instant-worktree "[BRANCH_NAME]")
   WORKTREE_DIR=$(echo "$WORKTREE_JSON" | jq -r '.worktree')
   WORKTREE_BASELINE=$(echo "$WORKTREE_JSON" | jq -r '.baseSha')
   cd "$WORKTREE_DIR"
   ```

2. Initialize bug fix:
   ```
   PATCH /issues/[ISSUE_ID]
   {
     "status": "in_progress"
   }
   ```
   Tell the user you're beginning work on the bug. Briefly describe what you'll investigate first or what approach you're taking to understand and reproduce the issue.
   ```
   POST /issues/[ISSUE_ID]/comments
   {
     "body": "[comment content]",
     "author": "agent",
     "commitSha": "${WORKTREE_BASELINE}"
   }
   ```

## 2. Create Reproduction Test

Initialize: REPRODUCTION_ATTEMPT = 0 (max 3)

### Prepare Context

Extract from [DESCRIPTION] and [COMMENTS]:

- BUG_DESCRIPTION — One-sentence summary: "[Expected behavior] but [actual behavior]"
- Error messages / stack traces (verbatim)
- SCOPE_HINT — Files, packages, or functions mentioned

### Delegate to Subagent

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

### Capture and Validate

Parse response: SUBAGENT_STATUS, TEST_FILE_PATH, SUBAGENT_REASONING

Verify using git (do not rely solely on subagent status):

```bash
# Verify file exists
if [ ! -f "$TEST_FILE_PATH" ]; then
  if [ "$REPRODUCTION_ATTEMPT" -lt 3 ]; then
    # Return to Delegate to Subagent
  else
    # Post failure comment, set needs_review, STOP
  fi
fi

# Check for unexpected modifications
MODIFIED_FILES=$(git diff "$WORKTREE_BASELINE" --name-only --diff-filter=M)
if [ -n "$MODIFIED_FILES" ]; then
  # Post comment asking user: proceed or revert?
  # Set needs_review, STOP — await user direction
fi

# Run test
git add "$TEST_FILE_PATH"
TEST_OUTPUT=$(yarn test "$TEST_FILE_PATH" 2>&1)
TEST_EXIT_CODE=$?
```

### Outcomes

**BLOCKED or CANNOT_COMPLETE:**

Post comment with SUBAGENT_REASONING, set status `needs_review`, add `blocked` tag, **STOP**

**Test FAILS (expected):**

- Commit: `git add -A && git commit -m "test: add reproduction test for [ISSUE_ID]"`
- Record: `TEST_READY_SHA=$(git rev-parse HEAD)`
- Capture: `TEST_FAILURE_OUTPUT=$TEST_OUTPUT`
- Post a progress comment informing the user that you've created a test demonstrating the bug. Explain what the test checks and why it currently fails.
  ```
  POST /issues/[ISSUE_ID]/comments
  {
    "body": "[comment content]",
    "author": "agent"
  }
  ```
- Proceed to **3. Resolve Bug**

**Test PASSES (unexpected):**

- Synthesize TEST_PASS_ANALYSIS: "[Test name] passed because [reason]. Expected failure due to [bug behavior]."
- Revert: `git checkout "$WORKTREE_BASELINE" -- . && git clean -fd`
- If REPRODUCTION_ATTEMPT < 3: Return to **Delegate to Subagent**
- If REPRODUCTION_ATTEMPT >= 3: Report that you were unable to create a test that reproduces the reported bug. Summarize what you tried in each attempt and share your hypothesis about why reproduction failed. Then **STOP**.
  ```
  POST /issues/[ISSUE_ID]/comments
  {
    "body": "[comment content]",
    "author": "agent"
  }
  ```
  ```
  PATCH /issues/[ISSUE_ID]
  {
    "status": "needs_review"
  }
  ```

## 3. Resolve Bug

Initialize: RESOLVE_ATTEMPT = 0 (max 3), TEST_CORRECTION_COUNT = 0 (max 2)

### Delegate to Subagent

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

## Requirements
- Fix source code to make test pass
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

### Validate

```bash
ALL_CHANGES=$(git diff "$TEST_READY_SHA" --name-only)
git diff --quiet "$TEST_READY_SHA" -- "$TEST_FILE_PATH"
TEST_FILE_MODIFIED=$?  # 0=unchanged, 1=modified
SOURCE_CHANGES=$(echo "$ALL_CHANGES" | grep -v -F "$TEST_FILE_PATH")
```

### Outcomes

**BLOCKED or CANNOT_COMPLETE:**

Post comment with reasoning, set status `needs_review`, add `blocked` tag, **STOP**

**Test modified:**

1. Increment TEST_CORRECTION_COUNT
2. If TEST_CORRECTION_COUNT > 2: Post comment, set `needs_review`, **STOP**
3. Revert source changes if any: `git checkout "$TEST_READY_SHA" -- $SOURCE_CHANGES`
4. Run test to verify it still fails
5. **If FAILS (valid):** Commit correction, update TEST_READY_SHA, capture new TEST_FAILURE_OUTPUT, reset RESOLVE_ATTEMPT = 0, return to **Delegate to Subagent**
6. **If PASSES (invalid):** Revert test, retry if < 3 attempts, else post comment explaining test validation failure, set `needs_review`, and **STOP**

**Only source changed:**

1. Stage: `git add -A`
2. Run test: `yarn test "$TEST_FILE_PATH"`
3. **If PASSES:** Proceed to **4. Validate Full Suite**
4. **If FAILS:** Capture `PREVIOUS_FAILURE_OUTPUT`, retry if < 3 attempts, else post comment with failure analysis, set `needs_review`, and **STOP**

### Failure Comment Templates

**For fix failures (RESOLVE_ATTEMPT >= 3):**

Explain that you couldn't resolve the bug despite multiple attempts. Describe what you tried and identify the specific technical obstacle preventing resolution.
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
  "author": "agent"
}
```

**For test validation failures (TEST_CORRECTION_COUNT > 2):**

Report that the reproduction test became unreliable during the fix process. Describe what went wrong with the test behavior and why it can't be trusted to verify the fix.
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
  "author": "agent"
}
```

## 4. Validate Full Suite

```bash
yarn lint
yarn test
```

**If all pass:** Proceed to **5. Finalize**

**If failures:** Post comment listing issues, set `needs_review`, **STOP**

## 5. Finalize

### Squash Commits

```bash
COMMIT_COUNT=$(git rev-list --count "$WORKTREE_BASELINE"..HEAD)
if [ "$COMMIT_COUNT" -gt 1 ]; then
  git reset --soft "$WORKTREE_BASELINE"
  git commit -m "$(cat <<'EOF'
fix: [TITLE]

Issue: [ISSUE_ID]
Bug: ${BUG_DESCRIPTION}
Root cause: ${RESOLVER_REASONING}

Test: ${TEST_FILE_PATH}
EOF
)"
fi
```

### Complete

**If [REVIEW_REQUIRED]:**

Tell the user the bug fix is complete and awaiting their review. Summarize what the bug was, explain how you fixed it, and confirm that both the reproduction test and full test suite pass. Indicate you're waiting for approval.
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
  "author": "agent",
  "commitSha": "$(git rev-parse HEAD)",
  "codeReferences": [
    {
      "path": "${TEST_FILE_PATH}"
    }
  ]
}
```

```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review"
}
```

**STOP** — Merge via `issue-merge` skill after approval.

**If NOT [REVIEW_REQUIRED]:**

Announce that you've completed the bug fix. Summarize the bug, explain your fix approach, and confirm all tests pass. Since no review is required, you're proceeding directly to merge.
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
  "author": "agent",
  "commitSha": "$(git rev-parse HEAD)",
  "codeReferences": [
    {
      "path": "${TEST_FILE_PATH}"
    }
  ]
}
```

```xml
<invoke name="Skill">
<parameter name="skill">claude-code-cli:issue-merge</parameter>
</invoke>
```

</instructions>
