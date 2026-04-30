# Parallel Planner Contest

Tier 3 and tier 4 orchestration: dispatch multiple sonnet planners in parallel, hold the contest open until every live plan is approved and every planner has settled against the current field, then have the reviewer select the strongest qualifier.

Approval is the *qualifying bar*, not the finish line. A previously-approved plan can lose its approval if a question raised by a peer's plan retroactively surfaces a hole — `APPROVED` is sticky-but-revocable. The contest does not wait on absence of activity; it waits on **explicit settlement**: every live planner DMs you a `PLAN: SETTLED` declaring that it has read the current field of peer plans and is not revising in response to it.

<definitions>

**Live planner.** A planner that has not DM'd `PLAN: BLOCKED for:planner-N` and has not been ruled `VERDICT: BLOCKED for:planner-N` by the reviewer. The set of live planners shrinks over the contest as planners self-quit or are disqualified.

**Most recent DM.** When multiple DMs of the same shape exist for the same subject (e.g., several `VERDICT:` DMs for `planner-1 round-1`), "most recent" means the latest one in your inbound history. A later DM for the same subject supersedes earlier ones — this is how revocation works: a `VERDICT: CHANGES_REQUESTED for:planner-N round-K` DM that arrives after a `VERDICT: APPROVED for:planner-N round-K` revokes the earlier approval.

**Round reference.** The format `planner-N@round-K` names the K-th round of `planner-N`. It appears in `PLAN: SETTLED ... against:` clauses to anchor a settlement to specific peer rounds. The grammar is `planner-N@round-K` separated by spaces; e.g., `against:planner-1@round-3 planner-3@round-1`.

**Settlement marker grammar.** The canonical form is `PLAN: SETTLED for:planner-N against:planner-X@round-K planner-Y@round-J ...`, where the `against:` list enumerates **every other live planner** at that planner's most recent `PLAN: READY` round. BLOCKED peers (self-blocked or reviewer-ruled) are omitted from the `against:` list — the closure check ignores them either way, but omitting keeps the marker tractable. In the lone-survivor case (only one live planner), the survivor does NOT emit `PLAN: SETTLED` at all; the closure check treats condition (2) as vacuously satisfied for the survivor.

</definitions>

<placeholder-variables>
[CARD_ID] — The card identifier, used to scope the planning team's name
[N_PLANNERS] — Number of parallel planners (2 for tier 3, 4 for tier 4)
[WINNING_PLANNER] — The `planner-N` subagent the reviewer named in its `WINNER:` DM
[WINNING_SLUG] — Semantically descriptive slug chosen from the winner's most recent `PLAN: READY` DM (e.g., `initial`, `phase-2`, `schema-first`)
</placeholder-variables>

<instructions>

## 1. Create the Planning Team

```xml
<invoke name="TeamCreate">
  <parameter name="team_name">card-plan-[CARD_ID]</parameter>
  <parameter name="description">Planning contest for card [CARD_ID]</parameter>
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

Read the card from the card repository. Create a plan at `plan/[AGENT_NAME].md`, investigate uncertainties, and DM research findings to the team as you work. Other planners are working in parallel — cheating off their findings and plan files is encouraged.

Follow the `runtime:card-planner` skill from the top — it is the canonical source for the contest protocol, including round-numbered `PLAN: READY` DMs, explicit `PLAN: SETTLED` DMs to the team lead, the post-approval Revise-or-Settle choice, and shutdown handling.

## Team Name
Your team is `card-plan-[CARD_ID]`. Roster discovery (`~/.claude/teams/card-plan-[CARD_ID]/config.json`) uses this exact name.
</parameter>
</invoke>
```

## 3. Dispatch the Reviewer

Dispatch exactly one `plan-failure-mode` subagent in parallel with the planners. It reviews each plan as its `PLAN: READY` DM arrives and remains active until the contest closes:

```xml
<invoke name="Agent">
<parameter name="description">Plan failure-mode review (multi-plan contest)</parameter>
<parameter name="subagent_type">runtime:card:plan-failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">plan-failure-mode</parameter>
<parameter name="team_name">card-plan-[CARD_ID]</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
**IMPORTANT: Load the `runtime:card-plan-failure-mode` and `cards:notes` skills immediately.**

[N_PLANNERS] planners are working on parallel plans for this card. Each writes to `plan/planner-N.md` and DMs round-numbered `PLAN: READY` updates as it revises.

Follow the skill from the top — it is the canonical source for the contest protocol, including round-tagged verdicts, retroactive approval revocation, the `BLOCKED for:planner-N` authority you hold over non-progressing planners, the `SELECT_WINNER` DM handler, and shutdown handling.

## Team Name
Your team is `card-plan-[CARD_ID]`. Roster discovery (`~/.claude/teams/card-plan-[CARD_ID]/config.json`) uses this exact name.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]
</parameter>
</invoke>
```

## 4. Monitor the Contest

Process inbound DMs from planners and the reviewer. Maintain a per-planner state machine in conversation context — round, verdict, settlement, live status — updated as each DM arrives. The state-line marker on each inbound DM tells you what changed. Teammates who are uncertain about state will DM you with plain-language questions; answer from your in-memory state, or ask the relevant teammate yourself if you need to verify.

Each planner moves along the state machine:

```
PLANNING → READY round-K ⇄ APPROVED round-K
                ↓                    ↓
                CHANGES_REQUESTED    SETTLED against:<peer round list>
                                     ↓
                                     (re-entered if peer round list advances)

BLOCKED is terminal — entered by self-DM'd `PLAN: BLOCKED` or by the
reviewer's `VERDICT: BLOCKED for:planner-N` ruling.
```

`APPROVED` is sticky-but-revocable. `SETTLED` is sticky-but-invalidated: when any peer DMs a higher round, every prior `PLAN: SETTLED` whose `against:` list referenced that peer's earlier round is implicitly unsettled, and the planner that issued it must either revise or re-DM `PLAN: SETTLED` against the updated round list.

### Closure Condition (Obligation Graph Clear)

The contest closes when, simultaneously:

1. Every planner in the live set has its most recent verdict equal to `APPROVED for:planner-N round-K` matching that planner's most recent `PLAN: READY round-K` (no pending revision against an earlier verdict), AND
2. Every planner in the live set has DM'd you a `PLAN: SETTLED for:planner-N` whose `against:` list, restricted to the live set, names every other live planner at exactly that planner's most recent round. Entries in the `against:` list that name now-`BLOCKED` planners are ignored — a settlement does not need to be re-DM'd just because a peer dropped out, only when a peer's round advances.

When several DMs share the same subject (e.g., several `VERDICT:` DMs for the same planner@round), the latest one supersedes earlier ones. This is how revocation works.

Both conditions are observable from your in-memory state machine alone — no clock, no quiescence window. The instant both clear, proceed to Step 5: Trigger Selection.

**Lone-survivor case** is the special case where the live set has exactly one element. Condition (2) is vacuously satisfied (no peers to settle against, so the `against:` clause is not required); condition (1) reduces to the survivor holding `APPROVED` for its most recent `PLAN: READY` round. The lone survivor's planner skill instructs it not to DM `PLAN: SETTLED` in this case — there is no field to settle against. The closure check accepts a vacuous condition (2) and proceeds to Step 5.

### Other Outcomes from Step 4

- **All planners blocked.** No viable plan. Document the blocking reasons in a card comment, add the `blocked` tag, commit. Skip to Step 6: End the Contest with no winner, then return `BLOCKED` to the caller.
- **Contest in progress.** Closure condition not yet clear. Continue monitoring. Do not intervene.
- **Stalled planner.** A live planner whose settlement was invalidated by a peer round advance and who has not re-DM'd `PLAN: READY round-K+1` or re-emitted `PLAN: SETTLED` for an extended period is stalling the obligation graph. You may DM the planner asking for its intent (revise or re-settle); if the planner is unresponsive or fails to progress across multiple such prompts, the reviewer holds the disqualification authority and may BLOCK them per §5.1 of `runtime:card-plan-failure-mode`. You do not BLOCK planners yourself.

Do not adjudicate findings. Do not impose closure. Route on your in-memory state machine.

### Answering State Questions

Teammates may DM you with plain-language questions about contest state — peer rounds, who is live, what settlements have been recorded. Answer in plain language from your in-memory state machine. Examples:

- "What is planner-2's current round?" → "planner-2 is at round-3, APPROVED."
- "Is planner-4 still live?" → "No, planner-4 was BLOCKED by the reviewer in round 2."
- "Who has settled and what against?" → list each settled planner and its `against:` clause.

If a question requires verification beyond what you know directly (e.g., "is planner-2 about to emit a new round?"), DM that planner to ask, then synthesize a response to the original asker. Most questions resolve from your own state.

Parsing `PLAN: SETTLED ... against:...` summaries: split on whitespace after `against:`, then each token is `planner-N@round-K`. The grammar is canonical (see `<definitions>`); no other separators appear in the `against:` clause.

## 5. Trigger Selection

Send the reviewer a DM requesting selection. The marker `SELECT_WINNER` goes in `summary`; the body is empty or notes the closure-condition state for context.

```xml
<invoke name="SendMessage">
  <parameter name="to">plan-failure-mode</parameter>
  <parameter name="summary">SELECT_WINNER</parameter>
  <parameter name="message">Closure condition cleared; please run final retroactive pass and name a winner.</parameter>
</invoke>
```

Two responses are possible:

- **`WINNER: planner-N` DM** from the reviewer: record `[WINNING_PLANNER] = planner-N`. Proceed to Step 6: End the Contest with a winner.
- **A fresh `VERDICT: CHANGES_REQUESTED for:planner-N round-K` DM** from the reviewer: the reviewer's final pass uncovered a question the plan no longer answers. The contest reopens — the affected planner is back in the revision loop, the closure condition no longer holds, and you return to Step 4: Monitor the Contest.

A reviewer that names a winner overrides any earlier `CHANGES_REQUESTED` for that planner — the `WINNER:` DM is the authoritative end signal.

## 6. End the Contest

This step runs on every exit path from Step 4 and Step 5 (winner, all-blocked, lone survivor).

Send a shutdown request to every still-running subagent in the team:

```xml
<invoke name="SendMessage">
  <parameter name="to">[each live planner-N and plan-failure-mode]</parameter>
  <parameter name="message">{"type": "shutdown_request"}</parameter>
</invoke>
```

Wait for all teammates to shut down before proceeding.

If there is a winner, promote the winning plan and delete every other plan file. Choose `[WINNING_SLUG]` from the winner's *most recent* `PLAN: READY` DM body — use a semantically descriptive slug (e.g., `initial`, `phase-2`, `schema-first`). Then run, with `[WINNING_PLANNER]` and `[WINNING_SLUG]` substituted in:

```bash
cd $CARD_REPO_PATH

# Promote the winner to a semantic slug
git mv plan/[WINNING_PLANNER].md plan/[WINNING_SLUG].md
git mv plan/[WINNING_PLANNER].md.meta.json plan/[WINNING_SLUG].md.meta.json

# Remove every other tracked file in plan/ — losing planner files AND any pre-existing
# un-approved plans (e.g., a tier-2 plan/initial.md that never reached approval). Only the
# winner's two files survive.
git ls-files plan/ \
  | grep -vE '^plan/[WINNING_SLUG]\.md(\.meta\.json)?$' \
  | xargs -r git rm

git commit -m "[single sentence summarizing the winning approach]"
```

Tear down the team:

```xml
<invoke name="TeamDelete" />
```

## 7. Return to Caller

- **Winner**: return `APPROVED` so the caller routes to implementation.
- **All planners blocked or no viable plan**: return `BLOCKED`.

</instructions>
