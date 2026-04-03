---
name: card-implementation-with-plan
description: Implement approved plans.
---


<placeholder-variables>
[MODEL] — LLM model selection for subagent delegation (opus, sonnet, or haiku)
[PLAN_FILES] — All files the plan intends to modify (set in Step 2.1; consumed in Step 4.3 cleanup annotation and passed to maintainer as modified-file context)
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

Plan says "implement" -> delegate to developer agent.
Use only TodoWrite and Task tools for coordination. Never use Read/Write/Edit/MultiEdit for implementation.

**Never update card status directly. Never include commitSha in comments after commits** — hooks handle commit tracking automatically.
</orchestrator-constraints>

<instructions>

## 1. Prepare Environment

`$CREATE_WORKTREE_CLI` is an absolute-path CLI handle, set automatically at session start like `$CARD_CLI`. Use it directly as a command when you need an isolated Git worktree.

Create baseline tag if one does not already exist:

```bash
if git rev-parse "implement/$CARD_ID/baseline" >/dev/null 2>&1; then
  echo "Baseline tag already exists — resuming from prior checkpoint."
else
  git tag "implement/$CARD_ID/baseline" HEAD
fi
```

To test against the baseline, create a temporary worktree — never switch branches or stash in the current workspace:

```bash
$CREATE_WORKTREE_CLI "implement/$CARD_ID/baseline"
```

Run tests in the worktree, then delete the worktree and branch.

---

## 2. Execute Implementation

### 2.1 Validate and Initialize

Read `PLAN.md` from the card repository.

- **PLAN.md is empty or missing**: Write an error comment using the canonical comment pattern, add `blocked` tag to `CARD.meta.json`, commit, and **STOP**.

Create todos from the plan content using TodoWrite.

Extract [PLAN_FILES] — all files the plan intends to modify (from task file assignments).

### 2.2 Assess Coherence

Analyze tasks along three dimensions:

| Dimension | Question |
|-----------|----------|
| **Dependency** | Do files import/reference each other? |
| **Uniformity** | Same operation across files, or varied operations? |
| **Size** | Substantial tasks with clear completion gates? |

**Route**:
- **Independent files OR uniform tasks**: Parallel (concurrent agents)
- **Dependent + varied + small**: Coherent (single agent)
- **Dependent + varied + substantial with clear gates**: Sequential (ordered agents, validate between)

When uncertain between Coherent and Sequential, choose **Sequential** — validation gates have low cost; missed validation opportunities have high cost.

Clear gates: type-check passes, tests pass, API functional, UI renders.

### 2.3 Delegate Implementation

Choose [MODEL] based on the tasks:
- **Ambiguous requirements, multiple possible approaches, or uncertain starting point**: `opus`
- **Clear goal with multiple steps, building features, or fixing bugs in unfamiliar code**: `sonnet`
- **Single-step tasks, following established patterns, or well-understood changes**: `haiku`

Based on coherence assessment:

**Parallel**: Launch concurrent agents for independent groups:
```xml
<invoke name="Agent">
<parameter name="description">Implement [GROUP_A_SUMMARY]</parameter>
<parameter name="subagent_type">runtime:card:developer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">...</parameter>
<parameter name="run_in_background">true</parameter>
</invoke>
<invoke name="Agent">
<parameter name="description">Implement [GROUP_B_SUMMARY]</parameter>
<parameter name="subagent_type">runtime:card:developer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">...</parameter>
</invoke>
```

**Sequential**: Delegate to agent, validate at gate, then delegate next phase.

**Coherent**: Single agent for all todos.

Agent prompts must be self-contained — agents have no conversation context. Read all files to be modified before dispatching.

```xml
<invoke name="Agent">
<parameter name="description">[Implement TITLE (all todos) | Current phase/group]</parameter>
<parameter name="subagent_type">runtime:card:developer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">
## Task
[Description with testing requirements from plan]

## Plan
@[CARD_REPO_PATH]/PLAN.md

## Scope
[Coherent: Complete all todos in sequence, committing after each logical unit.]
[Sequential: Complete phase [N] todos: [phase todo descriptions]. Stop at gate: [GATE_CONDITION].]
[Parallel: Complete todos: [independent group todo descriptions]]

## Context
[Why this task exists — from plan rationale]
[Relevant context from exploration]

## File Ownership
This task owns: [absolute paths from plan]

## Current File Content
[Read and include current content of files to be modified]

## Constraints
[From plan: patterns, interfaces, dependencies to respect]

## Patterns to Follow
[Code snippets showing conventions — from exploration or file reads]

## Guidelines
- Only make requested changes
- Don't add unrequested features or abstractions
- Keep implementation minimal and focused
- When the task is ambiguous, the plan's intent (opening of PLAN.md) is the tiebreaker

## Success Criteria
- [ ] Implementation complete
- [ ] Tests pass (if applicable)
- [ ] Types correct
- [ ] Follows existing patterns
</parameter>
</invoke>
```

### 2.4 Process Result

- **COMPLETED**: Mark todo completed, commit if changes exist, continue
- **NEEDS_REVISION**: Update todo with attempt count, revert the agent's owned files to baseline:
  ```bash
  # [AGENT_FILES] is the list of absolute paths from the agent's File Ownership section.
  # Revert only files this agent owns — do not touch other agents' work.
  # Restore owned files that were modified or deleted since baseline
  git diff "implement/$CARD_ID/baseline" --name-only --diff-filter=MD -- [AGENT_FILES] | \
    xargs -r git checkout "implement/$CARD_ID/baseline" --
  # Remove owned files that were added since baseline
  git diff "implement/$CARD_ID/baseline" --name-only --diff-filter=A -- [AGENT_FILES] | \
    xargs -r git rm -f
  ```
  - **Attempts < 3**: Re-delegate to agent
  - **Attempts >= 3**: Mark todo blocked
- **BLOCKED**: Document in card comment, mark todo blocked, continue

**COMPLETED:** Commit all workspace changes including new files:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>]
COMMITMSG
)"
git tag -f "implement/$CARD_ID/baseline" HEAD
```

The baseline tag advances after each successful commit. NEEDS_REVISION rollback reverts only to the last successful todo, not to the original starting state.

**After all todos:**
- **ALL blocked**: Add `blocked` to `tags` in `CARD.meta.json` if not already present. Write a summary comment to `comment/all-tasks-blocked.md` with per-task blocker details. Commit both files and **STOP**.

- **SOME blocked**: Note in summary, proceed to Step 3
- **NONE blocked**: Proceed to Step 3

### 2.5 Validation Gate

Create post-implementation rollback point:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style> — describe the uncommitted changes]
COMMITMSG
)"
git tag -f "implement/$CARD_ID/post-implementation" HEAD
```

**Requirement:** ALL validation commands must pass before proceeding.

Run validation per the plan's validation commands.

**On failure:**
- **Error in code you can modify**: Delegate fix to implementer, re-run validation
- **Error outside your scope**: Block immediately

**When blocked:** Add `blocked` to `tags` in `CARD.meta.json` if not already present. Write exact failure output to `comment/validation-failed.md`. Commit both files and **STOP**.

Proceed to **3. Evaluate Quality** only when ALL validations pass.

---

## 3. Evaluate Quality

Read `EFFORT` from the `<card>` block (default: `medium`).

- **Low**: Skip evaluation. Proceed to Step 4.
- **Medium or high**: Load the `runtime:card-implementation-evaluation` skill and follow its instructions.

---

## 4. Finalize

### 4.1 Stage Remaining Changes

Stage any uncommitted implementation artifacts:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>]
COMMITMSG
)"
```

### 4.2 Complete or Await Review

- **gates.mergeRequestRequired is false or unset**: Load the `runtime:card-merge` skill and follow its `<instructions>`.
- **gates.mergeRequestRequired is true**: **STOP** — Merge occurs after user approval.

### 4.3 Tag Cleanup

Clean up rollback tags:

```bash
git tag -d "implement/$CARD_ID/baseline" \
         "implement/$CARD_ID/post-implementation" 2>/dev/null
```

### Rollback Points

Tags mark rollback points during execution. Tags point to the most recent real commit at each milestone — no dedicated rollback commits are created.

| Tag | Created At | Advances | Purpose |
|-----|------------|----------|---------|
| `implement/[CARD_ID]/baseline` | Step 1 | After each COMPLETED todo commit (Step 2.4) | Last known good state — NEEDS_REVISION reverts to this tag |
| `implement/[CARD_ID]/post-implementation` | Step 2.5 | Never | After implementation, before validation |


</instructions>
