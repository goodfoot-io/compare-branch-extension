# Parallel Planner Race

Tier 3 and tier 4 orchestration: dispatch multiple sonnet planners in parallel, let a shared reviewer approve the first plan that meets the bar, then clean up the losers.

<placeholder-variables>
[CARD_ID] — The card identifier, used to scope the planning team's name
[N_PLANNERS] — Number of parallel planners (2 for tier 3, 4 for tier 4)
[WINNING_PLANNER] — The `planner-N` subagent whose plan earned `VERDICT: APPROVED` first
[WINNING_SLUG] — Semantically descriptive slug chosen from the winner's `PLAN: READY` broadcast (e.g., `initial`, `phase-2`, `schema-first`)
</placeholder-variables>

<instructions>

## 1. Create the Planning Team

```xml
<invoke name="TeamCreate">
  <parameter name="team_name">card-plan-[CARD_ID]</parameter>
  <parameter name="description">Planning race for card [CARD_ID]</parameter>
</invoke>
```

## 2. Dispatch the Planners

Dispatch `[N_PLANNERS]` planner subagents in parallel, named `planner-1`, `planner-2`, ... `planner-[N_PLANNERS]`. Each writes its own plan file at `plan/[AGENT_NAME].md`:

```xml
<invoke name="Agent">
<parameter name="description">Plan creation</parameter>
<parameter name="subagent_type">runtime:card:planner</parameter>
<parameter name="model">sonnet</parameter>
<parameter name="name">planner-[N]</parameter>
<parameter name="team_name">card-plan-[CARD_ID]</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
**IMPORTANT: Load the `runtime:card-planner`, `cards:markdown`, and `cards:notes` skills immediately.**

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

Read the card from the card repository. Create a plan at `plan/[AGENT_NAME].md`, investigate uncertainties, and broadcast research findings to the team as you work. Other planners are working in parallel — cheating off their broadcasts and plan files is encouraged.
</parameter>
</invoke>
```

## 3. Dispatch the Reviewer

Dispatch exactly one `plan-failure-mode` subagent in parallel with the planners. It reviews each plan as its `PLAN: READY` broadcast arrives:

```xml
<invoke name="Agent">
<parameter name="description">Plan failure-mode review (multi-plan)</parameter>
<parameter name="subagent_type">runtime:card:plan-failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">plan-failure-mode</parameter>
<parameter name="team_name">card-plan-[CARD_ID]</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
**IMPORTANT: Load the `runtime:card-plan-failure-mode` and `cards:notes` skills immediately.**

[N_PLANNERS] planners are working on parallel plans for this card. Each writes to `plan/planner-N.md` and broadcasts `PLAN: READY` when ready.

Follow the skill from the top. Review each plan as its `PLAN: READY` broadcast arrives, stream findings to the originating planner, and broadcast `VERDICT: APPROVED for:planner-N` or `VERDICT: CHANGES_REQUESTED for:planner-N` per plan. The first `APPROVED` verdict concludes review; the orchestrator will then stop remaining work.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]
</parameter>
</invoke>
```

## 4. Monitor the Race

Watch team broadcasts. Track each planner's most recent state and the reviewer's verdicts. Three outcomes are possible:

- **First `VERDICT: APPROVED for:planner-N` arrives**: Record `[WINNING_PLANNER] = planner-N`. Proceed to Step 5: End the Race.
- **All planners broadcast `PLAN: BLOCKED`**: The race has no viable plan. Document the blocking reasons in a card comment, add the `blocked` tag, commit. Proceed to Step 5: End the Race with no winner, then return `BLOCKED` to the caller.
- **`CHANGES_REQUESTED` verdicts for some or all planners**: This is the normal revision loop — planners revise on streamed findings and re-broadcast `PLAN: READY`, the reviewer re-evaluates. Continue monitoring. Do not intervene.

The orchestrator does not adjudicate findings. It routes on the reviewer's verdict line. A planner whose plan earns `CHANGES_REQUESTED` stays in the race and may still win on a later round.

## 5. End the Race

This step runs on every exit path from Step 4 (winner, all-blocked, any BLOCKED verdict).

Send a shutdown request to every still-running subagent in the team:

```xml
<invoke name="SendMessage">
  <parameter name="to">[each live planner-N and plan-failure-mode]</parameter>
  <parameter name="message">{"type": "shutdown_request"}</parameter>
</invoke>
```

Wait for all teammates to shut down before proceeding.

If there is a winner, promote the winning plan and delete the losers. Choose `[WINNING_SLUG]` from the winner's `PLAN: READY` broadcast summary — use a semantically descriptive slug (e.g., `initial`, `phase-2`, `schema-first`). Then:

```bash
cd $CARD_REPO_PATH
git mv plan/[WINNING_PLANNER].md plan/[WINNING_SLUG].md
git mv plan/[WINNING_PLANNER].md.meta.json plan/[WINNING_SLUG].md.meta.json
git rm plan/planner-*.md plan/planner-*.md.meta.json  # removes losing plan files only
git commit -m "[single sentence summarizing the winning approach]"
```

Tear down the team:

```xml
<invoke name="TeamDelete" />
```

## 6. Return to Caller

- **Winner**: return `APPROVED` so the caller routes to implementation.
- **All planners blocked or no viable plan**: return `BLOCKED`.

</instructions>
