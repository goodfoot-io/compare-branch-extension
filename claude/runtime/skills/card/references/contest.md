# Parallel Planner Contest

Tier 3 and tier 4 orchestration: dispatch multiple sonnet planners in parallel, hold the contest open until every live plan is approved and no planner is mid-revision, then have the reviewer select the strongest qualifier.

Approval is the *qualifying bar*, not the finish line. A previously-approved plan can lose its approval if a question raised by a peer's plan retroactively surfaces a hole — `APPROVED` is sticky-but-revocable. There is no settlement handshake: a planner that holds approval and is not revising is done. You decide closure by looking at the contest's state, not by collecting confirmations.

<definitions>

**Live planner.** A planner that has not DM'd `PLAN: BLOCKED for:planner-N` and has not been ruled `VERDICT: BLOCKED for:planner-N` by the reviewer. The set of live planners shrinks over the contest as planners self-quit or are disqualified.

**Most recent DM.** When multiple DMs of the same shape exist for the same subject (e.g., several `VERDICT:` DMs for `planner-1 round-1`), "most recent" means the latest one in your inbound history. A later DM for the same subject supersedes earlier ones — this is how revocation works: a `VERDICT: CHANGES_REQUESTED for:planner-N round-K` DM that arrives after a `VERDICT: APPROVED for:planner-N round-K` revokes the earlier approval.

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

Dispatch `[N_PLANNERS]` planner subagents in parallel, named `planner-1`, `planner-2`, ... `planner-[N_PLANNERS]`. Each writes its own plan file at `plan/[AGENT_NAME].md`.

**Incumbent seeding.** If un-approved plan files already exist in `plan/` (e.g., a tier-2 `plan/initial.md` that never reached approval), pick the most substantive one and seed `planner-1` with it as the **incumbent**: `git mv` the file to `plan/planner-1.md` (and its `.meta.json` sidecar) before dispatch, and add an `## Incumbent Role` section to `planner-1`'s prompt below directing it to defend or refine that plan rather than draft from scratch. Skip seeding when the pre-existing plan is thin or clearly off-track — treat it as discarded prior art and run a normal contest. Other planners draft fresh as challengers either way; they may read the incumbent's file like any other peer plan.

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

Follow the `runtime:card-planner` skill from the top — it is the canonical source for the contest protocol, including round-numbered `PLAN: READY` DMs, the post-approval revise-or-stay-put choice, and shutdown handling.

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

Process inbound DMs from planners and the reviewer. Maintain a per-planner state machine in conversation context — round, verdict, live status — updated as each DM arrives. The state-line marker on each inbound DM tells you what changed. Teammates who are uncertain about state will DM you with plain-language questions; answer from your in-memory state, or ask the relevant teammate yourself if you need to verify.

Each planner moves along the state machine:

```
PLANNING → READY round-K ⇄ APPROVED round-K
                ↓
                CHANGES_REQUESTED round-K → revise → READY round-K+1

BLOCKED is terminal — entered by self-DM'd `PLAN: BLOCKED` or by the
reviewer's `VERDICT: BLOCKED for:planner-N` ruling.
```

`APPROVED` is sticky-but-revocable: a question raised later by a peer's plan can drop an approved planner back into the revision loop. A planner that holds approval and is not revising has nothing more to send — that is what "done" looks like.

### Closure — Judgment, Not a Handshake

Close the contest when every planner in the live set holds `APPROVED` for its most recent `PLAN: READY round-K` and none is under an outstanding `CHANGES_REQUESTED` without a later `PLAN: READY round-K+1`. A planner that revises after approval does not announce it — it just revises and later DMs a new `PLAN: READY round-K+1`. So "approved and silent" is indistinguishable from "approved and quietly revising," and you do not need to tell them apart: closing is safe even if a planner was mid-revision, because its next `PLAN: READY` reopens the field before any winner is finalized (Step 5). When several DMs share the same subject, the latest supersedes earlier ones — that is how revocation works.

You can see every open revision from your own inbound history; you do not need planners to certify the peer field back to you. A planner that holds approval and has gone quiet is done. An approved set with nothing in flight is closeable now — proceed to Step 5: Trigger Selection. If you find yourself tracking which peer round each planner has read, or waiting for a confirmation while a usable set of approved plans already exists, that is the signal to close, not to keep monitoring.

The only things that legitimately reopen a closeable field: a planner choosing to revise because a peer's plan changed its answer to a real risk (it DMs a new `PLAN: READY round-K+1`), or the reviewer retroactively revoking an approval. Absent one of those, do not wait.

**Lone-survivor case** is the special case where the live set has exactly one element: closure reduces to the survivor holding `APPROVED` for its most recent `PLAN: READY` round. You still trigger Step 5 — the reviewer's lone-survivor branch names the survivor without comparison.

### Other Outcomes from Step 4

- **All planners blocked.** No viable plan. Document the blocking reasons in a card comment, add the `blocked` tag, commit. Skip to Step 6: End the Contest with no winner, then return `BLOCKED` to the caller.
- **Contest in progress.** A live planner is mid-revision or under an outstanding `CHANGES_REQUESTED`. Continue monitoring. Do not intervene.
- **Stalled planner.** A live planner stuck under `CHANGES_REQUESTED` without revising holds the contest open. The reviewer holds the disqualification authority and may BLOCK them per §5.1 of `runtime:card-plan-failure-mode`; you do not BLOCK planners yourself. You may DM the planner to ask its intent if its state is genuinely unclear to you.

Do not adjudicate findings. Route on the contest state you can see.

### Answering State Questions

Teammates may DM you with plain-language questions about contest state — peer rounds, who is live. Answer in plain language from the contest state you track. Examples:

- "What is planner-2's current round?" → "planner-2 is at round-3, APPROVED."
- "Is planner-4 still live?" → "No, planner-4 was BLOCKED by the reviewer in round 2."

If a question requires verification beyond what you know directly (e.g., "is planner-2 about to emit a new round?"), DM that planner to ask, then synthesize a response to the original asker. Most questions resolve from your own state.

## 5. Trigger Selection

Send the reviewer a DM requesting selection. The marker `SELECT_WINNER` goes in `summary`; the body is empty or notes the closure-condition state for context.

```xml
<invoke name="SendMessage">
  <parameter name="to">plan-failure-mode</parameter>
  <parameter name="summary">SELECT_WINNER</parameter>
  <parameter name="message">Every live plan is approved and nothing is in flight; please run the final retroactive pass and name a winner.</parameter>
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
