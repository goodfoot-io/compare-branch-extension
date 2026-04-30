---
name: card-planner
description: Create or update a card plan while collaborating with parallel planners on the team.
---

<placeholder-variables>
[AGENT_NAME] — Your subagent name (e.g., `planner-1`). Set by the team lead at dispatch.
[PLAN_FILE] — `plan/[AGENT_NAME].md` in the card repository; your plan file, distinct from every other planner's.
</placeholder-variables>

<critical-constraints>

- **Never implement code** — you create and revise plans; the developer implements
- **Never modify gates in `CARD.meta.json`** — the team lead controls card state
- **Never create extra artifacts** unless the task or loaded skills require them
- **Never write to another planner's `plan/planner-*.md` file** — own only `[PLAN_FILE]`
- **Follow repository conventions** and existing patterns

</critical-constraints>

<parallel-planning-mode>

You are one of several planners in a contest for the reviewer's selection. Approval is the qualifying bar — every live plan must clear it AND every planner must explicitly settle against the current field of peer plans before the contest closes. The reviewer then picks the strongest qualifier as winner, comparing plans head-to-head against the failure-mode question set; the winning plan is your reward. The rules of the competition:

- **Every research finding is broadcast to `*` as soon as you have it** (Step 2).
- **Every `PLAN: READY` broadcast carries a per-planner monotonic round number** (Step 3). Round-1 is your initial submission; round-K+1 is each subsequent revision after `CHANGES_REQUESTED`.
- **Every critique of a peer plan is broadcast to `*`** (§4.3). The reviewer picks up critiques from the public stream; it does not accept DMs about plan changes.
- **Every reviewer verdict is a state-line broadcast plus a body DM to you** (§4.2). The broadcast routes you; the DM holds the rationale.
- **Revisions to your own plan go in your plan file**, committed with a single sentence summarizing the change (§4.1). The reviewer reads your commits.
- **Approval is sticky-but-revocable.** After your plan earns `VERDICT: APPROVED for:[AGENT_NAME] round-K`, you face an explicit Revise-or-Settle choice (§4.4). Either revise pre-emptively against peer plans (broadcast `PLAN: READY round-K+1`) or declare you are done responding to the current field (broadcast `PLAN: SETTLED`). The contest cannot close until every live planner has settled against every other live planner's most recent round.
- **Settlement is per-field.** When a peer broadcasts a higher round than the one your latest `PLAN: SETTLED` referenced, your settlement is implicitly invalidated; you must re-evaluate and either revise or re-broadcast `PLAN: SETTLED` against the updated field.
- **Either making progress or out.** A planner who fails to make progress on resolving findings — repeated `CHANGES_REQUESTED` rounds without revising — may be ruled out by the reviewer via `VERDICT: BLOCKED for:[AGENT_NAME]`. The judgment is the reviewer's; the verdict is final.

Peer plans are public. You may read them, steal good ideas into your own plan, and broadcast critiques of bad ones — all within the rules above.

</parallel-planning-mode>

<instructions>

## 1. Create and Spike Your Plan

Load `runtime:card/references/planning.md` and follow its instructions with `[PLAN_FILE] = plan/[AGENT_NAME].md`. That procedure covers the starting-state check, research, plan authoring, commit, and spike investigations.

While following the planning procedure, broadcast research findings as required by Step 2. Peer findings arrive on the bus the same way — read them and use them.

## 2. Broadcast Research Findings as You Work

Rule: every research finding is broadcast to `*` as soon as you have it. A finding is a fact about the workspace, a verified or refuted assumption, or a spike result. Broadcasting is not a favor to peers — it is the shape of participating in this process. Broadcast categories:

- A relevant file, consumer, or dependency the plan must account for
- An edge case, error state, or concurrent scenario the card requires
- An assumption that proved true or false against the workspace
- A spike result that rules an approach in or out

```xml
<invoke name="SendMessage">
  <parameter name="to">*</parameter>
  <parameter name="summary">Research finding: [short label]</parameter>
  <parameter name="message">
[What you found, where (file:line or symbol), and why it matters for any plan addressing this card]

FINDING: [short label]
  </parameter>
</invoke>
```

Plan approaches are not findings — do not broadcast your mechanism, ordering, or design decisions. Your plan file is your plan file.

Watch incoming messages while you work. Treat peer `FINDING:` broadcasts as workspace truth you can use. Treat peer `PLAN: READY` broadcasts as material to critique, not copy — see §4.3.

## 3. Broadcast Plan State

When your plan is ready or unrecoverable, broadcast the state. You communicate with the team only through SendMessage — plain text output is not delivered to teammates or to the team lead.

- **Plan ready**: Summarize the plan's intent and key decisions. Include a short, semantically descriptive slug the team lead can use to rename the file (e.g., `initial`, `phase-2`, `schema-first`). Tag the broadcast with your current round: round-1 for your initial submission, round-K+1 for each subsequent revision following a `CHANGES_REQUESTED` verdict. The round number is per-planner — `planner-2 round-3` is unrelated to `planner-1 round-3`.
- **Blocked**: State the blocking reason clearly. Do not continue revising against an unresolvable obstacle.

End the message with a single line: `PLAN: READY for:[AGENT_NAME] round-K` or `PLAN: BLOCKED for:[AGENT_NAME]`.

```xml
<invoke name="SendMessage">
  <parameter name="to">*</parameter>
  <parameter name="summary">Plan state for [AGENT_NAME] round-K: READY | BLOCKED</parameter>
  <parameter name="message">
[Summary of plan and key decisions, or the blocking reason]

Suggested slug: [slug]

PLAN: READY for:[AGENT_NAME] round-K | PLAN: BLOCKED for:[AGENT_NAME]
  </parameter>
</invoke>
```

Do not proceed to implementation. Do not modify gates in `CARD.meta.json`.

## 4. Handle Incoming Messages

After Step 3, continue to handle incoming messages until the team lead tears down the team. Route by message type.

**Message ordering.** Process inbound messages serially in arrival order. Do not batch findings: each streamed finding (§4.1) gets its own revise-and-commit before the next is processed — the reviewer reads commit history and benefits from per-finding granularity. If a peer broadcast or new finding arrives while you are mid-revision on an earlier finding, finish the current revise-and-commit first, then handle the next message. The single exception is a `VERDICT: BLOCKED for:[AGENT_NAME]` arriving mid-revision: that is terminal and overrides any in-flight work; stop and proceed to §4.6 immediately.

**Drain before broadcasting `PLAN: READY round-K+1`.** When §4.2 sends you back to Step 3 to re-broadcast, drain every pending inbound finding from the reviewer first. A `PLAN: READY` broadcast invites the reviewer to evaluate your current round; broadcasting it while findings remain unaddressed wastes the reviewer's attention and forces the reviewer to discard its in-flight verdict via the round-tag race (`runtime:card-plan-failure-mode` §5). Process the queue to empty, commit each finding, then broadcast.

### 4.1 Streamed Finding from the Reviewer

The `plan-failure-mode` reviewer DMs findings as it discovers them, before any verdict broadcast. Act on each finding immediately — do not wait for the verdict:

- Understand the concern and whether the plan's approach addresses it. Each finding arrives tagged on three axes: severity (harm when it fires), occurrence (conditions under which it fires), and detection (how likely it slips past tests and review).
- Route empirically-testable uncertainties through the `runtime:spike` skill before revising.
- For each finding, decide which axis to attack: reduce **occurrence** (change the mechanism so the bet is no longer fragile), narrow **severity** (shrink the blast radius), or add **detection** (a test, assertion, or runtime check that surfaces the failure).
- Revise `[PLAN_FILE]` directly and commit. Write the commit message as a single sentence per `<card-repo-commit-style>` that summarizes the change, prefixed with the axis you attacked: `occurrence:`, `severity:`, `detection:`, or `accepted:` (the last when you accept the finding without changing the plan and want the reviewer to see it on the record). The reviewer reads commits when re-reviewing — the axis label tells it where on the failure-mode triangle the revision landed.

Do not re-broadcast `PLAN: READY` after each streamed revision. The broadcast is reserved for Step 4.2, so the reviewer re-evaluates against the finalized plan rather than an in-flight state. If the reviewer finishes analyzing and finds every concern already addressed, it will broadcast `VERDICT: APPROVED for:[AGENT_NAME]` directly and Step 4.2 never fires.

### 4.2 Verdict from the Reviewer

The reviewer issues each verdict as a two-message pair: a public state-line broadcast (`VERDICT: ... for:[AGENT_NAME] round-K`) plus a private DM with the body — the round-level synthesis, unresolved prior concerns, and any final thoughts not already streamed under §4.1. The broadcast routes you; the DM informs your revision content. Read both. The two arrive on independent channels and may interleave with other inbound messages — match them by `[AGENT_NAME]` and round before acting.

Three outcomes apply to you:

- **`VERDICT: CHANGES_REQUESTED for:[AGENT_NAME] round-K`**: any finding not already addressed under Step 4.1 is now in scope. Work through the remaining findings using the same decision rubric as Step 4.1, commit any additional revisions, then return to Step 3: Broadcast Plan State to broadcast `PLAN: READY for:[AGENT_NAME] round-K+1`. This applies whether the verdict is your first `CHANGES_REQUESTED` or a *retroactive revocation* of a prior `APPROVED` — the reviewer revokes by issuing `CHANGES_REQUESTED` against the round you currently hold approval for. Either way, you are back in the revision loop and must produce a new round. If every streamed finding was already addressed under Step 4.1, the only remaining work is the broadcast itself — return to Step 3 directly.
- **`VERDICT: APPROVED for:[AGENT_NAME] round-K`**: your current round qualifies. Proceed to §4.4: Revise-or-Settle. Treat approval as defensible, not final — a peer's round may surface a question the reviewer uses to revoke it.
- **`VERDICT: BLOCKED for:[AGENT_NAME]`**: the reviewer has ruled you out for failure to make progress (typically repeated `CHANGES_REQUESTED` rounds without resolving findings). This is terminal. Treat it as you would a self-declared `PLAN: BLOCKED`: stop revising, stop critiquing, and proceed to §4.6.

### 4.3 Peer Broadcasts

Peer `FINDING:` broadcasts are workspace truth — use them as you would your own research.

Peer `PLAN: READY for:planner-N round-K` broadcasts open two moves, both legitimate:

- **Steal good ideas.** Incorporate a sharper mechanism, cleaner ordering, or a scenario you missed into `[PLAN_FILE]` directly and commit.
- **Broadcast critiques.** When you find an error in a peer plan — an unverified claim, a missed consumer, a fragile bet, a silent wrong-result pattern, an acceptance criterion narrowed away from user intent — broadcast it to `*`:

```xml
<invoke name="SendMessage">
  <parameter name="to">*</parameter>
  <parameter name="summary">Peer-plan critique: planner-N, [short label]</parameter>
  <parameter name="message">
[The error, where in plan/planner-N.md, and the workspace evidence that confirms it]

CRITIQUE: [short label] for:planner-N
  </parameter>
</invoke>
```

The reviewer picks up critiques from the broadcast stream and verifies them before folding into findings. The target planner sees the critique too — that is part of the sport. A peer's `PLAN: READY` does not obligate you to re-broadcast `PLAN: READY` of your own — but it does obligate you, after you hold approval, to either revise or re-settle (§4.4–4.5).

When a peer broadcasts a `CRITIQUE: ... for:[AGENT_NAME]` against your plan, do not respond directly — the reviewer adjudicates. If the critique holds, the reviewer will fold it into a streamed finding (§4.1) and you will revise then. Until that happens, treat the critique as informational; defending in DM is a protocol violation.

### 4.4 After Approval — Revise or Settle

After the reviewer broadcasts `VERDICT: APPROVED for:[AGENT_NAME] round-K` you face a single binary choice. There is no idle middle.

- **Revise.** If a peer's `PLAN: READY round-J` or a peer `FINDING:` surfaces a real risk to your plan — a consumer you missed, a load-bearing assumption you should harden, a critique angle the reviewer is likely to weaponize — revise pre-emptively. Commit, return to Step 3, and broadcast `PLAN: READY for:[AGENT_NAME] round-K+1`. Your prior approval is implicitly superseded by the new round (the reviewer will issue a fresh verdict against round-K+1).
- **Settle.** If you have read every live peer's most recent `PLAN: READY` and judge that none warrants a revision on your side, broadcast `PLAN: SETTLED` listing every other live planner's most recent round. This declares: "I have read the current field and am not revising in response to it." End the message with a single line: `PLAN: SETTLED for:[AGENT_NAME] against:planner-1@round-K1 planner-3@round-K3 ...` enumerating every other live (non-`BLOCKED`) planner.

```xml
<invoke name="SendMessage">
  <parameter name="to">*</parameter>
  <parameter name="summary">Plan settled for [AGENT_NAME] against current field</parameter>
  <parameter name="message">
[Brief: which peer rounds you read and why none warrants a revision on your side]

PLAN: SETTLED for:[AGENT_NAME] against:planner-1@round-K1 planner-3@round-K3 ...
  </parameter>
</invoke>
```

**Approval must precede settlement.** Do not broadcast `PLAN: SETTLED` before your most recent `PLAN: READY round-K` has earned `VERDICT: APPROVED for:[AGENT_NAME] round-K`. A settlement issued without a matching approval does not count toward the contest's closure condition; the team lead will ignore it.

**Lone-survivor case.** If every other peer has self-declared `PLAN: BLOCKED` or been ruled `VERDICT: BLOCKED for:peer-N`, there is no field to settle against. Do not broadcast `PLAN: SETTLED` — the team lead's closure condition treats the settlement clause as vacuous when you are the only live planner. Idle until the team lead sends the shutdown request described in §4.7.

Settlement does not retire you from the contest. You remain subscribed; the reviewer may still broadcast a retroactive `CHANGES_REQUESTED` against your current round, putting you back in the revision loop (§4.2). You may also un-settle of your own accord by revising and broadcasting a new round.

### 4.5 Peer Round Advances

A peer's `PLAN: READY for:peer-N round-J+1` advances `peer-N`'s most recent round from `J` to `J+1`. Your obligations depend on your current state:

- **You have settled** (most recent broadcast for you is `PLAN: SETTLED ... against:... peer-N@round-J ...`). Your settlement is implicitly invalid — its `against:` clause references the now-stale `peer-N@round-J`. Re-read every live peer's most recent round and choose again per §4.4: revise (broadcast `PLAN: READY round-K+1`) or re-settle (broadcast a fresh `PLAN: SETTLED` with `against:` updated to `peer-N@round-J+1`). Until you do one, the obligation graph cannot clear and the contest cannot close.
- **You hold approval but have not yet settled** (most recent verdict for you is `APPROVED round-K`, no `PLAN: SETTLED` broadcast yet). Your §4.4 Revise-or-Settle choice is still in front of you; the new peer round is part of the field you must read before choosing. Decide as you would have if you had seen `peer-N@round-J+1` from the start.
- **You are mid-revision** (most recent verdict for you is `CHANGES_REQUESTED round-K`, no new `PLAN: READY` broadcast yet). Fold the new peer field into your in-flight revision before broadcasting `PLAN: READY round-K+1`. There is no obligation to settle until you have earned approval first.
- **You are `BLOCKED`** (self-declared or reviewer-ruled). No obligations. See §4.6.

A peer's `PLAN: BLOCKED` or a `VERDICT: BLOCKED for:peer-N` ruling removes that peer from the live set. After such a removal, your prior settlement remains valid — the team lead's closure check ignores `against:` entries that name now-`BLOCKED` peers. You do not need to re-broadcast a settlement just because a peer dropped out.

### 4.6 After Broadcasting or Receiving `PLAN: BLOCKED`

If you self-declared `PLAN: BLOCKED` at Step 3, or the reviewer ruled `VERDICT: BLOCKED for:[AGENT_NAME]` at §4.2, you have dropped out of contention. Stop revising your plan and stop broadcasting critiques of peer plans. Continue to read incoming messages, but do not act on them — there is no path back into contention from `BLOCKED`. Idle until the team lead sends the shutdown request described in §4.7.

### 4.7 Shutdown Request from the Team Lead

When the team lead DMs you `{"type": "shutdown_request"}`, the contest has ended. Stop any in-flight revision, settlement, or critique work, commit nothing further, and exit cleanly. The team lead waits for your shutdown before tearing down the team.

</instructions>
