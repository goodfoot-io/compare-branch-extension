---
name: implementation-with-plan
description: Implement approved plans.
---


<placeholder-variables>
[TASK_DESCRIPTION] — Human-readable description of the current task phase (set in Step 2.2 before each checkpoint commit; derived from the current todo's title or the plan section name being delegated to the next agent)
[MODEL] — LLM model selection for subagent delegation (opus, sonnet, or haiku)
[PLAN_FILES] — All files the plan intends to modify (set in Step 2.1 by extracting task file assignments from PLAN.md; consumed in Step 2.6 for modification scope check and Step 4.3 cleanup annotation)
[COMMANDERS_INTENT] — 2-4 sentence statement of the card's broader purpose (synthesized in Step 3.2 from CARD.md and PLAN.md goals; passed to end-to-end evaluator prompt in Step 3.4)
</placeholder-variables>

<orchestrator-constraints>
The orchestrator coordinates — it does NOT implement code.

| Orchestrator handles directly | Agents handle via delegation |
|------------------------------|------------------------------|
| Syntax errors visible in output | Feature implementation |
| Import corrections (e.g., missing .js) | Business logic changes |
| Config file typos | Complex debugging |
| Test setup/polyfills | Multi-file refactoring |
| | Investigation tasks |
| | Library integrations |
| | API changes |

Plan says "implement" -> delegate to implementer agent.
Use only TodoWrite and Task tools for coordination. Never use Read/Write/Edit/MultiEdit for implementation.

**Never update card status directly. Never include commitSha in comments after commits** — hooks handle commit tracking automatically.
</orchestrator-constraints>

<instructions>

## 1. Prepare Environment

Stash any uncommitted changes:

```bash
cd $WORKSPACE_PATH
git stash --include-untracked
```

Create baseline tag:

```bash
cd $WORKSPACE_PATH
git tag -f "implement/!` echo $CARD_ID`/baseline" HEAD
```

Restore stash after todo initialization in Step 2.1 — pop unconditionally (the stash may be empty).

---

## 2. Execute Implementation

### 2.1 Validate and Initialize

Read `PLAN.md` from the card repository:

If `PLAN.md` is empty or missing: write an error comment using the canonical comment pattern, add `blocked` tag to `CARD.meta.json`, commit, and **STOP**.

Create todos from the plan content using TodoWrite.

Extract [PLAN_FILES] — all files the plan intends to modify (from task file assignments).

Restore any stashed changes: `git stash pop || true` (succeeds silently if stash is empty).

### 2.2 Task Checkpoint

Before each agent delegation, commit a checkpoint:

```bash
cd $WORKSPACE_PATH
git add -A  # checkpoint: stage all workspace files before [TASK_DESCRIPTION]
git commit --allow-empty -m "checkpoint: before [TASK_DESCRIPTION] — [COMPLETED] of [TOTAL] tasks complete for card $CARD_ID"
```

### 2.3 Assess Coherence

Analyze tasks along three dimensions:

| Dimension | Question |
|-----------|----------|
| **Dependency** | Do files import/reference each other? |
| **Uniformity** | Same operation across files, or varied operations? |
| **Size** | Substantial tasks with clear completion gates? |

**Route**:
- Independent files OR uniform tasks -> **Parallel** (concurrent agents)
- Dependent + varied + small -> **Coherent** (single agent)
- Dependent + varied + substantial with clear gates -> **Sequential** (ordered agents, checkpoint between)

When uncertain between Coherent and Sequential, choose **Sequential**.
Checkpoints have low cost; missed validation opportunities have high cost.

Clear gates: type-check passes, tests pass, API functional, UI renders.

### 2.4 Delegate Implementation

Choose the [MODEL] based on the tasks:
- **Ambiguous requirements, multiple possible approaches, or tasks where you are unsure how to start:** `opus`
- **Clear goal with multiple steps, building features, or fixing bugs in unfamiliar code:** `sonnet`
- **Single-step tasks, following established patterns, or making changes you already understand:** `haiku`

Based on coherence assessment:

**Parallel**: Launch concurrent agents for independent groups:
```xml
<invoke name="Task">
<parameter name="description">Implement [GROUP_A_SUMMARY]</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">...</parameter>
<parameter name="run_in_background">true</parameter>
</invoke>
<invoke name="Task">
<parameter name="description">Implement [GROUP_B_SUMMARY]</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">...</parameter>
</invoke>
```

**Sequential**: Delegate to agent, checkpoint at gate, then delegate next phase.

**Coherent**: Single agent for all todos.

Agent prompt template — prompts must be self-contained. Agents have no conversation context. Read all files to be modified before dispatching.

```xml
<invoke name="Task">
<parameter name="description">[Implement TITLE (all todos) | Current phase/group]</parameter>
<parameter name="subagent_type">runtime:card:implementer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">
## Task
[Description with testing requirements from plan]

## Plan
@!` echo $CARD_REPO_PATH`/PLAN.md

## Scope
[Coherent: Complete all todos in sequence, committing after each logical unit.]
[Sequential: Complete phase [N] todos: [phase todo descriptions]. Stop at gate: [GATE_CONDITION].]
[Parallel: Complete todos: [independent group todo descriptions]]

## Context
[Why this task exists — from plan rationale]
[Relevant context from exploration]

## File Ownership
This task owns: [absolute paths from plan]
Only modify files assigned to this task.

## Current File Content
[Read and include current content of files to be modified]

## Constraints
[From plan: patterns, interfaces, dependencies to respect]

## Patterns to Follow
[Code snippets showing conventions — from exploration or file reads]

## Implementation Approach
For new functions or methods, load the `goodfoot:tdd-implementation` skill and follow its instructions.

## Guidelines
- Only make requested changes
- Don't add unrequested features or abstractions
- Keep implementation minimal and focused

## Success Criteria
- [ ] Implementation complete
- [ ] Tests pass (if applicable)
- [ ] Types correct
- [ ] Follows existing patterns
</parameter>
</invoke>
```

### 2.5 Process Result

Based on agent status:
- **COMPLETED**: Mark todo completed, commit if changes exist, write comment to card, continue
- **NEEDS_REVISION**: Update todo with attempt count, revert changed files to checkpoint:
  ```bash
  # Restore files modified or deleted since checkpoint
  git diff "implement/!` echo $CARD_ID`/baseline" --name-only --diff-filter=MD | \
    xargs -r git checkout "implement/!` echo $CARD_ID`/baseline" --
  # Remove files added since checkpoint
  git diff "implement/!` echo $CARD_ID`/baseline" --name-only --diff-filter=A | \
    xargs -r git rm -f
  ```
  - **If attempts < 3**: Re-delegate to agent
  - **If attempts >= 3**: Mark todo blocked
- **BLOCKED**: Document in card comment, mark todo blocked, continue

**COMPLETED:** Commit any workspace changes, then write a brief progress comment to the card repository indicating which task was completed and what was actually done.

```bash
cd $WORKSPACE_PATH
git diff --quiet HEAD || git commit -am "[task name]: [what was implemented]"  # <workspace-commit-style>
```

Commit to the card repository:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[which task was completed and what was actually done]
EOF
git add comment/$COMMENT_ID.md
git commit -m "progress: [task completed (N/M)]"  # <card-repo-commit-style>
```

**After all todos:**
- ALL blocked -> write summary comment, add `blocked` tag, **STOP**:

```bash
cd $CARD_REPO_PATH
$NODE -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); if(!d.tags.includes('blocked')) d.tags.push('blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
All implementation tasks are blocked.

[per-task blocker summary]
EOF
git add comment/$COMMENT_ID.md CARD.meta.json
git commit -m "blocked: [reason summary]"  # <card-repo-commit-style>
```

- SOME blocked -> note in summary, proceed to Step 3
- NONE blocked -> proceed to Step 3

### 2.6 Validation Gate

Create post-implementation checkpoint:

```bash
cd $WORKSPACE_PATH
git add -A  # checkpoint: stage all workspace files after implementation, before validation
git commit --allow-empty -m "checkpoint: after implementation, before validation for card $CARD_ID"
git tag -f "implement/!` echo $CARD_ID`/post-implementation" HEAD
```

**Requirement:** ALL validation commands must pass before proceeding.

Run validation per the plan's "Validation Commands" section.

**On failure:**
1. Error in code you can modify -> delegate fix to implementer, re-run validation
2. Error outside your scope -> block immediately

**When blocked:** Write exact failure output as a comment, add `blocked` tag to `CARD.meta.json`, commit, and **STOP**:

```bash
cd $CARD_REPO_PATH
$NODE -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); if(!d.tags.includes('blocked')) d.tags.push('blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
Blocked: validation failure outside modifiable scope.

[exact validation command and full output]
EOF
git add comment/$COMMENT_ID.md CARD.meta.json
git commit -m "blocked: validation failure outside scope"  # <card-repo-commit-style>
```

Only proceed to **3. Evaluate Quality** when ALL validations pass.

---

## 3. Evaluate Quality

### 3.1 Pre-Evaluation Checkpoint

Commit a checkpoint:

```bash
cd $WORKSPACE_PATH
git add -A  # checkpoint: stage all workspace files before evaluation
git commit --allow-empty -m "checkpoint: before evaluation — implementation complete for card $CARD_ID"
```

### 3.2 Synthesize Commander's Intent

Identify the `CARD.md` goals.

Synthesize [COMMANDERS_INTENT] — a 2-4 sentence statement capturing:
- The problem the card exists to solve
- The outcome the user expects
- Any implicit requirements beyond the plan's literal tasks

### 3.3 Pre-Evaluation Validation

Run validation per the plan's "Validation Commands" section.

**On any failure:** Create todos with "[Pre-eval fix]" prefix from all validation failures, return to Step 2.2.

Only proceed to **Step 3.4** when ALL validations pass.

### 3.4 Create Evaluation Team

```xml
<invoke name="TeamCreate">
<parameter name="team_name">eval-!` echo $CARD_ID`</parameter>
<parameter name="description">!` echo $CARD_ID`: quality evaluation</parameter>
</invoke>
```

Spawn both evaluators as teammates:

```xml
<invoke name="Task">
<parameter name="description">Implementation evaluation</parameter>
<parameter name="subagent_type">runtime:card:implementation-evaluator</parameter>
<parameter name="team_name">eval-!` echo $CARD_ID`</parameter>
<parameter name="name">impl-evaluator</parameter>
<parameter name="prompt">
Evaluate for production readiness.

## Validation Status
All validation commands from the plan's "Validation Commands" section passed before this evaluation was launched.

## Baseline
Changes are relative to git tag: `implement/!` echo $CARD_ID`/baseline`

## Modified Files
[PLAN_FILES]

You are a teammate in an evaluation team. The end-to-end evaluator ("e2e-evaluator") is evaluating alongside you. Share noteworthy findings that affect behavioral correctness via SendMessage.
</parameter>
</invoke>
<invoke name="Task">
<parameter name="description">End-to-end evaluation</parameter>
<parameter name="subagent_type">runtime:card:end-to-end-evaluator</parameter>
<parameter name="team_name">eval-!` echo $CARD_ID`</parameter>
<parameter name="name">e2e-evaluator</parameter>
<parameter name="prompt">
Evaluate implementation against commander's intent.

## Commander's Intent
[COMMANDERS_INTENT]

## Validation Status
All validation commands from the plan's "Validation Commands" section passed before this evaluation was launched.

## Baseline
Changes are relative to git tag: `implement/!` echo $CARD_ID`/baseline`

## Modified Files
[PLAN_FILES]

You are a teammate in an evaluation team. The implementation evaluator ("impl-evaluator") is evaluating code quality alongside you. Share noteworthy findings that affect code quality or structure via SendMessage.
</parameter>
</invoke>
```

### 3.5 Wait for Reports

Wait for both agents to complete their evaluations and deliver reports.

### 3.6 Shut Down Team

Send shutdown requests to both teammates and delete the team:

```xml
<invoke name="SendMessage">
<parameter name="type">shutdown_request</parameter>
<parameter name="recipient">impl-evaluator</parameter>
<parameter name="content">Evaluation complete.</parameter>
</invoke>
<invoke name="SendMessage">
<parameter name="type">shutdown_request</parameter>
<parameter name="recipient">e2e-evaluator</parameter>
<parameter name="content">Evaluation complete.</parameter>
</invoke>
```

```xml
<invoke name="TeamDelete"/>
```

### 3.7 Process Results

Apply the first matching condition:
1. **Either evaluator returns BLOCKED**: Document in comment, add `blocked` tag, commit, **STOP**
2. **Implementation evaluator returns CONTINUE or end-to-end evaluator has required findings**: Create todos with "[Eval fix]" prefix from all required/CONTINUE findings (merged from both evaluators, deduplicated by file:line), return to Step 2.2
3. **Both PRODUCTION_READY/SATISFIES_INTENT and no required e2e findings**: Write completion comment, proceed to Step 4
4. **End-to-end evaluator has only recommended findings**: Log recommended findings as a card comment, proceed to Step 4

Write recommended findings (if any) as a card comment:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
## Recommended Improvements

[recommended findings from end-to-end evaluator — logged for future work]
EOF
git add comment/$COMMENT_ID.md
git commit -m "evaluation: recommended improvements"  # <card-repo-commit-style>
```

---

## 4. Finalize

### 4.1 Craft Final Commit Message

Synthesize the final commit message from implementer Decision Narratives and key findings from evaluator reports, per `<workspace-commit-style>`.

```bash
cd $WORKSPACE_PATH
git add -A  # final: stage any uncommitted implementation artifacts
git commit -m "$(cat <<'COMMITMSG'
[final commit message per <workspace-commit-style>]
COMMITMSG
)"
```

### 4.2 Complete or Await Review

**If review is NOT required (gates.reviewRequired is false or unset):**

Write a completion summary comment to the card repository:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[completion summary: what was implemented and how it aligns with the plan, key files modified, validation confirmation]
EOF
git add comment/$COMMENT_ID.md
git commit -m "implementation complete"  # <card-repo-commit-style>
```

Launch the merge agent:

```xml
<invoke name="Task">
<parameter name="description">Merge</parameter>
<parameter name="subagent_type">runtime:card:merge</parameter>
<parameter name="prompt">!` echo "Merge the \"$WORKSPACE_BRANCH\" branch into the \"$BASE_BRANCH\" branch."`</parameter>
</invoke>
```

**If review is required (gates.reviewRequired is true):**

Write a summary comment to the card repository explaining what you implemented and how it aligns with the approved plan. List the key workspace files modified and confirm all validation passed. Indicate you are awaiting approval. Commit to the card repository:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[what was implemented and how it aligns with the approved plan, key workspace files modified, validation results, and that you are awaiting approval]
EOF
git add comment/$COMMENT_ID.md
git commit -m "implementation complete, awaiting review"  # <card-repo-commit-style>
```

**STOP** — Merge occurs after user approval.

### 4.3 Tag Cleanup

Clean up checkpoint tags:

```bash
cd $WORKSPACE_PATH
git tag -d "implement/!` echo $CARD_ID`/baseline" \
         "implement/!` echo $CARD_ID`/post-implementation" 2>/dev/null
```

### Available Checkpoints

The following checkpoints are created during execution for rollback:

| Tag | Created At | Purpose |
|-----|------------|---------|
| `implement/!` echo $CARD_ID`/baseline` | Step 1 | Original state before any changes |
| `implement/!` echo $CARD_ID`/post-implementation` | Step 2.6 | After implementation, before validation |

Reverts are scoped to [PLAN_FILES] only — files outside the plan's scope are never modified or discarded without user direction.

</instructions>
