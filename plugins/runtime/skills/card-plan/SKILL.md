---
name: card-plan
description: Spawn the planning team and wait for the planner to signal completion or failure.
---


<instructions>

## 1. Create Team

```xml
<invoke name="TeamCreate">
<parameter name="team_name">plan-[CARD_ID]</parameter>
<parameter name="description">[CARD_ID]: planning and review</parameter>
</invoke>
```

## 2. Spawn Agents

Spawn all three agents in parallel via the `Agent` tool:

```xml
<invoke name="Agent">
<parameter name="description">Plan creation and revision</parameter>
<parameter name="subagent_type">runtime:card:planner</parameter>
<parameter name="model">opus</parameter>
<parameter name="team_name">plan-[CARD_ID]</parameter>
<parameter name="name">planner</parameter>
<parameter name="prompt">
Create and refine an implementation plan for this card.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

Read the card from the card repository. Create the plan, investigate uncertainties, submit for review, and revise until approved or blocked. Signal the outcome to the team lead when done.
</parameter>
</invoke>
```

```xml
<invoke name="Agent">
<parameter name="description">Plan maintainer review</parameter>
<parameter name="subagent_type">runtime:card:plan-maintainer</parameter>
<parameter name="model">opus</parameter>
<parameter name="team_name">plan-[CARD_ID]</parameter>
<parameter name="name">maintainer</parameter>
<parameter name="prompt">
Review this implementation plan for quality and completeness.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

Wait for the planner to submit the plan for review. For every claim the plan makes about the codebase, search the workspace to confirm or refute it — do not evaluate claims by reasoning about them. Send a review report per your instructions.
</parameter>
</invoke>
```

```xml
<invoke name="Agent">
<parameter name="description">Failure mode analysis</parameter>
<parameter name="subagent_type">runtime:card:plan-failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="team_name">plan-[CARD_ID]</parameter>
<parameter name="name">plan-failure-mode</parameter>
<parameter name="prompt">
Identify potential failure modes in this implementation plan.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

Wait for the planner to submit the plan for review. Read the workspace source files the plan references — then search the workspace for consumers of every symbol, type, and file the plan modifies. The failure modes live in the gap between the plan's model and the system's actual behavior.
</parameter>
</invoke>
```

## 3. Wait for Completion

Wait for the planner to signal completion or failure.

Based on the planner's signal:
- **Approved**: Proceed to Step 4.
- **Blocked**: Document in comment, add `blocked` tag, commit, proceed to Step 4.

## 4. Shut Down Team

Send shutdown requests to all three agents. Wait for acknowledgment before deleting the team:

```xml
<invoke name="SendMessage">
<parameter name="to">planner</parameter>
<parameter name="message">Review complete.</parameter>
</invoke>
```

```xml
<invoke name="SendMessage">
<parameter name="to">maintainer</parameter>
<parameter name="message">Review complete.</parameter>
</invoke>
```

```xml
<invoke name="SendMessage">
<parameter name="to">plan-failure-mode</parameter>
<parameter name="message">Review complete.</parameter>
</invoke>
```

After all agents have shut down:

```xml
<invoke name="TeamDelete"/>
```

**STOP** — Do not proceed to implementation. Do not modify gates in `CARD.meta.json`.

</instructions>
