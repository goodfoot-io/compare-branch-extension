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

Every subagent spawned in this step joins the team by passing `team_name=card-plan-[CARD_ID]`.

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
**IMPORTANT: Load the `runtime:card-planner`, `cards:markdown`, and `cards:notes` skills immediately.**

Create an implementation plan for this card.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

Read the card from the card repository. Create the plan and investigate uncertainties.
</parameter>
</invoke>
```

Proceed to Step 3: Read Verdicts and Decide.

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
**IMPORTANT: Load the `runtime:card-planner`, `cards:markdown`, and `cards:notes` skills immediately.**

Create an implementation plan for this card.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

Read the card from the card repository. Create the plan and investigate uncertainties.
</parameter>
</invoke>
```

After the planner returns, check the planner's broadcast:
- **PLAN: BLOCKED**: Proceed to Step 3: Read Verdicts and Decide.
- **PLAN: READY**: Identify the primary plan file:

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
  **IMPORTANT: Load the `runtime:card-plan-failure-mode` and `cards:notes` skills immediately.**

  Identify potential failure modes in this implementation plan.

  ## Card Repository
  [CARD_REPO_PATH]

  ## Workspace
  [WORKSPACE_PATH]

  The primary plan file is `[PLAN_FILE]`. Focus your analysis on it; read other files in `plan/` for context. Read every source file the plan references, then search the workspace for consumers of every symbol, type, and file the plan modifies.

  Also evaluate the plan's design from the user's perspective: would the plan, if executed correctly, deliver the outcomes the card requires? Look for intent drift between the card and the plan, design choices that would produce wrong user outcomes even when implemented faithfully, and user-facing scenarios the plan doesn't account for.
  </parameter>
  </invoke>
  ```

Proceed to Step 3: Read Verdicts and Decide.

### Tier 4

Spawn the planner in background mode first, wait for it to return, then spawn `plan-failure-mode` and `plan-design` subagents in parallel:

```xml
<invoke name="Agent">
<parameter name="description">Plan creation</parameter>
<parameter name="subagent_type">runtime:card:planner</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">planner</parameter>
<parameter name="team_name">card-plan-[CARD_ID]</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
**IMPORTANT: Load the `runtime:card-planner`, `cards:markdown`, and `cards:notes` skills immediately.**

Create an implementation plan for this card.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

Read the card from the card repository. Create the plan and investigate uncertainties.
</parameter>
</invoke>
```

After the planner returns, check the planner's broadcast:
- **PLAN: BLOCKED**: Proceed to Step 3: Read Verdicts and Decide.
- **PLAN: READY**: Identify the primary plan file and read the plan and card before composing the evaluator prompts:

  ```bash
  git -C [CARD_REPO_PATH] log --format="" --name-only -- plan/ | grep '\.md$' | head -1
  ```

  Each prompt must reflect the specific nature of this plan and this card. Spawn both agents in parallel in background mode:

```xml
<invoke name="Agent">
<parameter name="description">Plan failure-mode analysis</parameter>
<parameter name="subagent_type">runtime:card:plan-failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">plan-failure-mode</parameter>
<parameter name="team_name">card-plan-[CARD_ID]</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
**IMPORTANT: Load the `runtime:card-plan-failure-mode` and `cards:notes` skills immediately.**

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
**IMPORTANT: Load the `runtime:card-plan-design` and `cards:notes` skills immediately.**

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

Proceed to Step 3: Read Verdicts and Decide.

## 3. Read Verdicts and Decide

Based on planner broadcast:
- **PLAN: BLOCKED**: Document in comment, add `blocked` tag, commit. Complete Step 4: Tear Down Team, then **STOP** — do not proceed to implementation.
- **PLAN: READY and no evaluators dispatched (tier 2)**: Proceed to Step 4: Tear Down Team.
- **PLAN: READY and evaluators dispatched (tier 3–4)**: Continue to evaluator verdict evaluation below.

After all evaluators broadcast verdicts, read the `VERDICT:` line from each broadcast. The decision is determined by their verdicts, not your own assessment of the findings:

- **All APPROVED**: Proceed to Step 4: Tear Down Team.
- **Any CHANGES_REQUESTED**: Send a revision trigger to the planner:

  ```xml
  <invoke name="SendMessage">
    <parameter name="to">planner</parameter>
    <parameter name="summary">Revision requested</parameter>
    <parameter name="message">
  Evaluators have broadcast `VERDICT: CHANGES_REQUESTED`. Finalize any outstanding revisions from the streamed findings, then broadcast `PLAN: READY`.
    </parameter>
  </invoke>
  ```

  Wait for the planner to broadcast `PLAN: READY`, then send a re-evaluation trigger to each evaluator dispatched in Step 2:

  ```xml
  <invoke name="SendMessage">
    <parameter name="to">plan-failure-mode</parameter>
    <parameter name="summary">Plan revised — re-evaluate</parameter>
    <parameter name="message">The planner has revised the plan. Re-evaluate based on your prior findings.</parameter>
  </invoke>
  ```

  ```xml
  <invoke name="SendMessage">
    <parameter name="to">plan-design</parameter>
    <parameter name="summary">Plan revised — re-evaluate</parameter>
    <parameter name="message">The planner has revised the plan. Re-evaluate based on your prior findings.</parameter>
  </invoke>
  ```

  Wait for all evaluators to re-broadcast verdicts, then return to Step 3: Read Verdicts and Decide.

- **BLOCKED** (external constraint prevents addressing a `CHANGES_REQUESTED` finding): Document the constraint and the specific finding in a comment, add `blocked` tag, commit. Complete Step 4: Tear Down Team, then **STOP**.

Do not override an evaluator's verdict, reclassify a finding as a "limitation" or "follow-up," or document it as a known issue in lieu of revising the plan.

## 4. Tear Down Team

This step runs on every exit path from Step 3 (success, BLOCKED verdict, planner-blocked). Tier 1 runs never reach this step — they skip directly to Step 5: Route to Implementation.

Delete the team:

```xml
<invoke name="TeamDelete" />
```

Based on Step 3 outcome:
- **Planner-blocked or BLOCKED verdict**: **STOP** — do not proceed to implementation.
- **Approved**: Proceed to Step 5: Route to Implementation.

## 5. Route to Implementation

Read `gates.planRequired` from `CARD.meta.json`.

Based on the outcome:

- **Tier 1 (no plan)**: Load the `runtime:card-implementation` skill and follow its instructions.
- **Approved and planRequired**: **STOP** — plan submitted for approval. Do not modify gates in `CARD.meta.json`.
- **Approved and not planRequired**: Load the `runtime:card-implementation-with-plan` skill and follow its instructions.

</instructions>
