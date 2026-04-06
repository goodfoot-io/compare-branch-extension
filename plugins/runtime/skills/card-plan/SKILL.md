---
name: card-plan
description: Assess card complexity, select a planning tier, dispatch subagents, and decide whether the plan is ready to proceed.
---


<instructions>

## 1. Check for Existing Plan

Check whether `PLAN.md` exists in the card repository.

- **PLAN.md exists**: Spawn the planner alone (Step 2, Tier 2) to evaluate the existing plan. Act on what it returns in Step 3 — only dispatch failure-mode subagents if the planner signals the plan needs revision. Skip tier selection.
- **No PLAN.md**: Proceed to tier selection below.

## 1.1 Select Planning Tier

Read the card from the `<card>` block. Assess scope, type, number of files likely affected, acceptance criteria complexity, and risk signals. Select the tier that matches the work:

| Tier | What runs |
|------|-----------|
| 1 | No plan — proceed directly to implementation |
| 2 | `planner` subagent only |
| 3 | `planner` subagent + one `plan-failure-mode` subagent |
| 4 | `planner` subagent + multiple `plan-failure-mode` subagents, each scoped to a different area of concern |

If `gates.planRequired` is true, skip tier 1 — always create a plan (tier 2–4).

## 2. Dispatch Subagents

### Tier 1

No subagents needed. Proceed to Step 4.

### Tier 2

Spawn the planner:

```xml
<invoke name="Agent">
<parameter name="description">Plan creation</parameter>
<parameter name="subagent_type">runtime:card:planner</parameter>
<parameter name="model">opus</parameter>
<parameter name="prompt">
Create an implementation plan for this card.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

Read the card from the card repository. Create the plan and investigate uncertainties. Return the plan state and any blockers.
</parameter>
</invoke>
```

### Tier 3

Spawn the planner first, wait for it to return, then spawn one `plan-failure-mode` subagent:

```xml
<invoke name="Agent">
<parameter name="description">Plan creation</parameter>
<parameter name="subagent_type">runtime:card:planner</parameter>
<parameter name="model">opus</parameter>
<parameter name="prompt">
Create an implementation plan for this card.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

Read the card from the card repository. Create the plan and investigate uncertainties. Return the plan state and any blockers.
</parameter>
</invoke>
```

After the planner returns, spawn the failure-mode subagent:

```xml
<invoke name="Agent">
<parameter name="description">Plan failure-mode analysis</parameter>
<parameter name="subagent_type">runtime:card:plan-failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="prompt">
Identify potential failure modes in this implementation plan.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

Read PLAN.md from the card repository. Read every source file the plan references, then search the workspace for consumers of every symbol, type, and file the plan modifies. Return your findings.
</parameter>
</invoke>
```

### Tier 4

Spawn the planner first, wait for it to return, then spawn multiple `plan-failure-mode` subagents in parallel, each with a focused scope:

```xml
<invoke name="Agent">
<parameter name="description">Plan creation</parameter>
<parameter name="subagent_type">runtime:card:planner</parameter>
<parameter name="model">opus</parameter>
<parameter name="prompt">
Create an implementation plan for this card.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

Read the card from the card repository. Create the plan and investigate uncertainties. Return the plan state and any blockers.
</parameter>
</invoke>
```

After the planner returns, spawn the failure-mode subagents in parallel:

```xml
<invoke name="Agent">
<parameter name="description">Plan failure-mode analysis — data flow and multi-file impact</parameter>
<parameter name="subagent_type">runtime:card:plan-failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="prompt">
Identify potential failure modes in this implementation plan. Focus on data-flow completeness and multi-file impact.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

Read PLAN.md from the card repository. Read every source file the plan references, then search the workspace for consumers of every symbol, type, and file the plan modifies. Return your findings.
</parameter>
<parameter name="run_in_background">true</parameter>
</invoke>
<invoke name="Agent">
<parameter name="description">Plan failure-mode analysis — error paths and async hazards</parameter>
<parameter name="subagent_type">runtime:card:plan-failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="prompt">
Identify potential failure modes in this implementation plan. Focus on error paths, async hazards, and partial-failure handling.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

Read PLAN.md from the card repository. Read every source file the plan references, then search the workspace for consumers of every symbol, type, and file the plan modifies. Return your findings.
</parameter>
</invoke>
```

## 3. Read Findings and Decide

After all subagents return, read their output.

Based on the planner's outcome and any failure-mode findings:

- **Planner blocked**: Document in comment, add `blocked` tag, commit. **STOP** — do not proceed to implementation.
- **Findings require plan revision**: Re-spawn the planner with the findings incorporated into the prompt. Return to Step 2 to re-dispatch failure-mode subagents after the planner returns.
- **No blocking findings**: Proceed to Step 4.

When deciding whether findings require revision, apply the same bar a maintainer would: wrong strategy, unvalidated assumption, design principle violation, or completeness gap requires revision. Style observations and minor nits do not.

## 4. Next Step

Read `gates.planRequired` from `CARD.meta.json`.

Based on the outcome:

- **Blocked**: **STOP** — do not proceed to implementation.
- **Tier 1 (no plan)**: Load the `runtime:card-implementation` skill and follow its instructions.
- **Approved and planRequired**: **STOP** — plan submitted for approval. Do not modify gates in `CARD.meta.json`.
- **Approved and not planRequired**: Load the `runtime:card-implementation-with-plan` skill and follow its instructions.

</instructions>
