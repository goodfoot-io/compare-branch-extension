---
name: issue-implementation-with-plan
description: Implement approved plans using specialized agents in an isolated worktree.
---

<input-format>
Extract from issue data:

**Required Fields:**
- [ISSUE_ID] = The issue's unique identifier
- [TITLE] = The issue title (`title`)
- [DESCRIPTION] = The issue description with requirements (`description`)
- [PLAN_CONTENT] = The approved plan markdown from `planContent` field

**Derived Fields:**
- [LATEST_USER_COMMENT] = Most recent comment from `author: "user"` (if any)
- [FILES_TO_MODIFY] = Files referenced in [PLAN_CONTENT] or [DESCRIPTION]
- [BRANCH_NAME] = Generated branch name: `issue-[ISSUE_ID with : and / replaced by -]-[slugified-short-title]`
- [IS_RESUMABLE] = Agent work indicators exist (checkpoints, worktree) AND no completion comment
</input-format>

<tools>

## Worktree Management Tools

### instant-worktree

Creates a git worktree with symlinked dependencies for fast setup (~2 seconds).

**Usage:**
```bash
instant-worktree "branch-name"
```

**Output:** Prints the created worktree path and branch name:
```
Created branch: branch-name
Created worktree directory: .worktrees/branch-name
```

**Behavior:**
- Creates worktree at `.worktrees/[BRANCH_NAME]`
- Creates a new branch with the given name
- Fails if branch already exists or worktree path is occupied

### remove-instant-worktree

Removes a worktree, deletes its associated branch, and returns the final commit SHA.

**Usage:**
```bash
FINAL_SHA=$(remove-instant-worktree "branch-name")
```

**Output:** Prints the branch's final commit SHA before removal.

**Behavior:**
- Removes the worktree at `.worktrees/[BRANCH_NAME]`
- Deletes the local branch
- Returns the commit SHA for recording in issue comments

</tools>

<orchestrator-role>

## Orchestrator Role

CRITICAL: The orchestrator ONLY coordinates - it does NOT implement code directly.

### Direct Fixes (Orchestrator handles)
- Syntax errors visible in error output
- Import statement corrections (e.g., missing .js extensions)
- Config file typos
- Test setup/polyfills

### Delegated Tasks (Agents handle)
- All feature implementation
- Business logic changes
- Complex debugging
- Multi-file refactoring
- Anything requiring investigation
- Library integrations
- API changes
- Validation issues beyond trivial syntax errors

### Golden Rule
If the plan asks to implement something → Delegate to `claude-code-cli:implementer`
Never use Read/Write/Edit/MultiEdit for feature implementation.
Only use TodoWrite and Task tools for coordination.

</orchestrator-role>

<zero-tolerance-policy>

## Zero-Tolerance Test Policy (NON-NEGOTIABLE)

Every test failure is a production failure. No exceptions.

### These rationalizations are NEVER acceptable:
- "Only the new test is failing" → New test proves new code is broken
- "It's a WebSocket/connection issue" → Production will have same issue
- "Tests timeout in the environment" → Code has cleanup/leak problems
- "Unrelated tests are failing" → Your changes broke something
- "It works locally" → Must work in CI/test environment too
- "The test is flaky" → Flaky = race condition that will crash production
- "It's a pre-existing issue" → Pre-existing issues MUST be fixed

### The only acceptable state: ALL tests pass, ZERO errors

</zero-tolerance-policy>

<instructions>

## Phase 1: Prepare Implementation Environment

### Step 1.1: Check for Existing Work (Resumption Detection)

If [IS_RESUMABLE] is true (prior work exists without completion):
1. Check if worktree exists:
   ```bash
   ls -d .worktrees/issue-[ISSUE_ID]-* 2>/dev/null
   ```
2. If worktree exists:
   - Navigate to it: `cd ".worktrees/$BRANCH_NAME"`
   - Run `git status` to check for uncommitted changes
   - If uncommitted changes exist, review and decide whether to commit or stash
   - Skip to Phase 2 (Implementation)
3. If worktree doesn't exist, check if branch exists:
   ```bash
   git branch --list "$BRANCH_NAME"
   ```
   - If branch exists: Attach worktree to existing branch:
     ```bash
     git worktree add ".worktrees/$BRANCH_NAME" "$BRANCH_NAME"
     ```
   - If branch doesn't exist: Start fresh with Step 1.2.

If [IS_RESUMABLE] is false (new work), proceed to Step 1.2.

### Step 1.2: Record Start of Work

Get current commit SHA and record it on the issue:
```bash
CURRENT_SHA=$(git rev-parse HEAD)
```

```
PATCH /issues/[ISSUE_ID]
{
  "commitSha": "[CURRENT_SHA]"
}
```

### Step 1.3: Create Checkpoint Commit (New Work Only)

**Skip this step if [IS_RESUMABLE] is true** — a checkpoint already exists.

For new work only, create a checkpoint marker on the base branch:
```bash
git commit --allow-empty -m "checkpoint: [ISSUE_ID] before implementation

Issue: [ISSUE_ID]
Title: [TITLE]"
CHECKPOINT_SHA=$(git rev-parse HEAD)
```

Post checkpoint to issue:
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "Checkpoint: before implementation",
  "author": "agent",
  "commitSha": "[CHECKPOINT_SHA]"
}
```

### Step 1.4: Create Worktree

Generate branch name and create isolated worktree:
```bash
# Branch format: issue-[escaped-issue-id]-[short-title-slug]
# Replace colons and slashes with hyphens to avoid path issues
BRANCH_NAME="issue-[ISSUE_ID with : and / replaced by -]-[slugified-short-title]"

# Create worktree
instant-worktree "$BRANCH_NAME"

# Store worktree path for agent prompts
WORKTREE_PATH=".worktrees/$BRANCH_NAME"
```

## Phase 2: Execute Implementation

### Step 2.1: Initialize Todo List

Create todos from [PLAN_CONTENT] to track implementation progress:

```xml
<invoke name="TodoWrite">
<parameter name="todos">
[
  {"content": "Implement [first plan objective]", "status": "pending", "activeForm": "Implementing [first objective]"},
  {"content": "Implement [second plan objective]", "status": "pending", "activeForm": "Implementing [second objective]"},
  ...
]
</parameter>
</invoke>
```

### Step 2.2: Create Task Checkpoint

Before each implementation task:
```bash
cd "$WORKTREE_PATH"
git add -A
git commit --allow-empty -m "checkpoint: before [TASK_DESCRIPTION]

Issue: [ISSUE_ID]
Progress: [COMPLETED_COUNT] of [TOTAL_COUNT] tasks complete"
TASK_CHECKPOINT=$(git rev-parse HEAD)
```

Post checkpoint to issue:
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "Checkpoint: before [TASK_DESCRIPTION]\n\nProgress: [COMPLETED_COUNT] of [TOTAL_COUNT] tasks complete",
  "author": "agent",
  "commitSha": "[TASK_CHECKPOINT]"
}
```

### Step 2.3: Delegate to Implementer Agent

For each todo, delegate to the implementer agent:

```xml
<invoke name="Task">
<parameter name="description">[Task description from todo]</parameter>
<parameter name="subagent_type">claude-code-cli:implementer</parameter>
<parameter name="prompt">
Issue: [ISSUE_ID] - [TITLE]
Description: [DESCRIPTION]
Worktree: [WORKTREE_PATH]

## Implementation Objective
[Specific feature or component to implement from current todo]

## Checkpoint Reference
Task checkpoint SHA: [TASK_CHECKPOINT]

## Validation Requirement (ZERO-TOLERANCE)
ANY test failure = task fails. No exceptions.
Run ALL validation commands from the plan's Validation Commands section.
If no Validation Commands in plan: run typecheck, test, AND lint.
Required: ZERO errors from ALL validation commands.

This completes todo: [current todo description]
</parameter>
</invoke>
```

### Step 2.4: Process Implementation Result

**Based on implementer status:**

**COMPLETED** (all validations pass):
1. Mark todo as completed
2. Commit in worktree:
   ```bash
   cd "$WORKTREE_PATH"
   git add -A
   git commit -m "feat: [TASK_DESCRIPTION]

   Issue: [ISSUE_ID]

   [Summary from implementer report]"
   IMPL_SHA=$(git rev-parse HEAD)
   ```
3. Post implementation commit to issue:
   ```
   POST /issues/[ISSUE_ID]/comments
   {
     "body": "Completed: [TASK_DESCRIPTION]\n\n[Summary from implementer report]",
     "author": "agent",
     "commitSha": "[IMPL_SHA]",
     "codeReferences": [/* files modified in this task */]
   }
   ```
4. Continue to next todo, or proceed to Phase 3 if all todos complete

**NEEDS_REVISION** (validation failures):
1. Update todo with failure context:
   ```xml
   <invoke name="TodoWrite">
   <parameter name="todos">
   [
     {"content": "Original task [ATTEMPT 2 - Root cause: [summary]]", "status": "in_progress", "activeForm": "Retrying task"}
   ]
   </parameter>
   </invoke>
   ```
2. Revert to checkpoint if needed:
   ```bash
   cd "$WORKTREE_PATH"
   git reset --hard $TASK_CHECKPOINT
   git clean -fd
   ```
3. Re-delegate with enhanced context (max 3 attempts)
4. After 3 attempts, mark as blocked and continue to next todo

**BLOCKED** (external dependency issue):
1. Document blocking reason
2. Continue to next todo if others exist
3. If all remaining todos blocked, proceed to Phase 5

## Phase 3: Refactor Implementation

After all implementation todos complete (or are blocked), perform plan-aware refactoring.

### Step 3.1: Pre-Refactoring Checkpoint

```bash
cd "$WORKTREE_PATH"
git add -A
git commit -m "checkpoint: before refactoring

Issue: [ISSUE_ID]
State: Implementation complete, proceeding to cleanup"
REFACTOR_CHECKPOINT=$(git rev-parse HEAD)
```

Post checkpoint to issue:
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "Checkpoint: before refactoring\n\nImplementation complete, proceeding to cleanup.",
  "author": "agent",
  "commitSha": "[REFACTOR_CHECKPOINT]"
}
```

### Step 3.2: Delegate to Refactor Agent

```xml
<invoke name="Task">
<parameter name="description">Refactor implementation</parameter>
<parameter name="subagent_type">claude-code-cli:refactor</parameter>
<parameter name="prompt">
Issue: [ISSUE_ID] - [TITLE]
Description: [DESCRIPTION]
Worktree: [WORKTREE_PATH]

Perform plan-aware refactoring on recently implemented code.

## Refactoring Focus Areas

1. **Eliminate Dead Code**: Remove unused variables, functions, parameters
2. **Simplify Logic**: Reduce complexity through guard clauses, smaller functions
3. **Remove Over-Engineering (YAGNI)**: Collapse unnecessary abstractions
4. **Improve Naming**: Align names with intent from plan
5. **Harmonize Patterns**: Ensure new code follows existing codebase conventions
6. **Refine Tests**: Remove redundant tests, focus on behavior

## Constraints

- Preserve all observable behavior
- Maintain test coverage
- Stay within plan scope
- Validate after each significant change
</parameter>
</invoke>
```

### Step 3.3: Process Refactoring Result

**COMPLETED** (refactoring successful):
```bash
cd "$WORKTREE_PATH"
git add -A
git commit -m "refactor: [ISSUE_ID] code cleanup

[Summary from refactor report]"
REFACTOR_SHA=$(git rev-parse HEAD)
```

Post refactoring commit to issue:
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "Refactoring complete\n\n[Summary from refactor report]",
  "author": "agent",
  "commitSha": "[REFACTOR_SHA]",
  "codeReferences": [/* files modified during refactoring */]
}
```

Proceed to Phase 4.

**NEEDS_REVIEW** (some opportunities require human judgment):
- Note recommendations
- Proceed to Phase 4

**BLOCKED** (cannot refactor safely):
- Document blocking reasons
- Skip refactoring, proceed to Phase 4

## Phase 4: Evaluate Quality

### Step 4.1: Pre-Evaluation Checkpoint

```bash
cd "$WORKTREE_PATH"
git add -A
git commit --allow-empty -m "checkpoint: before evaluation

Issue: [ISSUE_ID]
State: Implementation and refactoring complete"
EVAL_CHECKPOINT=$(git rev-parse HEAD)
```

Post checkpoint to issue:
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "Checkpoint: before evaluation\n\nImplementation and refactoring complete.",
  "author": "agent",
  "commitSha": "[EVAL_CHECKPOINT]"
}
```

### Step 4.2: Delegate to Evaluator Agent

```xml
<invoke name="Task">
<parameter name="description">Evaluate implementation</parameter>
<parameter name="subagent_type">claude-code-cli:implementation-evaluator</parameter>
<parameter name="prompt">
Issue: [ISSUE_ID] - [TITLE]
Description: [DESCRIPTION]
Worktree: [WORKTREE_PATH]

Evaluate the implementation for production readiness.
</parameter>
</invoke>
```

### Step 4.3: Process Evaluation Result

**PRODUCTION_READY** (all requirements met):
- Proceed to Phase 5

**CONTINUE** (fixable issues):
1. Create todos for issues found
2. Return to Phase 2 (Step 2.2) to address issues
3. After fixes, re-run evaluation

**BLOCKED** (system-level failure):
1. Document blocking issues
2. Post status comment
3. Set status to `needs_review`
4. HALT execution

## Phase 5: Integrate and Finalize

### Step 5.1: Return to Main Workspace

```bash
cd "$(git rev-parse --show-toplevel)"
git status --porcelain
```

If uncommitted files exist, handle them:
- **Known artifacts** (e.g., `.compare-branch/claude-launcher-*.mjs`): Delete them
- **Legitimate uncommitted work**: Stash and restore after merge
- **Potential conflicts**: Resolve before proceeding

### Step 5.2: Merge Worktree Branch

```bash
git merge --no-ff "$BRANCH_NAME" -m "Merge branch '$BRANCH_NAME'

Issue: [ISSUE_ID]
Title: [TITLE]"
MERGE_SHA=$(git rev-parse HEAD)
```

Post merge commit to issue:
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "Merged branch '$BRANCH_NAME' to main",
  "author": "agent",
  "commitSha": "[MERGE_SHA]"
}
```

**If merge conflict occurs:**
1. Abort merge: `git merge --abort`
2. Attempt resolution in worktree via rebase
3. If unresolvable, post error comment and set status to `needs_review`

### Step 5.3: Clean Up Worktree

```bash
remove-instant-worktree "$BRANCH_NAME"
```

### Step 5.4: Post Completion Comment

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Implementation Complete\n\n[Summary of changes]\n\n### Quality Assessment\n[Key findings from evaluator]\n\n### Files Modified\n- [list of files]\n\n### Testing\n- All tests passing\n- Type checking: zero errors\n- Linting: no violations\n\nReady for review.",
  "author": "agent",
  "commitSha": "[MERGE_SHA]",
  "codeReferences": [/* all modified files with line ranges */]
}
```

### Step 5.5: Update Status

**IMPORTANT:** Always set status to `needs_review`, NOT `done`. Only the user marks issues as done.

```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review",
  "commitSha": "[MERGE_SHA]"
}
```

</instructions>
