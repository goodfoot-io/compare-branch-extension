---
name: issue-implementation-with-plan
description: Implement approved plans using specialized agents in an isolated worktree.
---

<placeholder-variables>
[BRANCH_NAME] — `issue-[ISSUE_ID]-[slugified-title]` (`:` and `/` replaced with `-`)
</placeholder-variables>

<orchestrator-constraints>
The orchestrator coordinates—it does NOT implement code.

| Orchestrator handles directly | Agents handle via delegation |
|------------------------------|------------------------------|
| Syntax errors visible in output | Feature implementation |
| Import corrections (e.g., missing .js) | Business logic changes |
| Config file typos | Complex debugging |
| Test setup/polyfills | Multi-file refactoring |
| | Investigation tasks |
| | Library integrations |
| | API changes |

Plan says "implement" → delegate to `claude-code-cli:implementer`.
Use only TodoWrite and Task tools for coordination. Never use Read/Write/Edit/MultiEdit for implementation.
</orchestrator-constraints>

<test-policy>
Every test failure is a production failure. No exceptions.

| Excuse | Reality |
|--------|---------|
| "Only the new test fails" | New test proves new code is broken |
| "WebSocket/connection issue" | Production has same issue |
| "Tests timeout" | Code has cleanup/leak problems |
| "Unrelated tests fail" | Your changes broke something |
| "Works locally" | Must work in CI too |
| "Flaky test" | Race condition that crashes production |
| "Pre-existing issue" | Must be fixed |

**Acceptable state:** ALL tests pass, ZERO errors.
</test-policy>

<tools>

**instant-worktree** — Creates git worktree with symlinked dependencies (~2 seconds).

```bash
instant-worktree "[BRANCH_NAME]"
```

Creates worktree at `.worktrees/[BRANCH_NAME]`. Creates a new branch if it doesn't exist, or attaches to an existing branch. Fails if worktree path is already occupied.

</tools>

<instructions>

## 1. Prepare Environment

Determine path using the first matching condition:

| Condition | Action |
|-----------|--------|
| [IS_RESUMABLE] AND worktree exists | **Resume**: Navigate to existing worktree |
| [IS_RESUMABLE] AND branch exists (no worktree) | **Recreate**: Attach worktree to branch |
| Otherwise | **New**: Create checkpoint and worktree |

### Resume

```bash
cd ".worktrees/[BRANCH_NAME]"
git stash --include-untracked
```

Continue to Step 2. Restore stash after todo initialization.

### Recreate

```bash
instant-worktree "[BRANCH_NAME]"
cd ".worktrees/[BRANCH_NAME]"
```

Continue to Step 2.

### New

1. Record start:
   ```bash
   git rev-parse HEAD  # CURRENT_SHA
   ```
   ```
   PATCH /issues/[ISSUE_ID]
   {
     "commitSha": "[CURRENT_SHA]"
   }
   ```

2. Create checkpoint on base branch:
   ```bash
   git commit --allow-empty -m "checkpoint: [ISSUE_ID] before implementation

   Issue: [ISSUE_ID]
   Title: [TITLE]"
   ```
   ```
   POST /issues/[ISSUE_ID]/comments
   {
     "body": "Checkpoint: before implementation",
     "author": "agent",
     "commitSha": "[CHECKPOINT_SHA]"
   }
   ```

3. Create worktree:
   ```bash
   instant-worktree "[BRANCH_NAME]"
   cd ".worktrees/[BRANCH_NAME]"
   ```

On worktree creation failure: post error to issue, set status `blocked`, HALT.

---

## 2. Execute Implementation

### 2.1 Validate and Initialize

If [PLAN_CONTENT] is empty: post error comment, set status `blocked`, HALT.

Create todos from [PLAN_CONTENT] using TodoWrite. Initialize `[EVALUATION_CYCLE] = 0`.

If resuming: `git stash pop` to restore prior work.

### 2.2 Task Checkpoint

Before each agent delegation:

```bash
git add -A
git commit --allow-empty -m "checkpoint: before [TASK_DESCRIPTION]

Issue: [ISSUE_ID]
Progress: [COMPLETED] of [TOTAL] tasks complete"
```

Post checkpoint to issue.

### 2.3 Assess Coherence

| Issue Type | Characteristics | Delegation Strategy |
|------------|-----------------|---------------------|
| Coherent | Effort compounds across todos | Single agent for all todos |
| Fragmented | Effort is isolated per todo | One agent per independent group |

Test: Would a fresh agent be equally effective? If yes → Fragmented.

### 2.4 Delegate Implementation

```xml
<invoke name="Task">
<parameter name="description">[Implement TITLE (all todos) | Current todo]</parameter>
<parameter name="subagent_type">claude-code-cli:implementer</parameter>
<parameter name="prompt">
Issue: [ISSUE_ID] - [TITLE]
Worktree: [WORKTREE_PATH]
Checkpoint SHA: [TASK_CHECKPOINT]

## Setup
1. Read issue via `GET /issues/[ISSUE_ID]`
2. Extract `planContent` for implementation details
3. Extract `description` for requirements context

[Coherent: Complete all todos in sequence, committing after each logical unit.]
[Fragmented: Complete todos: [independent group todo descriptions]]
</parameter>
</invoke>
```

### 2.5 Process Result

| Status | Action |
|--------|--------|
| COMPLETED | Mark todo completed. Commit if changes exist. Post to issue. Continue. |
| NEEDS_REVISION | Update todo with attempt count. Revert to checkpoint. Re-delegate (max 3). After 3: mark blocked. |
| BLOCKED | Document in issue. Mark todo blocked. Continue. |

**After all todos:**
- ALL blocked → post summary, set status `blocked`, HALT
- SOME blocked → note in summary, proceed to Step 3
- NONE blocked → proceed to Step 3

---

## 3. Refactor

### 3.1 Pre-Refactoring Checkpoint

```bash
git add -A
git commit --allow-empty -m "checkpoint: before refactoring

Issue: [ISSUE_ID]
State: Implementation complete"
```

Post checkpoint to issue.

### 3.2 Delegate Refactoring

```xml
<invoke name="Task">
<parameter name="description">Refactor implementation</parameter>
<parameter name="subagent_type">claude-code-cli:refactor</parameter>
<parameter name="prompt">
Issue: [ISSUE_ID] - [TITLE]
Description: [DESCRIPTION]
Worktree: [WORKTREE_PATH]

## Focus Areas
1. Eliminate dead code
2. Simplify logic (guard clauses, smaller functions)
3. Remove over-engineering (YAGNI)
4. Improve naming (align with plan intent)
5. Harmonize patterns (match codebase conventions)
6. Refine tests (remove redundant, focus on behavior)

## Constraints
- Preserve observable behavior
- Maintain test coverage
- Stay within plan scope
- Validate after each change
</parameter>
</invoke>
```

### 3.3 Process Result

| Status | Action |
|--------|--------|
| COMPLETED | Commit with `refactor:` prefix, post to issue, proceed to Step 4 |
| NEEDS_REVIEW | Log recommendations, proceed to Step 4 |
| BLOCKED | Document reasons, proceed to Step 4 |

---

## 4. Evaluate Quality

### 4.1 Pre-Evaluation Checkpoint

```bash
git add -A
git commit --allow-empty -m "checkpoint: before evaluation

Issue: [ISSUE_ID]
State: Implementation and refactoring complete"
```

Post checkpoint to issue.

### 4.2 Delegate Evaluation

```xml
<invoke name="Task">
<parameter name="description">Evaluate implementation</parameter>
<parameter name="subagent_type">claude-code-cli:implementation-evaluator</parameter>
<parameter name="prompt">
Issue: [ISSUE_ID] - [TITLE]
Description: [DESCRIPTION]
Worktree: [WORKTREE_PATH]

Evaluate for production readiness.
</parameter>
</invoke>
```

### 4.3 Process Result

| Status | Action |
|--------|--------|
| PRODUCTION_READY | Post completion comment, proceed to Step 5 |
| CONTINUE | Increment [EVALUATION_CYCLE]. If ≥2: set `needs_review`, HALT. Else: create todos (prefix "[Eval fix]"), return to 2.2. |
| BLOCKED | Document issues, set `needs_review`, HALT |

---

## 5. Finalize

### If [REVIEW_REQUIRED]:

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Implementation Ready for Review\n\n[Summary]\n\n### Files Modified\n- [files]\n\n### Testing\n- All tests passing\n- Type checking: zero errors\n- Linting: no violations\n\nAwaiting approval.",
  "author": "agent",
  "commitSha": "[HEAD_SHA]",
  "codeReferences": [
    {
      "path": "[file]",
      "startLine": [n],
      "endLine": [n]
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

Stop here. Merge occurs via `issue-merge-approved` skill after user approval.

### If NOT [REVIEW_REQUIRED]:

```xml
<invoke name="Skill">
  <parameter name="skill">claude-code-cli:issue-merge-approved</parameter>
</invoke>
```

</instructions>
