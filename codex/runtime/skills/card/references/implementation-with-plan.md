
<instructions>

## 1. Prepare Environment

Pin the baseline tag at HEAD. The baseline does not advance during implementation; if the tag already exists, leave it where it is — you are resuming from a prior checkpoint.

```bash
git tag "implement/$CARD_ID/baseline" HEAD  # skip if the tag already exists
```

## 2. Implement Plan

This is the plan-driven path: the plan was approved before implementation, and your job is to execute it without rewriting it. If the plan turns out to be wrong, see `<when-to-return-to-planning>`.

Work proceeds in **groups**. A group is the unit of agent dispatch — every group must reach a validation-passing state on its own, and ends in a single commit. The shape of each group (one agent, several concurrent agents, or one agent through an ordered phase) comes out of `<dispatch>`.

For each group:

1. Pass `<verify-plan-state>`. It either routes you into `<dispatch>` for the next group, or — when the plan is fully implemented — into `<final-validation-gate>`.
2. Pass `<dispatch>` — assess coherence and delegate.
3. Pass `<group-validation-gate>` — validate, then commit on success or rollback on failure.
4. Return to step 1.

Step 2 ends when `<final-validation-gate>` passes. Both gates are gates, not terminal states; Steps 3 and 4 still follow.

Every commit in this flow follows the `<workspace-commit-style>` and `<markdown-guidelines>` conventions.

## 3. Evaluate Quality

Diff the workspace against the baseline to assess scope: number of files changed, types of changes, and runtime risk signals (new API boundaries, async logic, shared state, error-path changes).

- **Simple** — single-file change, or mechanical edit (rename, type signature update, config tweak) with no behavioral change. Skip evaluation; proceed to Step 4.
- **Behavioral or cross-file** — any new logic, new API boundary, multi-file change, or async/error-path modification. Read `./implementation-evaluation.md` and follow its instructions.

When an evaluator needs to verify behavior against the pre-implementation state, `spawn_agent` a child (`task_name` like `baseline_check`) whose `message` tells it to use `$runtime:card-pre-existing-condition` rather than running the comparison in the active workspace — the child owns baseline reproduction and reports the result back. The `message`:

```
Use the $runtime:card-pre-existing-condition skill.

## Behavior Under Investigation
[the behavior the evaluator wants to compare against baseline — file/function/command and the expected pre-implementation result]

## Active Card Diff Scope
[list of files the active card has modified since `implement/$CARD_ID/baseline`]

## Task
Reproduce the named behavior on the baseline ref and report the result. Do not modify the active workspace. Return NOT_PRE_EXISTING with the baseline output so the evaluator can compare it against current behavior.
```

## 4. Finalize

The card is not COMPLETED until every part of this section has run. Passing the final validation gate at the end of Step 2 is not the terminal state — staging, tag cleanup, and the merge decision all follow.

**Stage remaining changes.** Commit any uncommitted implementation artifacts per the workspace commit style — same convention as `<group-validation-gate>`.

**Clean up tags.** The rollback window closes once implementation commits are finalized:

```bash
git tag -d "implement/$CARD_ID/baseline" 2>/dev/null
```

**Route to merge or await review.** Based on `gates.mergeRequestRequired`:
- **false or unset** — read `./merge.md` and follow its `<instructions>`.
- **true** — **STOP**. Merge occurs after user approval.

</instructions>

<verify-plan-state>

Review the plan files in the card repository's `plans/` directory. When multiple files exist, treat the plan file with the most recent commit touching it as layering on top of older ones (`git log -1 --format=%H -- plans/<file>`).

- **Newest plan fully implemented** — pass `<final-validation-gate>`, then Step 3.
- **Implementation steps remain** — pass `<dispatch>` for the next group.

</verify-plan-state>

<dispatch>

The unit of assignment is a group. Choose the group's shape and delegate.

**Compilability invariant.** Steps assigned to a single agent must reach a validation-passing state without depending on work assigned to another agent or a later dispatch. If the plan contains any step that breaks the build, types, or tests until a later step lands, the unit of assignment is the smallest set of steps that restores green — never larger. This overrides every other routing consideration.

**Routing.** First match wins:

- **Parallel** — independent files, or uniform steps across files. Concurrent agents over independent groups; one commit after the group returns.
- **Sequential** — multi-phase plan, intermediate validation gates, or paired remove/add steps in the same scope. Each phase ends in a commit and an immediate return to `<verify-plan-state>` for the next phase.
- **Coherent** — dependent and varied steps, single phase, single end-of-scope validation gate. One agent, one commit. When uncertain between Coherent and Sequential, choose Sequential.

**Delegation.** `spawn_agent` a developer child whose `message` tells it to use `$runtime:card-developer`. Spawn messages must be self-contained — children have no conversation context. For Parallel routing, spawn one child per independent group (descriptive `task_name` like `group_1`, `phase_2`); each runs concurrently and returns its report to you when it finishes.

```
Use the $runtime:card-developer skill.

## Task
[Description with testing requirements from plan]

## Plan
@[CARD_REPO_PATH]/plans/

## Scope
[Coherent: Complete all implementation steps in sequence.]
[Sequential: Complete phase [N]: [phase step descriptions]. Return at gate: [GATE_CONDITION].]
[Parallel: Complete these steps: [independent group step descriptions]]

## Context
[Why this work exists — from plan rationale]
[Relevant context from exploration]

## File Ownership
This work owns: [absolute paths from plan]

## Constraints
[From plan: patterns, interfaces, dependencies to respect]

## Patterns to Follow
[Code snippets showing conventions — from exploration or file reads]

## Guidelines
- Only make requested changes
- Don't add unrequested features or abstractions
- Keep implementation minimal and focused
- When intent is ambiguous, the plan's opening (commander's intent) is the tiebreaker

## Success Criteria
- [ ] Implementation complete
- [ ] Tests pass (if applicable)
- [ ] Types correct
- [ ] Follows existing patterns
```

</dispatch>

<group-validation-gate>

Wait for every child in the current group to return before validating.

Lint and typecheck per the project's AGENTS.md validation conventions. Re-run only the failing test or suite until it passes; broaden to the changed package's suite once green, and defer cross-package or full-validation runs to `<final-validation-gate>`.

- **All pass** — commit the group's changes per the workspace commit style, then return to `<verify-plan-state>`.
- **Orchestrator-scope error** (syntax, import correction, config typo, test polyfill — per `<orchestrator-constraints>`) — fix inline and re-run.
- **Implementation error** — treat as NEEDS_REVISION: discard the group's uncommitted work (`git restore . && git clean -fd`), return to `<dispatch>` to re-route. If the agent returned BLOCKED with a proposed split, adopt the split as the new routing.

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
```

</group-validation-gate>

<final-validation-gate>

After every group is committed and the plan is fully implemented, run validation per the plan's validation commands. Every command must pass before proceeding to Step 3.

- **All pass** — proceed to Step 3.
- **Failure originates in files the active card's diff touched** — delegate the fix to a developer agent, then return to `<group-validation-gate>` to validate and commit.
- **Otherwise** (failure is not obviously the active card's work — anything ambiguous, unfamiliar, or that "feels" pre-existing) — `spawn_agent` a child (`task_name` like `pre_existing_check`) whose `message` tells it to use `$runtime:card-pre-existing-condition`. Do not investigate the failure's origin yourself; that investigation belongs to the spawned child. The `message`:

  ```
  Use the $runtime:card-pre-existing-condition skill.

  ## Failing Command
  [the failing command]

  ## Failure Output
  [full stdout/stderr from the failing command]

  ## Active Card Diff Scope
  [list of files the active card has modified since `implement/$CARD_ID/baseline`]

  ## Task
  Decide whether this failure is pre-existing by reproducing the failing command on the baseline ref. If it reproduces, repair the root cause and re-run the full validation command. If it does not, return NOT_PRE_EXISTING with the baseline output.
  ```

  On the child's return:
  - **COMPLETED** — re-run the validation command and proceed to Step 3 if it passes.
  - **NOT_PRE_EXISTING** — the failure is in scope of this card; re-route to the in-scope branch above.
  - **NEEDS_REVISION or BLOCKED** — block: add `blocked` to `tags` in `CARD.meta.json` if not already present, write the failure output and the child's report to `comments/validation-failed.md`, commit both files, and **STOP**.

</final-validation-gate>

<effort-selection>

`[EFFORT]` is the depth you brief a spawned child to apply, chosen by the work's complexity. Carry it into the spawn `message` as the framing for how much exploration the task warrants, and pass it as the child's `agent_type` when a matching config role exists:

- **`light`** — bounded, low-ambiguity work; one component, short chain from prompt to solution.
- **`standard`** — multi-file or multi-subsystem work with interacting constraints.
- **`deep`** — system-level, high-ambiguity, or cross-cutting work where early decisions shape the rest.

</effort-selection>

<rollback>

`implement/[CARD_ID]/baseline` is created in Step 1, never advances, and serves as the pre-implementation rollback target for `<when-to-return-to-planning>`. Within implementation, per-group commits made in `<group-validation-gate>` serve as the NEEDS_REVISION rollback target — a failed group reverts only its uncommitted changes via `git restore . && git clean -fd`, leaving prior successful groups intact.

</rollback>

<when-to-return-to-planning>

Return-to-planning triggers are plan-internal failures only. Scope-too-large-for-one-session is handled by re-routing in `<dispatch>` (split and re-dispatch), not by returning to planning. Runtime, prior-commit volume, and overlap with shipped code are not triggers. Stop and return to planning only if one of the following emerges:

1. **Implementation creates problems it then has to solve** — the approach introduces complexity (timing windows, error-handling machinery, interface mismatches) that wouldn't exist with a different approach. The plan chose the wrong strategy.
2. **A plan assumption proved false during implementation** — a spike verified something that implementation disproves. The approach the plan committed to no longer holds.
3. **The plan missed scope that changes the approach** — implementation reveals consumers or dependencies the plan didn't account for, and accommodating them requires a different strategy, not just additional steps.
4. **A planned step is invalidated by a completed one** — steps that were each valid in isolation turn out to be mutually incompatible. The plan has an internal contradiction that only surfaces during execution.
5. **Requirements changed since the plan was written** — new user constraints, API changes, or clarifications arrived after the plan was approved that are incompatible with the planned approach. Continuing would implement something the user no longer wants.

When any condition holds, **stop immediately**. Revert to baseline:

```bash
git reset --hard "implement/$CARD_ID/baseline"
git clean -fd
```

Read `./plan.md` and follow its instructions. The planner will find the existing plan files in `plans/` and revise them — the invalidated assumption, missed scope, or contradicting steps are live context that should drive the revision.

</when-to-return-to-planning>

<orchestrator-constraints>

You coordinate — you do NOT implement code yourself.

| Orchestrator handles directly | Agents handle via delegation |
|------------------------------|------------------------------|
| Syntax errors | Feature implementation |
| Import corrections | Business logic changes |
| Config typos | Complex debugging |
| Test polyfills | Multi-file refactoring |
| | Investigation work |
| | Library integrations |
| | API changes |

Plan says "implement" → delegate to developer agent. Never use Read/Write/Edit/MultiEdit for implementation.

**Never update card status directly. Never include commitSha in comments after commits** — hooks handle commit tracking automatically. A mid-flow status report ("Step N is committed and validates; M phases remain; stopping for review") is re-solicitation; continue to the next group.

**Never dispatch a scope that cannot be completed in a single agent session and reach a validation gate on its own.** Each dispatched scope must be reachable to a validation-passing state within one session without depending on a later dispatch. A scope that cannot — by validation reachability or by session size — is too large; return to `<dispatch>` and split. When the previous agent returned a proposed split with BLOCKED, treat that split as the default routing. The constraint is on validation reachability and session size within the scope, not on commit timing — commits are produced in `<group-validation-gate>` after the group returns.

</orchestrator-constraints>
