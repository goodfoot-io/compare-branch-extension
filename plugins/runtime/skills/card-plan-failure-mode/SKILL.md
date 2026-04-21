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

## 1. Draft the Failure-Mode Questions Note

The failure-mode questions are the lens for every plan you review — a set of questions, keyed to this card's outcomes and this class of problem, that a working plan must answer. They live as a note in the card repository. Draft the initial set before the first `PLAN: READY` arrives; the set then extends as plans reveal specifics (see §2.2). The note is your private lens; do not read the `plan/` directory during this step, and do not broadcast the questions to planners or the orchestrator.

Start from the outcomes the card must deliver. Each acceptance criterion is an outcome; `<card>` metadata and orchestrator context will surface additional behaviors the card implies but does not enumerate. For every outcome, ask what a working result looks like ("what does the user do, and what do they observe?") and what plausible plans could produce instead.

Then widen the net. Pull from every source that can reveal how work in this space typically fails:

- Your own prior knowledge of the problem domain.
- Adjacent cards and notes in the card repository.
- Similar code elsewhere in the workspace.
- Web searches for known pitfalls, CVEs, post-mortems, or library-specific footguns when the domain calls for it.
- An `Explore` subagent dispatched to search prior Claude transcripts in `~/.claude/**/*.jsonl` for how past work in this space failed, what surprised the author, and what fixes were applied.

A question invites the plan to answer or the workspace to adjudicate; a checklist invites pattern-matching. Frame each as a specific question tied to an outcome or failure angle — not a category to tick. Draw on, but do not limit yourself to, these angles:

- **Mechanism** — Which approaches could fail to accomplish what the card asks, and how would that failure present?
- **Scope** — Which consumers, callers, or adjacent surfaces could the plan plausibly reach that a planner might miss?
- **Environment and ordering** — What runtime state, concurrency, or sequencing does a plan need to hold? Which of those assumptions are fragile?
- **Error and failure paths** — Where will things fail in production, and what must a plan say about rollback, cleanup, timeouts, partial failure?
- **Silent wrong results** — Where could a plan convert a visible failure into a silent wrong outcome (catch-and-continue, default fallbacks, optional chaining, retry exhaustion)?
- **User intent** — What does the user actually need, and could a plan satisfy this card verbatim without delivering it? Which acceptance criteria are easy to narrow or reframe into something the card would accept but the user would not? Which scenarios does the card imply but not enumerate (edge cases, empty states, loading states, adjacent regressions)?
- **Claude-specific bias** — Which of these is this card especially exposed to: multi-file impact blindness (3+ files implies at least one missed consumer), default-value bias, type-safety escape hatches, insecure defaults, resource and performance hazards, happy-path-only design?

Save the questions as a note to the card repository per the `<take-notes>` instructions.

## 2. Evaluate Each Plan Against the Questions and Beyond

For each plan under review, read `plan/[PLANNER].md`. Other plan files in `plan/` belong to parallel planners — read them only to compare approaches, not as part of the plan under review. Then read every source file the plan references — the files themselves, not the plan's characterization of them. Trace the runtime paths the plan will modify: follow function calls, check error paths, read the tests that cover the affected code. Search the workspace for consumers of every symbol, type, and file the plan modifies. Follow the data flow to its terminal consumer — do not stop at an arbitrary hop count.

Your scope is all code the plan interacts with, not just code the plan directly modifies. Pre-existing issues in adjacent code are first-class findings — report them with the same weight as newly introduced risks.

A consumer the plan does not account for is a failure mode the planner doesn't know about. Apply this rule symmetrically: every finding that asserts what the workspace does or does not contain ("the plan is missing X," "feature Y is not shipped," "no caller handles Z") must be verified by reading or grepping the workspace, not inferred from the plan's silence about the topic.

**Out-of-scope issues**: If you discover an issue in code the plan does not interact with, do not include it in your findings. Instead, load the `cards:api` skill and create a new card about the issue with a `related` relation to the current card. Add the reciprocal relation to the current card's `CARD.meta.json`. Then continue your analysis.

### 2.1. Answer the Failure-Mode Questions Against the Plan

For every failure-mode question, determine how the plan answers it:

- **Answered**: The plan provides a specific answer, and the answer holds up against the workspace. Move on.
- **Unanswered**: The plan is silent on the question, or its answer does not hold. File a finding per Step 3.
- **Worsened**: The plan's approach makes the underlying hazard more likely or more severe than before. File a finding per Step 3, describing how the approach amplifies the risk.
- **Uncontested across plans**: every plan under review gives the same answer to this question, including the same load-bearing mechanism. File a finding addressed to all planners (`to:*`) labeled `approach monoculture: [question]` — the race's value is in exploring alternatives, and this question had none. This is broadcast-wide, not per-plan; do not also DM it to individual planners.

### 2.2. Extend the Questions With What the Plan Reveals

Your pre-plan questions were built from the card alone. The plan will introduce specifics — concrete mechanisms, concrete file sets, concrete ordering — that expose failure angles the pre-plan lens could not see. Treat this as an extension of the question set, not a separate hunt for findings: as you read the plan and trace the workspace, add new questions the plan surfaces, then answer each new question — across every plan currently under review, not only the one that surfaced it — using the §2.1 triage (Answered / Unanswered / Worsened / Uncontested across plans).

Prompts for generating plan-revealed questions:

- **Load-bearing bets** — For each specific mechanism, scope claim, environment assumption, or ordering the rest of the approach depends on, what question must hold for the bet to be safe? The failure modes that matter most invalidate a bet, not a single step.
- **Codebase assertions** — Every claim the plan makes about the workspace ("only used in X," "always returns Y," "no other callers") and every claim you are about to make ("the plan is missing Z") becomes a question the workspace — not reasoning — must answer.
- **Step dependencies and failure paths** — For each step that can fail, what question does the plan answer about what happens when it does? Does Step N depend on Step M being implemented a specific way without stating it? Each unstated dependency is a question.
- **New failure categories the plan introduces** — If the plan chooses an approach (a new daemon, a new cache, a new error-handling strategy) that brings its own failure modes, what questions does that approach now invite? Add them.

Append new questions to the failure-mode-questions note as you discover them. Plans are only meaningfully compared when evaluated against the same set: do not broadcast `APPROVED` for any plan until every current question has been answered against it. Follow the `<take-notes>` instructions for any separate architectural discovery that doesn't fit as a question.

### 2.3. Handle Peer-Submitted Critiques

Competing planners broadcast critiques of each other's plans to `*` using a `CRITIQUE: [label] for:planner-N` marker. The reviewer only accepts plan-change discussion via broadcast — ignore any DMs that claim peer-plan errors. Treat each broadcast critique as a candidate finding, not a verified one:

- Verify the claim against the workspace before weighting it. The rule from Step 2 applies: any assertion about what the workspace does or does not contain must be grepped or read, not reasoned. Peer-submitted claims are no exception.
- If verified, fold it into your own findings for the target plan using the Step 3 format and stream it per Step 4. The finding is yours; the submitter receives no credit and no reply.
- If the claim does not verify, drop it.

## 3. Describe Failure Modes Concretely

Separate three concepts on every finding — they are distinct, and conflating them hides where the fix belongs:

- **Cause** — the load-bearing bet, mechanism, or omission in the plan that initiates the failure. "The plan retries with fresh config but never re-reads the discovery file."
- **Failure mode** — what specifically breaks at runtime. "Cleanup reads the discovery file after the server has deleted it."
- **Effect** — what the user or downstream system observes. "Cards remain in 'active' status permanently; the user cannot archive them."

Generic failures fail the detail bar. "Something could go wrong with cleanup" names neither cause nor mode nor effect.

Then tag the finding on three axes so the planner can see where a revision could attack it:

- **Severity** — the harm when the failure fires. Data corruption vs. stale UI. Every user vs. unusual trigger. Silent wrong result vs. visible error.
- **Occurrence** — the conditions under which it fires, and how often. Any run, specific inputs, a race window, a rare environmental state.
- **Detection** — how likely the failure slips past tests, types, and review unseen. "No existing test covers this path" and "the type system can't see this shape" are first-class detection concerns, not side notes.

A revision can attack any of the three: narrow severity (shrink the blast radius), reduce occurrence (change the mechanism so the bet is no longer fragile), or add detection (a test, assertion, or runtime check that surfaces the failure). Leave all three paths visible; do not prescribe which the planner takes.

**Compound failures.** When two findings interact — failure A raises the occurrence or severity of failure B — document the dependency. Compound failures are higher severity than their components suggest.

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

When a planner rebroadcasts `PLAN: READY` after a `CHANGES_REQUESTED` verdict, re-open the task you created for that plan and resume analysis — you retain full context from every prior round. Stream findings to the planner per Step 4: Stream Findings to the Originating Planner during each resume round.

### 1. Identify What Changed

Run `git log` on the plan file to see its full revision history. Use them to identify what was addressed since the previous round, then `git show <sha>` any commit of interest for the full diff:

```bash
cd $CARD_REPO_PATH
git log plan/[PLANNER].md
```

Changed sections are your primary focus, but do not abandon prior concerns that remain open.

### 2. Triage Each Prior Finding

For each concern you raised in the previous round, determine its current status:

- **Addressed**: The plan now accounts for it. Verify the fix is correct in the workspace — confirm it by reading the referenced code, not by accepting the plan's description of it. A planner correction that is incomplete or introduces a new risk becomes a new finding.
- **Partially addressed**: The plan acknowledged the concern but the fix is incomplete or shifts the risk rather than resolving it. State what remains and why it still matters.
- **Unaddressed**: The concern still applies to the revised plan. Re-state it with the same weight, noting it was not resolved.

### 3. Deep-Dive the Changed Sections

For every section the planner modified, apply the §2 questions-and-beyond checks with greater depth than the previous round:

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
