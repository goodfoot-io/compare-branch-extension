
<placeholder-variables>
[MODEL] — LLM model selection for subagent delegation (opus, sonnet, or haiku)
</placeholder-variables>

<instructions>

## 1. Prepare Environment

Create the baseline tag if one does not already exist. The baseline is pinned — it does not advance during implementation.

```bash
if git rev-parse "implement/$CARD_ID/baseline" >/dev/null 2>&1; then
  echo "Baseline tag already exists — resuming from prior checkpoint."
else
  git tag "implement/$CARD_ID/baseline" HEAD
fi
```

## 2. Implement Plan

### 2.1 Verify Current State

Review the plan files in the card repository's `plan/` directory. When multiple files exist, treat the plan file with the most recent commit touching it as layering on top of older ones. Use `git log -1 --format=%H -- plan/<file>` to compare.

Based on plan completion:
- **Newest plan fully implemented**: Proceed to Step 3: Validation Gate.
- **Implementation steps remain**: Proceed to Step 2.2: Assess Coherence.

### 2.2 Assess Coherence

**Compilability invariant.** The steps assigned to a single agent must be reachable to a validation-passing state without depending on work assigned to another agent or a later dispatch. If the plan contains any step that breaks the build, types, or tests until a later step lands, the unit of assignment is the smallest set of steps that restores green — never larger. Evaluate this before dependency or uniformity; it overrides them.

Route based on the first matching condition:

- **Parallel** — Independent files, OR uniform steps across files. Concurrent agents over independent groups, one commit after the group returns.
- **Sequential** — Multi-phase plan, intermediate validation gates, or paired remove/add steps in the same scope. Ordered dispatches advance through phases without pausing; each phase ends in a commit and an immediate return to Step 2.1.
- **Coherent** — Dependent and varied steps, AND the plan has a single phase, AND a single end-of-scope validation gate. Single dispatch covering all steps, one commit.

The Sequential tiebreaker is one-way. Route **Coherent** only when every clause of its condition holds. "Phases share context" and "validation is cleaner at the end" are not valid reasons. When uncertain, route **Sequential**.

Clear gates: type-check passes, tests pass, API functional, UI renders.

### 2.3 Delegate Implementation

Choose [MODEL] based on the work:
- **Single-component or clearly bounded work with low ambiguity, limited architectural consequences, and a short chain of dependent steps from prompt to solution**: `haiku`
- **Multi-file or multi-subsystem work with moderate ambiguity, several interacting constraints, and a medium-length chain of dependent steps that requires planning, revision, and integration**: `sonnet`
- **System-level or cross-cutting work with high ambiguity, significant architectural consequences, and a long chain of dependent steps where early decisions materially shape later implementation and debugging**: `opus`

Dispatch agents according to the routing mode from Step 2.2: Assess Coherence:
- **Parallel**: Launch concurrent agents for independent groups.
- **Sequential**: Delegate the current phase, proceed to Step 2.4: Validate and Commit at its gate, then return here for the next phase.
- **Coherent**: Single agent covering all remaining steps in the plan.

Agent prompts must be self-contained — agents have no conversation context. For Parallel routing, dispatch concurrent agents by placing multiple foreground `<invoke>` blocks in a single message — they execute in parallel without backgrounding.

```xml
<invoke name="Agent">
<parameter name="description">[Implement TITLE (all steps) | Current phase | Group N]</parameter>
<parameter name="subagent_type">runtime:card:developer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="run_in_background">false</parameter>
<parameter name="prompt">
## Task
[Description with testing requirements from plan]

## Plan
@[CARD_REPO_PATH]/plan/

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
</parameter>
</invoke>
```

### 2.4 Validate and Commit

**You must load the `cards:markdown` and `runtime:workspace-commit-style` skills before the first commit.**

Wait for every agent in the current group (Parallel, Coherent, or current Sequential phase) to return before validating.

Run the repository's workspace-level type-check and lint commands from the workspace root.

Then run tests scoped to what the group changed:
- **Changes isolated to a single package**: Run that package's test suite.
- **Changes span multiple packages, or the package boundary is unclear**: Run the workspace's full validation suite.

Based on the combined result:
- **All validations pass**: Commit the group's changes and return immediately to Step 2.1. Do not pause to summarize, request review, or report intent for the next phase — plan approval is the standing authorization for every remaining phase. The only loop exits are Step 2.1's "Newest plan fully implemented" branch, `<when-to-return-to-planning>`, and explicit BLOCKED STOPs.
- **Error within orchestrator scope** (syntax error, import correction, config typo, test polyfill — per `<orchestrator-constraints>`): Fix inline and re-run the validations above.
- **Error requires implementation changes**: Treat as NEEDS_REVISION. Discard the group's uncommitted work, return to Step 2.2: Assess Coherence to re-route — if the agent returned BLOCKED with a proposed split, adopt the split as the new routing — then re-dispatch.

Commit on success:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
```

NEEDS_REVISION rollback — restores the worktree to the last successful commit (or the baseline on the first group):

```bash
git restore .
git clean -fd
```

Then return to Step 2.3: Delegate Implementation with a revised prompt.

## 3. Validation Gate

**Requirement:** ALL validation commands must pass before proceeding.

Run validation per the plan's validation commands.

Based on the result:
- **All validations pass**: Proceed to Step 4: Evaluate Quality.
- **Resolvable error**: Delegate the fix to a developer agent, then return to Step 2.4: Validate and Commit to run the group-validation gate and commit.
- **Unresolvable error**: Block immediately.

**When blocked**: Add `blocked` to `tags` in `CARD.meta.json` if not already present. Write the exact failure output to `comment/validation-failed.md`. Commit both files and **STOP**.

## 4. Evaluate Quality

Diff the workspace against the baseline to assess the scope of changes: number of files changed, types of changes, and runtime risk signals (new API boundaries, async logic, shared state, error-path changes).

Based on scope:
- **Simple**: Single-file change, or a mechanical edit (rename, type signature update, config tweak) with no behavioral change. Skip evaluation — proceed to Step 5: Finalize.
- **Behavioral or cross-file**: Any new logic, new API boundary, multi-file change, or async/error-path modification. Read `./implementation-evaluation.md` and follow its instructions.

When an evaluator needs to verify behavior against the pre-implementation state, follow `<baseline-worktree-testing>` rather than switching branches in the active workspace.

## 5. Finalize

### 5.1 Stage Remaining Changes

Stage any uncommitted implementation artifacts:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
```

### 5.2 Tag Cleanup

Remove the baseline tag — the pre-implementation rollback window is closed once the implementation commits are finalized.

```bash
git tag -d "implement/$CARD_ID/baseline" 2>/dev/null
```

### 5.3 Complete or Await Review

`gates.mergeRequestRequired` is the durable, pre-authorized gate for the merge step — it is the authorization the global "authorized in advance in durable instructions" rule asks for. Do not re-derive safety from context; read the gate and act:

- **false or unset**: The card author has pre-authorized a local-only merge. Read `./merge.md` and follow its `<instructions>` without further confirmation.
- **true**: **STOP** — the gate withholds authorization. Merge occurs only after user approval.

</instructions>

<rollback>

| Tag | Created At | Advances | Purpose |
|-----|------------|----------|---------|
| `implement/[CARD_ID]/baseline` | Step 1: Prepare Environment | Never | Pre-implementation rollback target for `<when-to-return-to-planning>`. |

Per-group commits made in Step 2.4: Validate and Commit serve as the NEEDS_REVISION rollback target within implementation — a failed group reverts only its uncommitted changes via `git restore . && git clean -fd`, leaving prior successful groups intact.

</rollback>

<when-to-return-to-planning>

Return-to-planning triggers are plan-internal failures only. Scope-too-large-for-one-session is handled by re-routing in Step 2.2: Assess Coherence (split and re-dispatch), not by returning to planning. Runtime, prior-commit volume, and overlap with shipped code are not triggers. Stop and return to planning only if one of the following emerges:

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

Read `./plan.md` and follow its instructions. The planner will find the existing plan files in `plan/` and revise them — the invalidated assumption, missed scope, or contradicting steps are live context that should drive the revision.

</when-to-return-to-planning>

<orchestrator-constraints>
The orchestrator coordinates — it does NOT implement code.

| Orchestrator handles directly | Agents handle via delegation |
|------------------------------|------------------------------|
| Syntax errors visible in output | Feature implementation |
| Import path corrections | Business logic changes |
| Config file typos | Complex debugging |
| Test setup/polyfills | Multi-file refactoring |
| | Investigation work |
| | Library integrations |
| | API changes |

Plan says "implement" → delegate to developer agent. Never use Read/Write/Edit/MultiEdit for implementation.

**Never update card status directly. Never include commitSha in comments after commits** — hooks handle commit tracking automatically. **Plan approval is the authorization to proceed** — do not re-solicit direction based on scope, commit volume, or overlap with prior work. A mid-flow status report ("Step N is committed and validates; M phases remain; stopping for review") is re-solicitation; continue to the next phase.

**Never dispatch a scope that cannot be completed in a single agent session and reach a validation gate on its own.** Each dispatched scope must be reachable to a validation-passing state within one session without depending on a later dispatch. A scope that cannot — by validation reachability or by session size — is too large; return to Step 2.2: Assess Coherence and split. When the previous agent returned a proposed split with BLOCKED, treat that split as the default routing. The constraint is on validation reachability and session size within the scope, not on commit timing — commits are produced in Step 2.4: Validate and Commit after the group returns.
</orchestrator-constraints>

<baseline-worktree-testing>

The `create-worktree` command is a plugin-provided executable on `PATH`. Use it directly when you need an isolated Git worktree.

To test against the baseline, create a temporary worktree — never switch branches or stash in the current workspace:

```bash
create-worktree "implement/$CARD_ID/baseline"
```

Run tests in the worktree, then delete the worktree and branch.
</baseline-worktree-testing>
