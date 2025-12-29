---
name: issue-implementation-with-plan
description: Implement approved plans in isolated worktree.
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

<validation-gate>
**Gate requirement:** ALL validation commands must pass. No exceptions, no workarounds, no rationalizations.

| Rationalization | Why it's wrong |
|-----------------|----------------|
| "Pre-existing issue" | You must fix it or block |
| "Unrelated to my changes" | Prove it by fixing it, or block |
| "Infrastructure failure" | Infrastructure IS the product |
| "Only linting/types pass" | Tests are required, not optional |
| "Change is purely cosmetic" | Cosmetic changes can still break tests |
| "Tests are flaky" | Flaky = race condition = production bug |
| "Works in other environments" | Must work HERE |
| "Only the new test fails" | New test proves new code is broken |
| "WebSocket/connection issue" | Production has same issue |
| "Tests timeout" | Code has cleanup/leak problems |

**Validation is binary:**
- ✅ ALL pass → proceed
- ❌ ANY fail → block and report

There is no "probably fine" state. If you cannot make validation pass, you MUST block.

**When validation fails:**
- If the error is in code you can modify, fix it and re-run
- If the error is in infrastructure or code outside your scope, block immediately — do not retry hoping it resolves itself

**When blocked:**
1. Post error comment with exact failure output
2. Add `blocked` tag
3. **STOP** — Do not proceed under any circumstances
</validation-gate>

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
- **Worktree exists**: Resume — Navigate to existing worktree
- **Branch exists (no worktree)**: Recreate — Attach worktree to branch
- **Otherwise**: New — Create worktree

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

1. Create worktree:
   ```bash
   WORKTREE_JSON=$(instant-worktree "[BRANCH_NAME]")
   WORKTREE_DIR=$(echo "$WORKTREE_JSON" | jq -r '.worktree')
   BASE_SHA=$(echo "$WORKTREE_JSON" | jq -r '.baseSha')
   cd "$WORKTREE_DIR"
   ```

   On worktree creation failure: post error to issue, add `blocked` tag, **STOP**.

2. Launch background Explore subagents (haiku model) while performing status updates. Launch multiple subagents with distinct, targeted prompts based on plan content:

   ```xml
   <invoke name="Task">
   <parameter name="description">explore-[target-a]</parameter>
   <parameter name="subagent_type">Explore</parameter>
   <parameter name="model">haiku</parameter>
   <parameter name="run_in_background">true</parameter>
   <parameter name="prompt">[Distinct exploration task derived from plan]</parameter>
   </invoke>
   <invoke name="Task">
   <parameter name="description">explore-[target-b]</parameter>
   <parameter name="subagent_type">Explore</parameter>
   <parameter name="model">haiku</parameter>
   <parameter name="run_in_background">true</parameter>
   <parameter name="prompt">[Distinct exploration task derived from plan]</parameter>
   </invoke>
   ```

   Make sure to kill any Explore subagents that have not returned before moving to the next step.

3. Post a brief comment indicating you're beginning implementation. Reference the main deliverable or objective from the approved plan to confirm you're working on the right thing.
   ```
   POST /issues/[ISSUE_ID]/comments
   {
     "body": "[comment content]",
     "author": "agent",
     "commitSha": "${BASE_SHA}"
   }
   ```

---

## 2. Execute Implementation

### 2.1 Validate and Initialize

If [PLAN_CONTENT] is empty: post error comment, add `blocked` tag, **STOP**.

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

### 2.3 Assess Coherence

Collect background exploration results via TaskOutput. Launch additional Explore subagents if new information reveals unexplored areas.

Analyze tasks along three dimensions:

| Dimension | Question |
|-----------|----------|
| **Dependency** | Do files import/reference each other? |
| **Uniformity** | Same operation across files, or varied operations? |
| **Size** | Substantial tasks with clear completion gates? |

**Route**:
- Independent files OR uniform tasks → **Parallel** (concurrent agents)
- Dependent + varied + small → **Coherent** (single agent)
- Dependent + varied + substantial with clear gates → **Sequential** (ordered agents, checkpoint between)

When uncertain between Coherent and Sequential, choose **Sequential**.
Checkpoints have low cost; missed validation opportunities have high cost.

Clear gates: type-check passes, tests pass, API functional, UI renders.

### 2.4 Delegate Implementation

Based on coherence assessment:

**Parallel**: Launch concurrent agents for independent groups:
```xml
<invoke name="Task">
<parameter name="description">Implement [GROUP_A_SUMMARY]</parameter>
<parameter name="subagent_type">claude-code-cli:implementer</parameter>
<parameter name="prompt">...</parameter>
<parameter name="run_in_background">true</parameter>
</invoke>
<invoke name="Task">
<parameter name="description">Implement [GROUP_B_SUMMARY]</parameter>
<parameter name="subagent_type">claude-code-cli:implementer</parameter>
<parameter name="prompt">...</parameter>
</invoke>
```

**Sequential**: Delegate to agent, checkpoint at gate, then delegate next phase.

**Coherent**: Single agent for all todos.

Agent prompt template:
```xml
<invoke name="Task">
<parameter name="description">[Implement TITLE (all todos) | Current phase/group]</parameter>
<parameter name="subagent_type">claude-code-cli:implementer</parameter>
<parameter name="prompt">
Issue: [ISSUE_ID] - [TITLE]
Worktree: [WORKTREE_PATH]
Checkpoint SHA: [TASK_CHECKPOINT]

## Setup
1. Read issue via `GET /issues/[ISSUE_ID]`
2. Extract `planContent` for implementation details
3. Extract `description` for requirements context

## Scope
[Coherent: Complete all todos in sequence, committing after each logical unit.]
[Sequential: Complete phase [N] todos: [phase todo descriptions]. Stop at gate: [GATE_CONDITION].]
[Parallel: Complete todos: [independent group todo descriptions]]
</parameter>
</invoke>
```

### 2.5 Process Result

Based on agent status:
- **COMPLETED**: Mark todo completed, commit if changes exist, post to issue, continue
- **NEEDS_REVISION**: Update todo with attempt count, revert to checkpoint
  - **If attempts < 3**: Re-delegate to agent
  - **If attempts ≥ 3**: Mark todo blocked
- **BLOCKED**: Document in issue, mark todo blocked, continue

**COMPLETED:** Post a brief progress update indicating which task you completed and what you actually did. Keep it concise.
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
  "author": "agent"
}
```

**After all todos:**
- ALL blocked → post summary, add `blocked` tag, **STOP**
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

Based on agent status:
- **COMPLETED**: Commit with `refactor:` prefix, post to issue, proceed to Step 4
- **HAS_RECOMMENDATIONS**: Log recommendations, proceed to Step 4
- **BLOCKED**: Document reasons, proceed to Step 4

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

Based on evaluation result:
- **PRODUCTION_READY**: Post completion comment, proceed to Step 5
- **CONTINUE**: Increment [EVALUATION_CYCLE]
  - **If cycle ≥ 2**: Set `needs_review`, **STOP**
  - **If cycle < 2**: Create todos with "[Eval fix]" prefix, return to Step 2.2
- **BLOCKED**: Document issues, add `blocked` tag, **STOP**

---

## 5. Finalize

### If NOT [REVIEW_REQUIRED]:

```xml
<invoke name="Skill">
  <parameter name="skill">claude-code-cli:issue-merge</parameter>
</invoke>
```

### If [REVIEW_REQUIRED]:

Post a summary explaining what you implemented and how it aligns with the approved plan. List the key files modified and confirm all validation passed. Indicate you're awaiting approval.
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
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

Stop here. Merge occurs via `issue-merge` skill after user approval.

</instructions>
