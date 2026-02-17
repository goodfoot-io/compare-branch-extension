---
name: implementation
description: Implement cards in isolated git worktree.
model: inherit
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Task", "TaskOutput", "TaskStop", "TaskGet", "TaskList"]
skills: runtime:card-repo
---

```!
cat $CLAUDE_PLUGIN_ROOT/lib/default-agent.md
```

<placeholder-variables>
[CARD_ID] -- The card's unique identifier from `id` field in CARD.meta.json
[TITLE] -- The card title from CARD.meta.json
[CARD_DESCRIPTION] -- The card description text from CARD.md
[BRANCH_NAME] -- `card-[CARD_ID]-[slugified-title]` (`:` and `/` replaced with `-`)
[WORKTREE_PATH] -- `.worktrees/[BRANCH_NAME]`
[CHECKPOINT_SHA] -- Commit SHA recorded at the pre-implementation checkpoint
[TASK_COUNT] -- Number of implementation tasks derived from the card
[MODEL] -- LLM model selection for subagent delegation (opus, sonnet, or haiku)
</placeholder-variables>

<orchestrator-constraints>
The orchestrator prepares, plans, and coordinates -- it does NOT implement code.

| Orchestrator handles directly | Implementer handles via delegation |
|-------------------------------|-----------------------------------|
| Worktree creation/navigation | Feature implementation |
| Card clarification | Code changes |
| Codebase exploration | Test writing |
| Task derivation | Validation execution |
| Result processing | Bug fixes |

Use TodoWrite and Task tools for coordination. Never use Read/Write/Edit/MultiEdit for implementation work.

**Never update card status directly. Never include commitSha in comments after commits** -- hooks handle commit tracking automatically.
</orchestrator-constraints>

<tools>

**create-worktree** -- Creates git worktree with automatic commit tracking via hooks.

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/create-worktree.sh" "[BRANCH_NAME]"
```

Creates worktree at `.worktrees/[BRANCH_NAME]`. Creates a new branch if it does not exist, or attaches to an existing branch. Fails if worktree path is already occupied.

Git hooks automatically track commits. Squashed commits are cleaned up automatically.

</tools>

<instructions>

## 1. Prepare Environment

Determine environment path using the first matching condition:
- **Worktree exists**: Resume -- Navigate to existing worktree
- **Branch exists (no worktree)**: Recreate -- Attach worktree to branch
- **Otherwise**: New -- Create worktree

### Resume (worktree exists)

```bash
cd ".worktrees/[BRANCH_NAME]"
git stash --include-untracked  # Save uncommitted work; restore after task derivation
```

If an "Implementation Complete" comment exists on the card, skip to **4. Finalize**. Otherwise continue to **2. Derive Tasks**.

### Recreate (branch exists, no worktree)

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/create-worktree.sh" "[BRANCH_NAME]"
cd ".worktrees/[BRANCH_NAME]"
```

If an "Implementation Complete" comment exists on the card, skip to **4. Finalize**. Otherwise continue to **2. Derive Tasks**.

### New (fresh start)

1. Create worktree:
   ```bash
   WORKTREE_JSON=$("${CLAUDE_PLUGIN_ROOT}/bin/create-worktree.sh" "[BRANCH_NAME]")
   WORKTREE_DIR=$(echo "$WORKTREE_JSON" | jq -r '.worktree')
   BASE_SHA=$(echo "$WORKTREE_JSON" | jq -r '.baseSha')
   cd "$WORKTREE_DIR"
   ```

   On worktree creation failure: write an error comment to the card, add `blocked` tag to `CARD.meta.json`, commit, and **STOP**.

2. Launch background Explore subagents (haiku model). Launch multiple subagents with distinct, targeted prompts based on the card content:

   ```xml
   <invoke name="Task">
   <parameter name="description">explore-[target-a]</parameter>
   <parameter name="subagent_type">Explore</parameter>
   <parameter name="model">haiku</parameter>
   <parameter name="run_in_background">true</parameter>
   <parameter name="prompt">[Distinct exploration task derived from card]</parameter>
   </invoke>
   <invoke name="Task">
   <parameter name="description">explore-[target-b]</parameter>
   <parameter name="subagent_type">Explore</parameter>
   <parameter name="model">haiku</parameter>
   <parameter name="run_in_background">true</parameter>
   <parameter name="prompt">[Distinct exploration task derived from card]</parameter>
   </invoke>
   ```

3. Clarify card:

   Evaluate whether the title and description are clear enough to begin work. A good title completes the sentence: *"To finish this card, I need to [TITLE]"*

   **Clarify title when:**
   - Title is truncated, incomplete, or does not start with an action verb
   - Title describes symptom rather than the work (e.g., "Page is slow" -> "Optimize database queries")
   - Title references wrong component, file, or feature

   **Clarify description when:**
   - Description contains factual errors (wrong paths, incorrect component names)
   - Description lacks context needed to begin work

   **Leave unchanged when:** Only minor phrasing or style preferences would change.

   **Clarification principles:**
   - Preserve all user-provided details, requirements, and constraints
   - Maintain user intent -- the clarified version must request the same outcome
   - Correct factual errors in the main text; append a footnote: `*Corrections: Changed X to Y (reason)*`

   **Enrich descriptions** with context discovered during exploration:
   - Relevant file paths and component names
   - Technical constraints or dependencies
   - Acceptance criteria (if inferable from user intent)
   - Brief background on why this change matters

   Do not expand scope beyond user intent.

   If changes are needed, update `CARD.meta.json` (for title) and/or `CARD.md` (for description) in the card repository. Commit to the card repository:

   ```bash
   git add CARD.meta.json CARD.md
   git commit -m "[what was clarified, what was enriched from exploration, and any corrections made]"
   ```

   Skip the commit entirely if no clarification is needed.

   Make sure to kill any Explore subagents that have not returned before moving to the next step.

---

## 2. Derive Tasks

Collect background exploration results via TaskOutput. Launch additional Explore subagents if new information reveals unexplored areas.

### 2.1 Analyze Requirements

From the card description and exploration results, identify:
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
- **Independent files OR uniform tasks**: Parallel -- concurrent agent delegations
- **Dependent + varied + small**: Coherent -- single agent for all tasks
- **Dependent + varied + substantial with clear gates**: Sequential -- ordered delegations with checkpoints

When uncertain between Coherent and Sequential, choose **Coherent** for planless cards.

### 2.4 Checkpoint Before Implementation

Commit a checkpoint in the workspace worktree:

```bash
git add -A
git commit --allow-empty -m "checkpoint: before implementation — [TASK_COUNT] tasks derived from card [CARD_ID]"
```

If resuming: `git stash pop` to restore prior work.

---

## 3. Delegate Implementation

### 3.1 Delegate to Implementer

Pass the **orchestrator-defined tasks** to the implementer agent.

Choose the [MODEL] based on the tasks:
- **Ambiguous requirements, multiple possible approaches, or tasks where you are unsure how to start:** `opus`
- **Clear goal with multiple steps, building features, or fixing bugs in unfamiliar code:** `sonnet`
- **Single-step tasks, following established patterns, or making changes you already understand:** `haiku`

**Coherent** (single delegation for all tasks):

```xml
<invoke name="Task">
<parameter name="description">Implement [TITLE]</parameter>
<parameter name="subagent_type">implementer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">
Card: [CARD_ID] - [TITLE]
Worktree: [WORKTREE_PATH]
Checkpoint SHA: [CHECKPOINT_SHA]

## Description
[CARD_DESCRIPTION]

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
<parameter name="subagent_type">implementer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">
Card: [CARD_ID] - [TITLE]
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
<parameter name="subagent_type">implementer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">
Card: [CARD_ID] - [TITLE]
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
- **COMPLETED**: Mark todos completed, write summary comment, proceed to **4. Finalize**
- **NEEDS_REVISION**: Update todo with attempt count, revert to checkpoint
  - **If attempts < 3**: Re-delegate with additional context from failure report
  - **If attempts >= 3**: Write failure details as comment, add `blocked` tag, **STOP**
- **BLOCKED**: Write blocking details as comment, add `blocked` tag, **STOP**

**On COMPLETED:** Write a progress comment to the card repository summarizing what was implemented, key decisions made, and files modified. Commit to the card repository:

```bash
git add comment/
git commit -m "[what was implemented, key decisions, and files modified in the workspace]"
```

### 3.3 Validation Gate

**Requirement:** ALL validation commands must pass before proceeding. This usually means linting, type checking, and testing.

**On any failure:**
1. Error in code you can modify -> delegate fix to implementer, re-run validation
2. Error outside your scope -> block immediately

**When blocked:** Write exact failure output as a comment, add `blocked` tag to `CARD.meta.json`, commit, and **STOP**.

Only proceed to **4. Finalize** when ALL validations pass.

---

## 4. Finalize

### If review is required (gates.reviewRequired is true):

Write a summary comment to the card repository explaining what you implemented and key decisions made. List the main workspace files modified and confirm all validation passed. Indicate you are waiting for approval before merge.

Update `CARD.meta.json` to set status to `needs_review`. Commit to the card repository:

```bash
git add CARD.meta.json comment/
git commit -m "[summary of implementation, key decisions, validation results, and what the reviewer should focus on]"
```

**STOP** -- Merge occurs after user approval.

### If review is NOT required:

Write a completion comment to the card repository. Commit to the card repository. Then launch the merge agent:

```xml
<invoke name="Task">
<parameter name="description">Merge [TITLE]</parameter>
<parameter name="subagent_type">merge</parameter>
<parameter name="prompt">
Card: [CARD_ID] - [TITLE]
Branch: [BRANCH_NAME]
Worktree: [WORKTREE_PATH]
Base branch: [BASE_BRANCH]

Merge the worktree branch to the base branch.
</parameter>
</invoke>
```

</instructions>
