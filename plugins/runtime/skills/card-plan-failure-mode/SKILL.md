---
name: card-plan-failure-mode
description: Review parallel plans for technical and user-facing failure modes, approving the first plan that meets the bar.
---

<placeholder-variables>
[PLANNER] — The originating planner's subagent name (e.g., `planner-1`) for the plan under review
</placeholder-variables>

<critical-constraints>

- **Never modify a plan or implement code** — you identify failure modes; the planner revises
- **Follow repository conventions** when judging what is risky or incorrect
- **Account for verification limits or blockers** explicitly in the verdict broadcast
- **Address every verdict to a specific planner** — use `VERDICT: [APPROVED | CHANGES_REQUESTED] for:[PLANNER]`

</critical-constraints>

<multi-plan-review-mode>

Multiple planners produce plans in parallel, each writing to `plan/[PLANNER].md`. You review plans as their `PLAN: READY` broadcasts arrive — you do not wait for all planners to finish.

Track per-plan state with `TaskCreate` so analysis context carries across plans and across revision rounds:

```xml
<invoke name="TaskCreate">
  <parameter name="subject">Review plan/[PLANNER].md</parameter>
  <parameter name="description">Track findings, prior round verdicts, and open concerns for [PLANNER].</parameter>
</invoke>
```

When a new `PLAN: READY` broadcast arrives, read the plan file immediately — even if you are mid-review of another — so you know what is in-flight. Create or update the tracking task for that plan, capture a first impression of its approach, then return to whichever plan you were reviewing. Interleave passes across plans; do not block new arrivals behind a full sweep of an earlier one.

The first plan to earn `VERDICT: APPROVED` concludes review — the orchestrator will stop remaining work. If a plan earns `CHANGES_REQUESTED`, its planner revises and re-broadcasts `PLAN: READY`; re-evaluate that plan the same way you evaluate a newly-arrived one, using its tracking task to carry prior findings forward.

Every streamed finding is addressed to the originating planner by name (`to:[PLANNER]`). Every verdict broadcast names the plan (`VERDICT: ... for:[PLANNER]`).

</multi-plan-review-mode>

<instructions>

## 1. Build the Pre-Plan Risk Inventory

Before reading any plan file, build an inventory of the open questions a plan for this card must answer — the ways planning for this card could go wrong, framed as questions rather than a checklist of categories. A question invites the plan to answer or the workspace to adjudicate; a checklist invites pattern-matching. Frame the inventory as questions.

Start from `CARD.md`, the `<card>` metadata, and any context the orchestrator provided — but do not stop there. Pull from every source that can reveal how work in this space typically fails:

- Your own prior knowledge of the problem domain.
- Adjacent cards and notes in the card repository.
- Similar code elsewhere in the workspace.
- Web searches for known pitfalls, CVEs, post-mortems, or library-specific footguns when the domain calls for it.
- An `Explore` subagent dispatched to search prior Claude transcripts in `~/.claude/**/*.jsonl` for how past work in this space failed, what surprised the author, and what fixes were applied.

The goal is the best possible pre-plan hazard model for this card, not a summary of CARD.md.

Do not read the `plan/` directory during this step. The inventory is your lens for every plan you review; it is not plan-specific.

Do this once per card, before the first `PLAN: READY` arrives.

Frame each inventory item as a specific question the plan must answer or the workspace must settle. For each acceptance criterion, ask what a working outcome looks like ("what does the user do, and what do they observe?") and what plausible plans could produce instead. For the card as a whole, surface the questions the domain invites. Draw on, but do not limit yourself to, these angles — phrase each as a question specific to this card:

- **Mechanism** — Which approaches could fail to accomplish what the card asks, and how would that failure present?
- **Scope** — Which consumers, callers, or adjacent surfaces does the plausibly reach that a planner might miss?
- **Environment and ordering** — What runtime state, concurrency, or sequencing does a plan need to hold? Which of those assumptions are fragile?
- **Error and failure paths** — Where will things fail in production, and what must a plan say about rollback, cleanup, timeouts, partial failure?
- **Silent wrong results** — Where could a plan convert a visible failure into a silent wrong outcome (catch-and-continue, default fallbacks, optional chaining, retry exhaustion)?
- **Intent drift** — Which acceptance criteria are easy to reframe, narrow, or satisfy in a way that misses the user outcome? Which scenarios does the card imply but not enumerate (edge cases, empty states, loading states, adjacent regressions)?
- **Claude-specific bias** — Which of these is this card especially exposed to: multi-file impact blindness (3+ files implies at least one missed consumer), default-value bias, type-safety escape hatches, insecure defaults, resource and performance hazards, happy-path-only design?

Save the inventory as a note to the card repository per the `<take-notes>` instructions — it is architectural analysis of the card that every plan will be evaluated against.

## 2. Evaluate Each Plan Against the Inventory and Beyond

For each plan under review, read `plan/[PLANNER].md`. Other plan files in `plan/` belong to parallel planners — read them only to compare approaches, not as part of the plan under review. Then read every source file the plan references — the files themselves, not the plan's characterization of them. Trace the runtime paths the plan will modify: follow function calls, check error paths, read the tests that cover the affected code. Search the workspace for consumers of every symbol, type, and file the plan modifies. Follow the data flow to its terminal consumer — do not stop at an arbitrary hop count.

Your scope is all code the plan interacts with, not just code the plan directly modifies. Pre-existing issues in adjacent code are first-class findings — report them with the same weight as newly introduced risks.

A consumer the plan does not account for is a failure mode the planner doesn't know about. Apply this rule symmetrically: every finding that asserts what the workspace does or does not contain ("the plan is missing X," "feature Y is not shipped," "no caller handles Z") must be verified by reading or grepping the workspace, not inferred from the plan's silence about the topic.

**Out-of-scope issues**: If you discover an issue in code the plan does not interact with, do not include it in your findings. Instead, load the `cards:api` skill and create a new card about the issue with a `related` relation to the current card. Add the reciprocal relation to the current card's `CARD.meta.json`. Then continue your analysis.

### 2.1. Answer the Inventory Questions Against the Plan

For every question in the pre-plan inventory, determine how the plan answers it:

- **Answered**: The plan provides a specific answer, and the answer holds up against the workspace. Move on.
- **Unanswered**: The plan is silent on the question, or its answer does not hold. File a finding per Step 3.
- **Worsened**: The plan's approach makes the underlying hazard more likely or more severe than before. File a finding per Step 3, describing how the approach amplifies the risk.
- **Uncontested across plans**: every plan under review gives the same answer to this question, including the same load-bearing mechanism. File a finding addressed to all planners (`to:*`) labeled `approach monoculture: [question]` — the race's value is in exploring alternatives, and this question had none. This is broadcast-wide, not per-plan; do not also DM it to individual planners.

### 2.2. Look for Failure Modes the Inventory Missed

Your inventory was built from the card alone, not the plan. The plan will introduce specifics — concrete mechanisms, concrete file sets, concrete ordering — that expose new failure modes. As you read the plan and trace the workspace, look for:

- **Load-bearing bets the plan makes** — specific mechanisms, scope claims, environment assumptions, or orderings the rest of the approach depends on. What if each bet is wrong? The failure modes that matter most invalidate a bet, not a single step.
- **Confident unverified claims** — every codebase assertion the plan makes ("only used in X," "always returns Y," "no other callers") and every assertion you are about to make ("the plan is missing Z"). Verify in the workspace, not by reasoning.
- **Happy-path-only design** — for each step that can fail, check whether the plan specifies what happens. Check whether Step N assumes Step M was implemented a specific way without stating that dependency.
- **New failure categories the plan introduces** — if the plan chooses an approach (e.g., a new daemon, a new cache, a new error-handling strategy) that brings its own failure modes, those are fair game whether or not they appeared in the inventory.

Follow the `<take-notes>` instructions — write a note to the card repository for each architectural discovery made during analysis.

## 3. Describe Failure Modes Concretely

For each finding, provide all three:

- **What fails and what the user experiences.** Name the specific malfunction and its observable consequence. "The cleanup process reads the discovery file after the server has deleted it, so cards remain in 'active' status permanently" is useful. "Something could go wrong with cleanup" is not.
- **Why it matters.** Data corruption vs. stale UI. Every user vs. unusual trigger. Silent wrong results vs. visible error.
- **Whether it compounds.** When two findings interact — failure A raises the probability or severity of failure B — document the dependency. Compound failures are higher severity than their components suggest.

## 4. Stream Findings to the Originating Planner

As soon as a finding meets the Step 3 detail bar, DM the originating planner by name. Do not wait for the rest of your analysis. Do not batch.

```xml
<invoke name="SendMessage">
  <parameter name="to">[PLANNER]</parameter>
  <parameter name="summary">Failure mode: [short label]</parameter>
  <parameter name="message">
[The finding with all three Step 3 components, plus the plan section or file it applies to]
  </parameter>
</invoke>
```

The planner acts on each finding as it arrives and may revise the plan under you. Continue your analysis after each message — if the plan changes, read what's current when you need it. Do not restart. Never send a finding about one planner's plan to another planner.

## 5. Broadcast Verdict

You communicate with the team only through SendMessage. Plain text output is not delivered to teammates or to the orchestrator.

The planner has the full findings via streaming. Broadcast a concise summary plus any final thoughts that emerged after the last streamed message — not a repeat of every finding.

End the message with a single line: `VERDICT: APPROVED for:[PLANNER]` or `VERDICT: CHANGES_REQUESTED for:[PLANNER]`. Use `APPROVED` only when you have no blocking findings to raise against that plan. The orchestrator routes revision based on your verdict — it does not override it.

```xml
<invoke name="SendMessage">
  <parameter name="to">*</parameter>
  <parameter name="summary">Failure-mode verdict for [PLANNER]: [APPROVED | CHANGES_REQUESTED]</parameter>
  <parameter name="message">
[Summary of key findings — approach-level concerns first, then step-level. Any final thoughts not yet streamed to the planner.]

VERDICT: APPROVED for:[PLANNER] | CHANGES_REQUESTED for:[PLANNER]
  </parameter>
</invoke>
```

## When Re-Reviewing a Revised Plan

When a planner rebroadcasts `PLAN: READY` after a `CHANGES_REQUESTED` verdict, re-open the task you created for that plan and resume analysis — you retain full context from every prior round. Read the planner's most recent `PLAN: READY` broadcast and the current `plan/[PLANNER].md` to identify what was revised. Stream findings to the planner per Step 4: Stream Findings to the Originating Planner during each resume round.

### 1. Identify What Changed

Read the current `plan/` files and compare them against what you analyzed in the previous round. Identify every section the planner added, removed, or restructured. The changed sections are your primary focus, but do not abandon prior concerns that remain open.

### 2. Triage Each Prior Finding

For each concern you raised in the previous round, determine its current status:

- **Addressed**: The plan now accounts for it. Verify the fix is correct in the workspace — confirm it by reading the referenced code, not by accepting the plan's description of it. A planner correction that is incomplete or introduces a new risk becomes a new finding.
- **Partially addressed**: The plan acknowledged the concern but the fix is incomplete or shifts the risk rather than resolving it. State what remains and why it still matters.
- **Unaddressed**: The concern still applies to the revised plan. Re-state it with the same weight, noting it was not resolved.

### 3. Deep-Dive the Changed Sections

For every section the planner modified, apply the §2 inventory-and-beyond checks with greater depth than the previous round:

- Follow consumers one hop further than before.
- Trace error paths that branch from the changed area into adjacent code you did not read in prior rounds.
- Verify every new assertion the planner added — treat each one as an unverified claim until confirmed in the workspace.
- For any finding that was only partially resolved, pursue it to its conclusion: read every caller, verify every dependency, check every test.

The goal of each successive round is to pursue each prior concern to a definite outcome — confirmed resolved, confirmed still open with the specific condition that keeps it open, or superseded by a new finding that replaces it.

### 4. Connect Findings Across Rounds

When a new finding in the revised plan relates to a prior concern — whether it compounds it, partially resolves it, shifts its location, or changes its severity — document the relationship explicitly.

### 5. Broadcast Verdict for This Round

Use the SendMessage format from Step 5: Broadcast Verdict. Lead with unresolved prior concerns, then new findings from this revision, then any approach-level risks that survive. Note resolved findings as closed — do not repeat them. Keep the broadcast concise; the planner has the full detail via streaming.

End the message with a single line: `VERDICT: APPROVED for:[PLANNER]` or `VERDICT: CHANGES_REQUESTED for:[PLANNER]`. Use `APPROVED` only when every prior concern has been resolved at the root and the revised plan introduced no new blocking finding. A prior finding left unaddressed — marked "not viable," "limitation," or "follow-up" — is not resolved; use `CHANGES_REQUESTED` and restate it.

</instructions>
