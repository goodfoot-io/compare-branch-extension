---
name: card-plan
description: Plan a card via tiered dispatch and evaluation.
---


<placeholder-variables>
[CARD_ID] — The card identifier, used to scope the planning team's name
[PLAN_FILE] — The primary plan file path relative to the card repository root, identified from the most recent git commit to `plan/`
</placeholder-variables>

<instructions>

## 1. Select Planning Tier

Read the card from the `<card>` block. Assess scope, type, number of files likely affected, acceptance criteria complexity, and risk signals. Select the tier that matches the work:

| Tier | What runs |
|------|-----------|
| 1 | No plan — proceed directly to implementation |
| 2 | `planner` subagent only |
| 3 | `planner` subagent + one `plan-failure-mode` subagent |
| 4 | `planner` subagent + one `plan-failure-mode` subagent + one `plan-design` subagent |

If `gates.planRequired` is true, skip tier 1 — always create a plan (tier 2–4).

If `gates.planApproved` is true, skip to Step 5: Route to Implementation — the plan is already approved, proceed to implementation.

If plan files already exist in `plan/` but are not approved, the minimum tier is 3 — always dispatch at least one `plan-failure-mode` subagent to evaluate the existing plan.

## 2. Dispatch Subagents

### Tier 1

No subagents needed. Skip team creation and proceed to Step 5: Route to Implementation.

### Create Planning Team (Tier 2–4)

Before dispatching any subagent, create a team to hold the planning subagents:

```xml
<invoke name="TeamCreate">
  <parameter name="team_name">card-plan-[CARD_ID]</parameter>
  <parameter name="description">Planning team for card [CARD_ID]</parameter>
</invoke>
```

Every subagent spawned in this step joins the team by passing `team_name=card-plan-[CARD_ID]`. The team is torn down on every exit path in Step 4: Tear Down Team.

### Tier 2

Spawn the planner in background mode:

```xml
<invoke name="Agent">
<parameter name="description">Plan creation</parameter>
<parameter name="subagent_type">runtime:card:planner</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">planner</parameter>
<parameter name="team_name">card-plan-[CARD_ID]</parameter>
<parameter name="run_in_background">true</parameter>
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

Spawn the planner in background mode first, wait for it to return, then spawn one `plan-failure-mode` subagent:

```xml
<invoke name="Agent">
<parameter name="description">Plan creation</parameter>
<parameter name="subagent_type">runtime:card:planner</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">planner</parameter>
<parameter name="team_name">card-plan-[CARD_ID]</parameter>
<parameter name="run_in_background">true</parameter>
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

After the planner returns, identify the primary plan file:

```bash
git -C [CARD_REPO_PATH] log --format="" --name-only -- plan/ | grep '\.md$' | head -1
```

Then spawn the failure-mode subagent in background mode:

```xml
<invoke name="Agent">
<parameter name="description">Plan failure-mode analysis</parameter>
<parameter name="subagent_type">runtime:card:plan-failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">plan-failure-mode</parameter>
<parameter name="team_name">card-plan-[CARD_ID]</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
Identify potential failure modes in this implementation plan.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

The primary plan file is `[PLAN_FILE]`. Focus your analysis on it; read other files in `plan/` for context. Read every source file the plan references, then search the workspace for consumers of every symbol, type, and file the plan modifies. Return your findings.

Also evaluate the plan's design from the user's perspective: would the plan, if executed correctly, deliver the outcomes the card requires? Look for intent drift between the card and the plan, design choices that would produce wrong user outcomes even when implemented faithfully, and user-facing scenarios the plan doesn't account for.
</parameter>
</invoke>
```

### Tier 4

Spawn the planner in background mode first, wait for it to return, then spawn multiple `plan-failure-mode` subagents in parallel, each with a focused scope:

```xml
<invoke name="Agent">
<parameter name="description">Plan creation</parameter>
<parameter name="subagent_type">runtime:card:planner</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">planner</parameter>
<parameter name="team_name">card-plan-[CARD_ID]</parameter>
<parameter name="run_in_background">true</parameter>
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

Before writing either prompt, identify the primary plan file and read the plan and the card:

```bash
git -C [CARD_REPO_PATH] log --format="" --name-only -- plan/ | grep '\.md$' | head -1
```

Each prompt must reflect the specific nature of this plan and this card.

After the planner returns, spawn both agents in parallel in background mode:

```xml
<invoke name="Agent">
<parameter name="description">Plan failure-mode analysis</parameter>
<parameter name="subagent_type">runtime:card:plan-failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">plan-failure-mode</parameter>
<parameter name="team_name">card-plan-[CARD_ID]</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
Identify potential failure modes in this implementation plan.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

The primary plan file is `[PLAN_FILE]`. Focus analysis on it; read other files in `plan/` for context.

[Describe the specific technical failure risks this plan presents. Where does the plan make load-bearing assumptions about the codebase that should be verified? Which §3 failure patterns are most probable given the plan's approach — multi-file impact blindness, unverified claims, ordering hazards, silent error conversion? Write this from what you found in the plan, not as a generic description.]
</parameter>
</invoke>
```

```xml
<invoke name="Agent">
<parameter name="description">Plan design evaluation</parameter>
<parameter name="subagent_type">runtime:card:plan-design</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">plan-design</parameter>
<parameter name="team_name">card-plan-[CARD_ID]</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
Evaluate whether this plan's design would deliver the user experience the card requires.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

The primary plan file is `[PLAN_FILE]`. Focus analysis on it; read other files in `plan/` for context.

[Translate the card's requirements into the user outcomes this plan must deliver:
- The specific acceptance criteria to verify coverage for
- User-facing scenarios the plan must account for — including edge cases, error states, and adjacent behavior the user can see
- Any places where the plan's interpretation of the card looks like it may have drifted from what the card actually requires

Write this from what you found in the card, not as a generic description.]
</parameter>
</invoke>
```

## 3. Read Verdicts and Decide

Based on planner state:
- **Planner returned blocked**: Document in comment, add `blocked` tag, commit. Complete Step 4: Tear Down Team, then **STOP** — do not proceed to implementation.

After all evaluator subagents return, read the `VERDICT:` line from each. The decision is determined by their verdicts, not your own assessment of the findings:

- **APPROVED**: Every dispatched evaluator returned `VERDICT: APPROVED` — proceed to Step 3.3: Seed Task Graph.
- **CHANGES_REQUESTED**: Any evaluator returned `VERDICT: CHANGES_REQUESTED` — go to Step 3.1: Revise the Plan. You may not override an evaluator's verdict, reclassify a finding as a "limitation" or "follow-up," or document it as a known issue in lieu of revising the plan.
- **BLOCKED**: An external constraint prevents addressing a `CHANGES_REQUESTED` finding — document the constraint and the specific finding in a comment, add `blocked` tag, commit. Complete Step 4: Tear Down Team, then **STOP**.

Approval is the evaluators' call. Your role is to route findings to the planner and re-dispatch, not to decide which findings count.

### 3.1 Revise the Plan

Resume the planner with both agents' findings:

```xml
<invoke name="SendMessage">
  <parameter name="to">planner</parameter>
  <parameter name="summary">Plan revision findings</parameter>
  <parameter name="message">
[Compose from both agents' findings — which concerns require revision, what to change, and what to preserve]
  </parameter>
</invoke>
```

A finding may only be left unaddressed if revising the plan to resolve it would invalidate the approach, or if an external constraint prevents revision. "Follow-up candidate," "known limitation," and "out of scope" are not valid reasons — if the evaluator raised it, the evaluator closes it at re-evaluation, or the run goes to **BLOCKED**.

Wait for the planner to return, then go to Step 3.2: Resume Evaluation Agents.

### 3.2 Resume Evaluation Agents

Re-identify the primary plan file:

```bash
git -C [CARD_REPO_PATH] log --format="" --name-only -- plan/ | grep '\.md$' | head -1
```

Then send a message to each evaluation agent. Each agent retains its prior findings and knows how to triage them — the message should deliver what only the orchestrator knows. Compose each message separately; do not route one agent's findings through the other.

**plan-failure-mode**: Deliver the technical revision context:
- The current primary plan file (`[PLAN_FILE]`), and whether it differs from the prior round
- What the planner changed — which sections were added, removed, or restructured, and where to focus deeper
- How the planner responded to technical findings — which concerns were addressed, which deferred, and whether any fix addresses the symptom but not the root cause
- New interfaces, contracts, data flows, or dependencies the revision introduced that were not in scope in the prior round

```xml
<invoke name="SendMessage">
  <parameter name="to">plan-failure-mode</parameter>
  <parameter name="summary">Plan revision — technical context</parameter>
  <parameter name="message">
[Compose per the bullet points above]
  </parameter>
</invoke>
```

**plan-design**: Deliver the design revision context:
- The current primary plan file (`[PLAN_FILE]`), and whether it differs from the prior round
- Which user-outcome concerns the planner addressed, described in terms of what the user would now experience — not what plan text changed, but what the user outcome is now
- Which acceptance criteria gaps or intent drift findings were not addressed and why
- New design decisions the revision introduced and what user outcome they would produce if executed

```xml
<invoke name="SendMessage">
  <parameter name="to">plan-design</parameter>
  <parameter name="summary">Plan revision — design context</parameter>
  <parameter name="message">
[Compose per the bullet points above]
  </parameter>
</invoke>
```

Wait for all agents to return, then return to Step 3: Read Verdicts and Decide.

### 3.3 Seed Task Graph

Send a final message to the planner to seed the card's task graph from the approved plan:

```xml
<invoke name="SendMessage">
  <parameter name="to">planner</parameter>
  <parameter name="summary">Seed task graph</parameter>
  <parameter name="message">
Load the `runtime:card-task-creator` skill and follow its `<instructions>` to create the card's task graph from the approved plan.
  </parameter>
</invoke>
```

Wait for the planner to return, then proceed to Step 4: Tear Down Team.

## 4. Tear Down Team

This step runs on every exit path from Step 3 (success, BLOCKED verdict, planner-blocked). Tier 1 runs never reach this step — they skip directly to Step 5: Route to Implementation.

Delete the team:

```xml
<invoke name="TeamDelete" />
```

Based on Step 3 outcome:
- **Planner-blocked or BLOCKED verdict**: **STOP** — do not proceed to implementation.
- **Approved (from Step 3.3)**: Proceed to Step 5: Route to Implementation.

## 5. Route to Implementation

Read `gates.planRequired` from `CARD.meta.json`.

Based on the outcome:

- **Tier 1 (no plan)**: Load the `runtime:card-implementation` skill and follow its instructions.
- **Approved and planRequired**: **STOP** — plan submitted for approval. Do not modify gates in `CARD.meta.json`.
- **Approved and not planRequired**: Load the `runtime:card-implementation-with-plan` skill and follow its instructions.

</instructions>
