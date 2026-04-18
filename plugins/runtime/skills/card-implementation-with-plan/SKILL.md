---
name: card-implementation-with-plan
description: Implement approved plans.
---


<placeholder-variables>
[MODEL] — LLM model selection for subagent delegation (opus, sonnet, or haiku)
[PLAN_FILES] — All files the plan creates, modifies, or deletes (set in Step 2.2; consumed in Step 4.3 cleanup annotation and passed to maintainer as modified-file context)
[PLAN_IDENTIFIERS] — Named types, functions, messages, or CSS classes the plan introduces (set in Step 2.2; used in downstream delegation context)
[PLAN_STATE] — Inferred in Step 2.2 from the task list's plan-derived sub-tasks: `fully-implemented`, `partially-implemented`, or `not-implemented`
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
Use `TaskList`, `TaskUpdate`, and the `Agent` tool for coordination. Never use Read/Write/Edit/MultiEdit for implementation.

The `task-creator` subagent owns seeding and reconciling the task list. The orchestrator reads the task list, drives sub-tasks through status transitions, and marks macro tasks completed as each phase finishes. The orchestrator does not create tasks directly.

**Never update card status directly. Never include commitSha in comments after commits** — hooks handle commit tracking automatically. **Plan approval is the authorization to proceed** — do not re-solicit direction based on scope, commit volume, or overlap with prior work.
</orchestrator-constraints>

<instructions>

## 1. Prepare Environment

The `create-worktree` command is a plugin-provided executable on `PATH`. Use it directly when you need an isolated Git worktree.

Create baseline tag if one does not already exist:

```bash
if git rev-parse "implement/$CARD_ID/baseline" >/dev/null 2>&1; then
  echo "Baseline tag already exists — resuming from prior checkpoint. Step 2.2: Infer Plan State decides whether prior commits implement the current plan."
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

### 2.1 Seed the Task List

Check for plan files in the card repository's `plan/` directory first:
- **No plan files exist**: Write an error comment using the canonical pattern, add `blocked` to `CARD.meta.json` tags, commit, and **STOP** — no plan, no implementation.
- **Plan files exist**: Continue.

Invoke the `task-creator` subagent to seed and reconcile the task list. Wait for it to return.

```xml
<invoke name="Agent">
<parameter name="description">Seed card task list from plan and feedback</parameter>
<parameter name="subagent_type">runtime:card:task-creator</parameter>
<parameter name="prompt">Seed and reconcile the card's task list from the current plan files and any feedback artifacts in the card repository.</parameter>
</invoke>
```

The subagent leaves a fully reconciled task graph: five macros (Implementation → Validation → Evaluation → Stage → Merge) and the plan-derived and feedback-derived sub-tasks that block the Implementation macro.

Call `TaskList` to read the current task graph. `TaskUpdate` any sub-task still at `in_progress` back to `pending` — `in_progress` is session-local state and any such sub-task came from an interrupted prior run.

Feedback artifacts that arrive after this step will not be visible until the next orchestrator entry re-invokes `task-creator`. Do not attempt to detect mid-session feedback.

### 2.2 Infer Plan State

Look at the plan-derived sub-tasks the `task-creator` produced — their `subject` is `[PLAN_PATH] § [SECTION_HEADING]`. Exclude `deleted` sub-tasks from the count:
- **All non-`deleted` plan-derived sub-tasks are `completed`**: Set [PLAN_STATE] to `fully-implemented`.
- **Some are `completed`**: Set [PLAN_STATE] to `partially-implemented`.
- **None are `completed`**: Set [PLAN_STATE] to `not-implemented`.

Extract [PLAN_FILES] and [PLAN_IDENTIFIERS] from the plan content — downstream delegation and cleanup depend on them.

Based on the first matching condition:
- **Any feedback-derived sub-task is non-completed**: Proceed to Step 2.3: Assess Coherence
- **[PLAN_STATE] is `fully-implemented`**: Proceed to Step 2.7: Validation Gate
- **[PLAN_STATE] is `partially-implemented`**: Proceed to Step 2.3: Assess Coherence
- **[PLAN_STATE] is `not-implemented`**: Proceed to Step 2.3: Assess Coherence

Commit subjects are not evidence — `task-creator` has already performed the identifier check against the active plan layer. Trust its reconciliation.

### 2.3 Assess Coherence

Operate over plan-derived sub-tasks whose status is not `completed` and not `deleted`. If the working set is empty, skip to Step 2.4: Delegate Implementation — the feedback loop in Step 2.4 drives remaining work. Otherwise, analyze the set along three dimensions:

| Dimension | Question |
|-----------|----------|
| **Dependency** | Do files import/reference each other? |
| **Uniformity** | Same operation across files, or varied operations? |
| **Size** | Substantial tasks with clear completion gates? |

**Route**:
- **Independent files OR uniform tasks**: Parallel — one agent per independent unit, capped at four concurrent
- **Dependent + varied + small**: Coherent (single agent)
- **Dependent + varied + substantial with clear gates**: Sequential (ordered agents, validate between)

When uncertain between Coherent and Sequential, choose **Sequential** — validation gates have low cost; missed validation opportunities have high cost.

Clear gates: type-check passes, tests pass, API functional, UI renders.

### 2.4 Delegate Implementation

Choose [MODEL] based on the tasks:
- **Ambiguous requirements, multiple possible approaches, or uncertain starting point**: `opus`
- **Clear goal with multiple steps, building features, or fixing bugs in unfamiliar code**: `sonnet`
- **Single-step tasks, following established patterns, or well-understood changes**: `haiku`

Feedback-derived sub-tasks dispatch separately from plan-derived sub-tasks. Their subject is a feedback artifact path, not a plan section, so coherence grouping does not apply:

- **Pending feedback-derived sub-tasks exist**: Dispatch them one per agent invocation using the feedback prompt shape below, then return to this step. Drain all feedback-derived sub-tasks before dispatching plan-derived sub-tasks so the feedback can shape subsequent implementation.
- **No pending feedback-derived sub-tasks**: Dispatch plan-derived sub-tasks using the coherence assessment from Step 2.3.

Based on coherence assessment for plan-derived sub-tasks:

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

Agent prompts must be self-contained — agents have no conversation context. Before invoking, `TaskUpdate` the sub-tasks in the agent's scope to `in_progress` so parallel runs do not overlap.

```xml
<invoke name="Agent">
<parameter name="description">[Implement TITLE (all sub-tasks) | Current phase/group]</parameter>
<parameter name="subagent_type">runtime:card:developer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">
## Task
[Description with testing requirements from plan]

## Plan
@[CARD_REPO_PATH]/plan/

## Scope
The card task list is your source of truth. This invocation owns these sub-task subjects:
- `[PLAN_PATH] § [SECTION_HEADING_A]`
- `[PLAN_PATH] § [SECTION_HEADING_B]`

[Coherent: Complete every listed sub-task in sequence.]
[Sequential: Complete phase [N] sub-tasks listed above. Stop at gate: [GATE_CONDITION].]
[Parallel: Complete the listed sub-tasks; other agents own disjoint subjects.]

## Context
[Why this task exists — from plan rationale]
[Relevant context from exploration]

## File Ownership
This task owns: [absolute paths from plan]. Your `## Files Modified` section (per `runtime:card-developer` output contract) is the revert list on NEEDS_REVISION.

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

For a feedback-derived sub-task, `TaskUpdate` the sub-task to `in_progress` and use this prompt shape:

```xml
<invoke name="Agent">
<parameter name="description">Address feedback [FEEDBACK_PATH]</parameter>
<parameter name="subagent_type">runtime:card:developer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">
## Task
Address the reviewer feedback in `[FEEDBACK_PATH]`. Determine the concrete code changes the feedback asks for, then implement them.

## Feedback
@[CARD_REPO_PATH]/[FEEDBACK_PATH]

## Plan
@[CARD_REPO_PATH]/plan/

## Scope
The card task list is your source of truth. This invocation owns one feedback-derived sub-task whose subject is `[FEEDBACK_PATH]`. Do not touch plan-derived sub-tasks.

## Context
The plan in `plan/` is canonical for architecture and patterns. The feedback layers on top of it — treat it as a directive that refines, corrects, or extends the plan's intent.

## File Ownership
Your `## Files Modified` section (per `runtime:card-developer` output contract) is the revert list on NEEDS_REVISION.

## Guidelines
- Scope changes strictly to what the feedback calls for
- Preserve plan invariants unless the feedback explicitly overrides them
- When the feedback and the plan conflict, prefer the feedback and note the conflict in your result

## Success Criteria
- [ ] Every concrete ask in the feedback is addressed or explicitly deferred with reason
- [ ] Tests pass (if applicable)
- [ ] Types correct
- [ ] No regressions in areas the plan covers
</parameter>
</invoke>
```

### 2.5 Process Result

- **COMPLETED**: Leave the agent's sub-tasks at `in_progress` — Step 2.6: Validate and Commit marks them `completed` after validation passes. Proceed to Step 2.6.
- **NEEDS_REVISION**: `TaskUpdate` the agent's sub-tasks back to `pending` and increment the attempt count tracked in conversation. Revert the agent's owned files to baseline:
  ```bash
  # [AGENT_FILES] is the list of absolute paths the agent reported under `## Files Modified`.
  # Revert only files this agent owns — do not touch other agents' work.
  # Restore owned files that were modified or deleted since baseline
  git diff -z "implement/$CARD_ID/baseline" --name-only --diff-filter=MD -- [AGENT_FILES] | \
    xargs -0 -r git checkout "implement/$CARD_ID/baseline" --
  # Remove owned files that were added since baseline
  git diff -z "implement/$CARD_ID/baseline" --name-only --diff-filter=A -- [AGENT_FILES] | \
    xargs -0 -r git rm -f
  ```
  - **Attempts < 3**: Re-delegate to agent
  - **Attempts >= 3**: `TaskUpdate` the sub-tasks to `blocked`
- **BLOCKED**: `TaskUpdate` the sub-tasks to `blocked`. If any agent results are still pending, process the next one; otherwise evaluate the terminal-status check below.

**After all plan-derived sub-tasks have a terminal status (`completed`, `blocked`, or `deleted`):**
- **ALL `blocked`**: Add `blocked` to `tags` in `CARD.meta.json` if not already present. Write a summary comment to `comment/all-tasks-blocked.md` with per-sub-task blocker details. `TaskUpdate` the Implementation macro to `blocked`. Commit both files and **STOP**.
- **SOME `blocked`**: `TaskUpdate` the Implementation macro to `completed`, proceed to Step 2.7: Validation Gate.
- **NONE `blocked`**: `TaskUpdate` the Implementation macro to `completed`, proceed to Step 2.7: Validation Gate.

### 2.6 Validate and Commit

Load the `cards:markdown` and `runtime:workspace-commit-style` skills if not already loaded. The `<workspace-commit-style>` convention used in workspace commit messages throughout these instructions is defined in `runtime:workspace-commit-style` — it must be loaded before any commits are made.

Run typecheck, lint, and the tests relevant to the developer's changes.

Based on the result:
- **Error within orchestrator scope** (syntax error, import correction, config typo, test polyfill — per `<orchestrator-constraints>`): Fix inline and re-run validation.
- **Error requiring implementation changes**: Treat as NEEDS_REVISION — revert agent files and re-delegate per Step 2.5.
- **All validations pass**: `TaskUpdate` the agent's sub-tasks to `completed`. Commit all workspace changes including new files:

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
- **Sequential, more phases remain**: Return to Step 2.4: Delegate Implementation to delegate the next phase.
- **More agent results pending** (parallel, or sequential with concurrent agents): Return to Step 2.5: Process Result for the next result.
- **All plan-derived sub-tasks processed**: Evaluate the "After all plan-derived sub-tasks" conditions in Step 2.5: Process Result.

### 2.7 Validation Gate

Mark the post-implementation rollback point:

```bash
git tag -f "implement/$CARD_ID/post-implementation" HEAD
```

**Requirement:** ALL validation commands must pass before proceeding.

Run validation per the plan's validation commands.

**On failure:**
- **Error in code you can modify**: Delegate fix to implementer, re-run validation
- **Error outside your scope**: Block immediately

**When blocked:** Add `blocked` to `tags` in `CARD.meta.json` if not already present. Write exact failure output to `comment/validation-failed.md`. `TaskUpdate` the Validation macro to `blocked`. Commit both files and **STOP**.

When ALL validations pass, `TaskUpdate` the Validation macro to `completed`, then proceed to Step 3: Evaluate Quality.

---

## 3. Evaluate Quality

Diff the workspace against the baseline to assess the scope of changes: number of files changed, types of changes, and runtime risk signals (new API boundaries, async logic, shared state, error-path changes).

Based on scope:
- **Simple — few files changed, well-understood modification, no new logic or API boundaries**: Skip evaluation.
- **Needs evaluation — multiple files changed, new logic introduced, or runtime risk present**: Load the `runtime:card-implementation-evaluation` skill and follow its instructions.

`TaskUpdate` the Evaluation macro to `completed`, then proceed to Step 4: Finalize.

---

## 4. Finalize

### 4.1 Stage Remaining Changes

Stage any uncommitted implementation artifacts:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
```

`TaskUpdate` the Stage macro to `completed`.

### 4.2 Complete or Await Review

- **gates.mergeRequestRequired is false or unset**: Load the `runtime:card-merge` skill and follow its `<instructions>`. `TaskUpdate` the Merge macro to `completed` once the skill returns.
- **gates.mergeRequestRequired is true**: **STOP** — Merge occurs after user approval. Leave the Merge macro at `pending`.

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
| `implement/[CARD_ID]/baseline` | Step 1 | After each COMPLETED sub-task commit (Step 2.6) | Last known good state — NEEDS_REVISION reverts to this tag |
| `implement/[CARD_ID]/post-implementation` | Step 2.7 | Never | After all per-sub-task validation and commits, before final validation |


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
