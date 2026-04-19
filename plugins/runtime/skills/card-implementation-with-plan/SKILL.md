---
name: card-implementation-with-plan
description: Implement approved plans via the seeded task graph.
---


<placeholder-variables>
[MODEL] — LLM model selection for subagent delegation (opus, sonnet, or haiku)
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

Plan says "implement" → delegate to developer agent. Use `TaskList`, `TaskGet`, `TaskUpdate`, and `Agent` tools for coordination. Never use Read/Write/Edit/MultiEdit for implementation.

**Never update card status directly. Never include commitSha in comments after commits** — hooks handle commit tracking automatically. **Plan approval is the authorization to proceed** — do not re-solicit direction based on scope, commit volume, or overlap with prior work.
</orchestrator-constraints>

<instructions>

## 1. Prepare Environment

Call `TaskList`. The list you will see contains a chain of five phase tasks — `Implementation` → `Validation` → `Evaluation` → `Stage` → `Merge`, each appearing in the next one's `blockedBy` — plus a set of tasks that appear in `Implementation`'s `blockedBy`. The chain corresponds to the phases you drive in this skill; the tasks blocking `Implementation` are the concrete work.

Record the ID of each phase task so later `TaskGet` and `TaskUpdate` calls can address them by ID. If any phase task is absent or the chain is broken, **STOP** — the task list was not seeded; this skill was entered incorrectly.

The `create-worktree` command is a plugin-provided executable on `PATH`. Use it directly when you need an isolated Git worktree.

Create baseline tag if one does not already exist:

```bash
if git rev-parse "implement/$CARD_ID/baseline" >/dev/null 2>&1; then
  echo "Baseline tag already exists — resuming from prior checkpoint. Task statuses reflect prior progress."
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

### 2.1 Enumerate Eligible Tasks

`TaskGet` `Implementation`. Based on status:

- **`completed`**: Proceed to Step 3: Validate.
- **Every task in `Implementation`'s `blockedBy` is `completed`**: `TaskUpdate` `Implementation` to `completed`. Proceed to Step 2.6: Implementation Exit.
- **`pending` or `in_progress`**: Continue below.

`TaskGet` each task in `Implementation`'s `blockedBy` list. A task is **eligible** when its own status is `pending` or `in_progress` AND its own `blockedBy` list is empty or every entry resolves to a `completed` task. Collect the eligible set — these are the concrete work for this wave. Record `id` and `subject` for each.

If the eligible set is empty but non-completed tasks remain, the graph is deadlocked — a non-completed task references a prerequisite that is itself blocked. **STOP** and write a card comment naming the offending task and its unresolved prerequisite chain.

### 2.2 Assess Coherence

Ordering across waves is pre-encoded in sub-task `blockedBy` edges; Step 2.1 surfaces only eligible peers. Routing over the current wave:

- **Eligible tasks form a single tightly coupled unit of work** (one type rename and its callers, one logical refactor): Coherent — dispatch to a single agent.
- **Eligible tasks are independent** (no shared files, no data-flow dependency): Parallel — dispatch concurrent agents, one per task or cluster.

Sequential multi-phase ordering is not a runtime choice here — if the plan required phased execution, the planner wired it into the sub-task graph, and Step 2.1 exposes phases as successive eligible waves.

### 2.3 Delegate Implementation

Choose [MODEL] based on the tasks:
- **Ambiguous requirements, multiple possible approaches, or uncertain starting point**: `opus`
- **Clear goal with multiple steps, building features, or fixing bugs in unfamiliar code**: `sonnet`
- **Single-step tasks, following established patterns, or well-understood changes**: `haiku`

`TaskUpdate` each task in the agent's scope to `in_progress` before dispatch.

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

**Coherent**: Single agent for all tasks in scope.

Agent prompts must be self-contained — agents have no conversation context.

```xml
<invoke name="Agent">
<parameter name="description">[Implement TITLE (all tasks) | Current phase/group]</parameter>
<parameter name="subagent_type">runtime:card:developer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">
## Task
[Description with testing requirements from plan]

## Plan
@[CARD_REPO_PATH]/plan/

## Scope
Tasks in scope:
- `[TASK_ID]`: [SUBJECT]
- `[TASK_ID]`: [SUBJECT]

[Coherent: Complete all tasks in sequence.]
[Parallel: Complete tasks in this group only.]

`TaskGet` each ID to read the full description. A subject shaped as `[STEM] § [SLUG]` is a plan-derived sub-task at `$CARD_REPO_PATH/plan/[STEM].md`; its description lists the plan sections this sub-task covers — read each listed section for scope. A bare `[PATH]` points to a feedback artifact; read that file for scope.

## Context
[Why this work exists — from plan rationale]
[Relevant context from exploration]

## File Ownership
This task owns: [absolute paths referenced in the covered plan sections]

## Constraints
[From plan: patterns, interfaces, dependencies to respect]

## Patterns to Follow
[Code snippets showing conventions — from exploration or file reads]

## Guidelines
- Only make requested changes
- Don't add unrequested features or abstractions
- Keep implementation minimal and focused
- When a task is ambiguous, the plan's intent (opening of the plan file) is the tiebreaker

## Success Criteria
- [ ] Implementation complete for every task in scope
- [ ] Tests pass
- [ ] Types correct
- [ ] Follows existing patterns

## Return
Return `COMPLETED`, `NEEDS_REVISION`, or `BLOCKED`. Include the task IDs the result applies to.
</parameter>
</invoke>
```

### 2.4 Process Result

For each task in the agent's returned scope:

- **COMPLETED**: `TaskUpdate` the task to `completed`. Proceed to Step 2.5: Validate and Commit, then return to Step 2.1: Enumerate Eligible Tasks — a newly-completed task may unblock downstream sub-tasks.
- **NEEDS_REVISION**: Revert the agent's owned files to baseline:
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
  - **Attempts < 3**: Re-delegate to agent.
  - **Attempts ≥ 3**: Leave the task at `in_progress`, add its ID and blocker reason to a running blocked list, continue. Per `TaskUpdate` guidance, blocked work stays `in_progress` — the card comment and `blocked` tag carry the blocker state.
- **BLOCKED**: Leave the task at `in_progress`, document the blocker in a card comment, add its ID to the blocked list, continue.

After every task in this wave's scope has been processed:

- **Blocked list covers every remaining non-completed task**: Add `blocked` to `tags` in `CARD.meta.json` if not already present. Write a summary to `comment/all-tasks-blocked.md` with per-task blocker details (including task ID and subject). Commit both files and **STOP**.
- **Otherwise**: Return to Step 2.1: Enumerate Eligible Tasks — Step 2.1 handles the exit check when `Implementation`'s `blockedBy` is fully `completed`.

### 2.5 Validate and Commit

Load the `cards:markdown` and `runtime:workspace-commit-style` skills if not already loaded. The `<workspace-commit-style>` convention used in workspace commit messages throughout these instructions is defined in `runtime:workspace-commit-style` — it must be loaded before any commits are made.

Run typecheck, lint, and the tests relevant to the developer's changes.

Based on the result:
- **Error within orchestrator scope** (syntax error, import correction, config typo, test polyfill — per `<orchestrator-constraints>`): Fix inline and re-run validation.
- **Error requiring implementation changes**: Treat as NEEDS_REVISION — revert agent files and re-delegate per Step 2.4: Process Result.
- **All validations pass**: Commit all workspace changes including new files:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
git tag -f "implement/$CARD_ID/baseline" HEAD
```

The baseline tag advances after each successful commit. NEEDS_REVISION rollback reverts only to the last successful task, not to the original starting state.

Based on remaining work:
- **More agent results pending**: Return to Step 2.4: Process Result for the next result.
- **All tasks in this wave processed**: Return to Step 2.1: Enumerate Eligible Tasks for the next wave, or exit to Step 2.6 when `Implementation`'s `blockedBy` is fully `completed`.

### 2.6 Implementation Exit

Mark the post-implementation rollback point:

```bash
git tag -f "implement/$CARD_ID/post-implementation" HEAD
```

Proceed to Step 3: Validate.

---

## 3. Validate

`TaskGet` `Validation`. Based on status:

- **`completed`**: Proceed to Step 4: Evaluate.
- **`pending` or `in_progress`**: `TaskUpdate` to `in_progress` and continue below.

**Requirement:** ALL validation commands must pass before proceeding.

Run validation per the plan's validation commands.

Based on the result:
- **All validations pass**: `TaskUpdate` `Validation` to `completed`. Proceed to Step 4: Evaluate.
- **Error in code you can modify**: Delegate fix to implementer, re-run validation.
- **Error outside your scope**: Add `blocked` to `tags` in `CARD.meta.json` if not already present. Write exact failure output to `comment/validation-failed.md`. Leave `Validation` at `in_progress`. Commit both files and **STOP**.

---

## 4. Evaluate

`TaskGet` `Evaluation`. Based on status:

- **`completed`**: Proceed to Step 5: Stage.
- **`pending` or `in_progress`**: `TaskUpdate` to `in_progress` and continue below.

Diff the workspace against the baseline to assess the scope of changes: number of files changed, types of changes, and runtime risk signals (new API boundaries, async logic, shared state, error-path changes).

Based on scope:
- **Simple — few files changed, well-understood modification, no new logic or API boundaries**: Skip evaluation. `TaskUpdate` `Evaluation` to `completed`. Proceed to Step 5: Stage.
- **Needs evaluation — multiple files changed, new logic introduced, or runtime risk present**: Load the `runtime:card-implementation-evaluation` skill and follow its instructions. On successful return, `TaskUpdate` `Evaluation` to `completed`. Proceed to Step 5: Stage.

---

## 5. Stage

`TaskGet` `Stage`. Based on status:

- **`completed`**: Proceed to Step 6: Merge.
- **`pending` or `in_progress`**: `TaskUpdate` to `in_progress` and continue below.

Stage any uncommitted implementation artifacts:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
```

`TaskUpdate` `Stage` to `completed`. Proceed to Step 6: Merge.

---

## 6. Merge

`TaskGet` `Merge`. Based on status:

- **`completed`**: Proceed to Step 7: Cleanup.
- **`pending` or `in_progress`**: Continue below.

Based on `gates.mergeRequestRequired`:
- **false or unset**: `TaskUpdate` `Merge` to `in_progress`. Load the `runtime:card-merge` skill and follow its `<instructions>`. On successful return, `TaskUpdate` `Merge` to `completed`. Proceed to Step 7: Cleanup.
- **true**: **STOP** — Merge occurs after user approval. Leave `Merge` at its current status; the post-approval run resumes here.

---

## 7. Cleanup

Clean up rollback tags:

```bash
git tag -d "implement/$CARD_ID/baseline" \
         "implement/$CARD_ID/post-implementation" 2>/dev/null
```

### Rollback Points

Tags mark rollback points during execution. Tags point to the most recent real commit at each milestone — no dedicated rollback commits are created.

| Tag | Created At | Advances | Purpose |
|-----|------------|----------|---------|
| `implement/[CARD_ID]/baseline` | Step 1 | After each successful commit (Step 2.5) | Last known good state — NEEDS_REVISION reverts to this tag |
| `implement/[CARD_ID]/post-implementation` | Step 2.6 | Never | After all per-task validation and commits, before Step 3: Validate |


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

Load the `runtime:card-plan` skill and follow its instructions. The planner will find the existing plan files in `plan/` and revise them — the invalidated assumption, missed scope, or contradicting steps are live context that should drive the revision. On approval, `runtime:card-plan` reconciles the task list (reopening `Implementation` and the downstream chain if the revision introduces new blocking tasks), then re-loads this skill. Re-enter from Step 1: Prepare Environment — task statuses and the baseline tag drive where work resumes.

</when-to-return-to-planning>
