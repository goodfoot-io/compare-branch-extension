---
name: card-implementation-with-plan
description: Implement approved plans.
---


<placeholder-variables>
[MODEL] — LLM model selection for subagent delegation (opus, sonnet, or haiku)
[PLAN_FILES] — All files the plan creates, modifies, or deletes (set in Step 2.1; consumed in Step 4.3 cleanup annotation and passed to maintainer as modified-file context)
[PLAN_IDENTIFIERS] — Named types, functions, messages, or CSS classes the plan introduces (set in Step 2.1; used in the Step 2.1 identifier check)
[PLAN_STATE] — Result of the Step 2.1 state-vs-plan check: `fully-implemented`, `partially-implemented`, or `not-implemented`
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

**Never update card status directly. Never include commitSha in comments after commits** — hooks handle commit tracking automatically. **Plan approval is the authorization to proceed** — do not re-solicit direction based on scope, commit volume, or overlap with prior work.
</orchestrator-constraints>

<instructions>

## 1. Prepare Environment

The `create-worktree` command is a plugin-provided executable on `PATH`. Use it directly when you need an isolated Git worktree.

Create baseline tag if one does not already exist:

```bash
if git rev-parse "implement/$CARD_ID/baseline" >/dev/null 2>&1; then
  echo "Baseline tag already exists — resuming from prior checkpoint. Step 2.1: Validate, Initialize, and Verify Current State decides whether prior commits implement the current plan."
else
  git tag "implement/$CARD_ID/baseline" HEAD
fi
```

To test against the baseline, create a temporary worktree — never switch branches or stash in the current workspace:

```bash
create-worktree "implement/$CARD_ID/baseline"
```

Run tests in the worktree, then delete the worktree and branch.

---

## 2. Execute Implementation

### 2.1 Validate, Initialize, and Verify Current State

Review the plan files in the card repository's `plan/` directory. When multiple files exist, treat the newest as layering on top of older ones — never skip a plan file because another looks canonical.

Based on plan presence:
- **No plan files exist**: Write an error comment using the canonical pattern, add `blocked` to `CARD.meta.json` tags, commit, and **STOP** — no plan, no implementation.
- **Plan files exist**: Continue below.

Extract [PLAN_FILES] and [PLAN_IDENTIFIERS] from the plan content.

Run the timeline check first — it is cheap and decisive:

```bash
WORKSPACE_HEAD_TS=$(cd $WORKSPACE_PATH && git log -1 --format=%ct $WORKSPACE_BRANCH)
PLAN_NEWEST_TS=$(cd $CARD_REPO_PATH && git log -1 --format=%ct -- 'plan/*.md')
```

A plan newer than workspace HEAD is the revise-then-extend pattern: the new plan layers on top of any prior commits, which remain on the branch and are overwritten or replaced by the plan's phases as specified.

Based on the timeline comparison:
- **Plan newer than workspace HEAD**: Set [PLAN_STATE] to `not-implemented`. Create todos for the full plan. Skip the identifier check.
- **Workspace HEAD at or newer than plan**: Run the identifier check below.

Identifier check — verify current state against [PLAN_FILES] and [PLAN_IDENTIFIERS]:
- Files the plan creates must exist on disk.
- Files the plan deletes must not exist on disk.
- Files the plan modifies must contain [PLAN_IDENTIFIERS] (grep).

Based on identifier check:
- **Every check passes**: Set [PLAN_STATE] to `fully-implemented`.
- **Some checks pass**: Set [PLAN_STATE] to `partially-implemented`. Advance the baseline tag to HEAD so rollback targets the partial state.
- **No checks pass**: Set [PLAN_STATE] to `not-implemented`.

Create phase tasks for execution tracking — `TaskCreate` `[Phase] Implementation`, `[Phase] Validation Gate`, `[Phase] Evaluate Quality`, and `[Phase] Finalize`. Set `[Phase] Implementation` to `in_progress`. If [PLAN_STATE] is `fully-implemented`, immediately `TaskUpdate` it to `completed` and set `[Phase] Validation Gate` to `in_progress`.

Based on [PLAN_STATE]:
- **fully-implemented**: Proceed to Step 2.6: Validation Gate
- **partially-implemented**: Advance baseline to HEAD, create todos for the unimplemented items, proceed to Step 2.2: Assess Coherence
- **not-implemented**: Create todos for the full plan, proceed to Step 2.2: Assess Coherence

Commit subjects are not evidence. Phase labels like "Phase 1: …" prove only that *some* Phase 1 was committed, not that it implements the current plan.

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

Agent prompts must be self-contained — agents have no conversation context.

```xml
<invoke name="Agent">
<parameter name="description">[Implement TITLE (all todos) | Current phase/group]</parameter>
<parameter name="subagent_type">runtime:card:developer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">
## Task
[Description with testing requirements from plan]

## Plan
@[CARD_REPO_PATH]/plan/

## Scope
[Coherent: Complete all todos in sequence.]
[Sequential: Complete phase [N] todos: [phase todo descriptions]. Stop at gate: [GATE_CONDITION].]
[Parallel: Complete todos: [independent group todo descriptions]]

## Context
[Why this task exists — from plan rationale]
[Relevant context from exploration]

## File Ownership
This task owns: [absolute paths from plan]

## Constraints
[From plan: patterns, interfaces, dependencies to respect]

## Patterns to Follow
[Code snippets showing conventions — from exploration or file reads]

## Guidelines
- Only make requested changes
- Don't add unrequested features or abstractions
- Keep implementation minimal and focused
- When the task is ambiguous, the plan's intent (opening of the plan file) is the tiebreaker

## Success Criteria
- [ ] Implementation complete
- [ ] Tests pass (if applicable)
- [ ] Types correct
- [ ] Follows existing patterns
</parameter>
</invoke>
```

### 2.4 Process Result

- **COMPLETED**: Mark all todos in this agent's scope as completed, proceed to Step 2.5
- **NEEDS_REVISION**: Update attempt count on all todos in this agent's scope, revert the agent's owned files to baseline:
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

**After all todos:**
- **ALL blocked**: Add `blocked` to `tags` in `CARD.meta.json` if not already present. Write a summary comment to `comment/all-tasks-blocked.md` with per-task blocker details. Commit both files and **STOP**.

- **SOME blocked**: Note in summary, proceed to Step 3: Evaluate Quality.
- **NONE blocked**: Proceed to Step 3: Evaluate Quality.

### 2.5 Validate and Commit

Load the `cards:markdown` and `runtime:workspace-commit-style` skills if not already loaded. The `<workspace-commit-style>` convention used in workspace commit messages throughout these instructions is defined in `runtime:workspace-commit-style` — it must be loaded before any commits are made.

Run typecheck, lint, and the tests relevant to the developer's changes.

Based on the result:
- **Error within orchestrator scope** (syntax error, import correction, config typo, test polyfill — per `<orchestrator-constraints>`): Fix inline and re-run validation.
- **Error requiring implementation changes**: Treat as NEEDS_REVISION — revert agent files and re-delegate per Step 2.4.
- **All validations pass**: Commit all workspace changes including new files:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
git tag -f "implement/$CARD_ID/baseline" HEAD
```

The baseline tag advances after each successful commit. NEEDS_REVISION rollback reverts only to the last successful todo, not to the original starting state.

Based on routing mode and remaining work:
- **Sequential, more phases remain**: Return to Step 2.3: Delegate Implementation to delegate the next phase.
- **More agent results pending** (parallel, or sequential with concurrent agents): Return to Step 2.4: Process Result for the next result.
- **All todos processed**: Evaluate the "After all todos" conditions in Step 2.4: Process Result.

### 2.6 Validation Gate

`TaskUpdate` `[Phase] Implementation` to `completed`. `TaskUpdate` `[Phase] Validation Gate` to `in_progress`.

Mark the post-implementation rollback point:

```bash
git tag -f "implement/$CARD_ID/post-implementation" HEAD
```

**Requirement:** ALL validation commands must pass before proceeding.

Run validation per the plan's validation commands.

**On failure:**
- **Resolvable error**: Delegate fix to implementer, re-run validation
- **Unresolvable error**: Block immediately

**When blocked:** Add `blocked` to `tags` in `CARD.meta.json` if not already present. Write exact failure output to `comment/validation-failed.md`. Commit both files and **STOP**.

Proceed to Step 3: Evaluate Quality only when ALL validations pass.

---

## 3. Evaluate Quality

`TaskUpdate` `[Phase] Validation Gate` to `completed`. `TaskUpdate` `[Phase] Evaluate Quality` to `in_progress`.

Diff the workspace against the baseline to assess the scope of changes: number of files changed, types of changes, and runtime risk signals (new API boundaries, async logic, shared state, error-path changes).

Based on scope:
- **Simple — few files changed, well-understood modification, no new logic or API boundaries**: Skip evaluation. Proceed to Step 4: Finalize.
- **Needs evaluation — multiple files changed, new logic introduced, or runtime risk present**: Load the `runtime:card-implementation-evaluation` skill and follow its instructions.

---

## 4. Finalize

`TaskUpdate` `[Phase] Evaluate Quality` to `completed`. `TaskUpdate` `[Phase] Finalize` to `in_progress`.

### 4.1 Stage Remaining Changes

Stage any uncommitted implementation artifacts:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
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

`TaskUpdate` `[Phase] Finalize` to `completed`.

### Rollback Points

Tags mark rollback points during execution. Tags point to the most recent real commit at each milestone — no dedicated rollback commits are created.

| Tag | Created At | Advances | Purpose |
|-----|------------|----------|---------|
| `implement/[CARD_ID]/baseline` | Step 1 | After each COMPLETED todo commit (Step 2.5) | Last known good state — NEEDS_REVISION reverts to this tag |
| `implement/[CARD_ID]/post-implementation` | Step 2.6 | Never | After all per-todo validation and commits, before final validation |


</instructions>

<when-to-return-to-planning>

Return-to-planning triggers are plan-internal failures only. Scope, runtime, prior-commit volume, and overlap with shipped code are not triggers. Stop and return to planning only if one of the following emerges:

1. **A planned step is invalidated by a completed one** — steps that were each valid in isolation turn out to be mutually incompatible. The plan has an internal contradiction that only surfaces during execution.
2. **The plan missed scope that changes the approach** — implementation reveals consumers or dependencies the plan didn't account for, and accommodating them requires a different strategy, not just additional steps.
3. **A plan assumption proved false during implementation** — a spike verified something that implementation disproves. The approach the plan committed to no longer holds.
4. **Implementation creates problems it then has to solve** — the approach introduces complexity (timing windows, error-handling machinery, interface mismatches) that wouldn't exist with a different approach. This is evidence the plan chose the wrong strategy.
5. **Requirements changed since the plan was written** — new user constraints, API changes, or clarifications arrived after the plan was approved that are incompatible with the planned approach. Continuing would implement something the user no longer wants.

When any condition is met, **stop immediately** — do not continue implementing. Revert all changes to the baseline:

```bash
git reset --hard "implement/$CARD_ID/baseline"
git clean -fd
```

Load the `runtime:card-plan` skill and follow its instructions. The planner will find the existing plan files in `plan/` and revise them — the invalidated assumption, missed scope, or contradicting steps are live context that should drive the revision.

</when-to-return-to-planning>
