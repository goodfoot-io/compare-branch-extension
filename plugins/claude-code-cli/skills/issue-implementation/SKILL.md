---
name: issue-implementation
description: Implement issues in isolated git worktree.
---

<placeholder-variables>
[BRANCH_NAME] — `issue-[ISSUE_ID]-[slugified-title]` (`:` and `/` replaced with `-`)
</placeholder-variables>

<orchestrator-constraints>
The orchestrator prepares, plans, and coordinates—it does NOT implement code.

| Orchestrator handles directly | Implementer handles via delegation |
|-------------------------------|-----------------------------------|
| Worktree creation/navigation | Feature implementation |
| Issue clarification | Code changes |
| Codebase exploration | Test writing |
| Task derivation | Validation execution |
| Result processing | Bug fixes |

Use TodoWrite and Task tools for coordination. Never use Read/Write/Edit/MultiEdit for implementation work.

**Never update issue status. Never include commitSha in comments after commits** — hooks handle commit tracking automatically.
</orchestrator-constraints>



<tools>

**create-worktree** — Creates git worktree with automatic commitSha posting via hooks.

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/create-worktree.sh" "[BRANCH_NAME]"
```

Creates worktree at `.worktrees/[BRANCH_NAME]`. Creates a new branch if it doesn't exist, or attaches to an existing branch. Fails if worktree path is already occupied.

Git hooks automatically post `commitSha` after each commit. Squashed commits are cleaned up automatically.

</tools>

<instructions>

## 1. Prepare Environment

Determine environment path using the first matching condition:
- **Worktree exists**: Resume — Navigate to existing worktree
- **Branch exists (no worktree)**: Recreate — Attach worktree to branch
- **Otherwise**: New — Create worktree

### Resume (worktree exists)

```bash
cd ".worktrees/[BRANCH_NAME]"
git stash --include-untracked  # Save uncommitted work; restore after task derivation
```

If "Implementation Complete" comment exists on the issue, skip to **4. Finalize**. Otherwise continue to **2. Derive Tasks**.

### Recreate (branch exists, no worktree)

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/create-worktree.sh" "[BRANCH_NAME]"
cd ".worktrees/[BRANCH_NAME]"
```

If "Implementation Complete" comment exists on the issue, skip to **4. Finalize**. Otherwise continue to **2. Derive Tasks**.

### New (fresh start)

1. Create worktree:
   ```bash
   WORKTREE_JSON=$("${CLAUDE_PLUGIN_ROOT}/bin/create-worktree.sh" "[BRANCH_NAME]")
   WORKTREE_DIR=$(echo "$WORKTREE_JSON" | jq -r '.worktree')
   BASE_SHA=$(echo "$WORKTREE_JSON" | jq -r '.baseSha')
   cd "$WORKTREE_DIR"
   ```

   On worktree creation failure: post error to issue, add `blocked` tag, **STOP**.

2. Launch background Explore subagents (haiku model). Launch multiple subagents with distinct, targeted prompts based on the issue content:

   ```xml
   <invoke name="Task">
   <parameter name="description">explore-[target-a]</parameter>
   <parameter name="subagent_type">Explore</parameter>
   <parameter name="model">haiku</parameter>
   <parameter name="run_in_background">true</parameter>
   <parameter name="prompt">[Distinct exploration task derived from issue]</parameter>
   </invoke>
   <invoke name="Task">
   <parameter name="description">explore-[target-b]</parameter>
   <parameter name="subagent_type">Explore</parameter>
   <parameter name="model">haiku</parameter>
   <parameter name="run_in_background">true</parameter>
   <parameter name="prompt">[Distinct exploration task derived from issue]</parameter>
   </invoke>
   ```

3. Clarify issue:

   Evaluate whether the title and description are clear enough to begin work. A good title completes the sentence: *"To finish this ticket, I need to [TITLE]"*

   **Clarify title when:**
   - Title is truncated, incomplete, or doesn't start with an action verb
   - Title describes symptom rather than the work (e.g., "Page is slow" → "Optimize database queries")
   - Title references wrong component, file, or feature

   **Clarify description when:**
   - Description contains factual errors (wrong paths, incorrect component names)
   - Description lacks context needed to begin work

   **Leave unchanged when:** Only minor phrasing or style preferences would change.

   **Clarification principles:**
   - Preserve all user-provided details, requirements, and constraints
   - Maintain user intent — the clarified version must request the same outcome
   - Correct factual errors in the main text; append a footnote: `*Corrections: Changed X to Y (reason)*`

   **Enrich descriptions** with context discovered during exploration:
   - Relevant file paths and component names
   - Technical constraints or dependencies
   - Acceptance criteria (if inferable from user intent)
   - Brief background on why this change matters

   Do not expand scope beyond user intent.

   If changes are needed:
   ```
   PATCH /issues/[ISSUE_ID]
   {
     "title": "[CLARIFIED_TITLE]",
     "description": "[CLARIFIED_DESCRIPTION]"
   }
   ```

   Omit fields that don't need changes. Skip this PATCH entirely if no clarification is needed.

   Make sure to kill any Explore subagents that have not returned before moving to the next step.

---

## 2. Derive Tasks

Collect background exploration results via TaskOutput. Launch additional Explore subagents if new information reveals unexplored areas.

### 2.1 Analyze Requirements

From the issue description and exploration results, identify:
- What files need modification?
- What new files are needed?
- What behavior changes are required?
- What tests need to be written?

### 2.2 Create Implementation Tasks

Write concrete, actionable tasks to TodoWrite. Each task should specify:
- **What** to create or modify
- **Where** (file paths discovered during exploration)
- **Why** (which requirement it satisfies)

<example>
Example task derivation for "Add rate limiting to /api/submit endpoint":

```
1. Create rate limiter utility (src/utils/rate-limiter.ts)
   - Implement token bucket algorithm
   - Export createRateLimiter(options) factory

2. Add rate limit middleware (src/middleware/rate-limit.ts)
   - Wrap utility for Express middleware signature
   - Return 429 with Retry-After header when limited

3. Integrate into submit route (src/routes/api/submit.ts:45)
   - Apply middleware before existing handler
   - Use config values for rate limits

4. Write tests
   - Unit tests for token bucket logic (src/utils/rate-limiter.test.ts)
   - Integration test for 429 response (src/routes/api/submit.test.ts)
```
</example>

### 2.3 Assess Coherence

Analyze tasks along three dimensions:

| Dimension | Question |
|-----------|----------|
| **Dependency** | Do files import/reference each other? |
| **Uniformity** | Same operation across files, or varied operations? |
| **Size** | Substantial tasks with clear completion gates? |

Route based on assessment:
- **Independent files OR uniform tasks**: Parallel — concurrent agent delegations
- **Dependent + varied + small**: Coherent — single agent for all tasks
- **Dependent + varied + substantial with clear gates**: Sequential — ordered delegations with checkpoints

When uncertain between Coherent and Sequential, choose **Coherent** for planless issues.

### 2.4 Checkpoint Before Implementation

```bash
git add -A
git commit --allow-empty -m "checkpoint: before implementation

Issue: [ISSUE_ID]
Tasks: [TASK_COUNT] derived from issue"
```

If resuming: `git stash pop` to restore prior work.

---

## 3. Delegate Implementation

### 3.1 Delegate to Implementer

Pass the **orchestrator-defined tasks** to the implementer agent.

Choose the [MODEL] to use with the `claude-code-cli:implementer` subagent based on the tasks:
- **Ambiguous requirements, multiple possible approaches, or tasks where you're unsure how to start:** `opus`
- **Clear goal with multiple steps, building features, or fixing bugs in unfamiliar code:** `sonnet`
- **Single-step tasks, following established patterns, or making changes you already understand:** `haiku`

**Coherent** (single delegation for all tasks):

```xml
<invoke name="Task">
<parameter name="description">Implement [TITLE]</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="subagent_type">claude-code-cli:implementer</parameter>
<parameter name="prompt">
Issue: [ISSUE_ID] - [TITLE]
Worktree: [WORKTREE_PATH]
Checkpoint SHA: [CHECKPOINT_SHA]

## Description
[ISSUE_DESCRIPTION]

## Tasks to Complete

1. **[Task 1 name]** (`[file-path]`)
   - [Specific change 1]
   - [Specific change 2]

2. **[Task 2 name]** (`[file-path]`)
   - [Specific change 1]
   - [Specific change 2]

[Continue for all derived tasks]

## Validation
- Type check: `yarn typecheck`
- Test: `yarn test [relevant-test-files]`
- Lint: `yarn lint`
</parameter>
</invoke>
```

**Parallel** (concurrent delegations for independent groups):

```xml
<invoke name="Task">
<parameter name="description">Implement [GROUP_A_SUMMARY]</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="subagent_type">claude-code-cli:implementer</parameter>
<parameter name="prompt">
Issue: [ISSUE_ID] - [TITLE]
Worktree: [WORKTREE_PATH]

## Tasks to Complete
[Group A tasks only]

## Validation
[Commands for group A]
</parameter>
<parameter name="run_in_background">true</parameter>
</invoke>
<invoke name="Task">
<parameter name="description">Implement [GROUP_B_SUMMARY]</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="subagent_type">claude-code-cli:implementer</parameter>
<parameter name="prompt">
Issue: [ISSUE_ID] - [TITLE]
Worktree: [WORKTREE_PATH]

## Tasks to Complete
[Group B tasks only]

## Validation
[Commands for group B]
</parameter>
</invoke>
```

**Sequential** (ordered delegations with checkpoints):

Delegate first phase, checkpoint at gate, then delegate next phase.

### 3.2 Process Result

Based on implementer status:
- **COMPLETED**: Mark todos completed, post summary comment, proceed to **4. Finalize**
- **NEEDS_REVISION**: Update todo with attempt count, revert to checkpoint
  - **If attempts < 3**: Re-delegate with additional context from failure report
  - **If attempts ≥ 3**: Post failure details, add `blocked` tag, **STOP**
- **BLOCKED**: Post blocking details from implementer report, add `blocked` tag, **STOP**

**On COMPLETED:** Post a progress comment summarizing what was implemented:
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[Summary of implementation: what was built, key decisions made]",
  "author": "agent",
  "codeReferences": [
    {
      "uri": "[file]",
      "range": {"startLine": [n], "endLine": [n]}
    }
  ]
}
```

### 3.3 Validation Gate

**Requirement:** ALL validation commands must pass before proceeding. This usually means linting, type checking, and testing.

**On any failure:**
1. Error in code you can modify → delegate fix to implementer, re-run validation
2. Error outside your scope → block immediately

**When blocked:** Post exact failure output to issue, add `blocked` tag, **STOP**.

Only proceed to **4. Finalize** when ALL validations pass.

---

## 4. Finalize

### If [REVIEW_REQUIRED]:

Post a summary explaining what you implemented and key decisions made. List the main files modified and confirm all validation passed. Indicate you're waiting for approval before merge.
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[Summary with validation results and files modified]",
  "author": "agent",
  "codeReferences": [
    {
      "uri": "[file]",
      "range": {"startLine": [n], "endLine": [n]}
    }
  ]
}
```

**STOP** — Merge occurs via `issue-merge` skill after user approval.

### If NOT [REVIEW_REQUIRED]:

```xml
<invoke name="Skill">
  <parameter name="skill">claude-code-cli:issue-merge</parameter>
</invoke>
```

</instructions>
