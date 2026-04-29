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

You are one of several planners competing for the reviewer's approval. Only one plan wins; the winning plan is your reward. The rules of the competition:

- **Every research finding is broadcast to `*` as soon as you have it** (Step 2).
- **Every critique of a peer plan is broadcast to `*`** (§4.3). The reviewer picks up critiques from the public stream; it does not accept DMs about plan changes.
- **Revisions to your own plan go in your plan file**, committed with a single sentence summarizing the change (§4.1). The reviewer reads your commits.

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

- **Plan ready**: Summarize the plan's intent and key decisions. Include a short, semantically descriptive slug the team lead can use to rename the file (e.g., `initial`, `phase-2`, `schema-first`).
- **Blocked**: State the blocking reason clearly. Do not continue revising against an unresolvable obstacle.

End the message with a single line: `PLAN: READY` or `PLAN: BLOCKED`.

```xml
<invoke name="SendMessage">
  <parameter name="to">*</parameter>
  <parameter name="summary">Plan state: [READY | BLOCKED]</parameter>
  <parameter name="message">
[Summary of plan and key decisions, or the blocking reason]

Suggested slug: [slug]

PLAN: READY | BLOCKED
  </parameter>
</invoke>
```

Do not proceed to implementation. Do not modify gates in `CARD.meta.json`.

## 4. Handle Incoming Messages

After Step 3, continue to handle incoming messages until the team lead tears down the team. Route by message type.

### 4.1 Streamed Finding from the Reviewer

The `plan-failure-mode` reviewer DMs findings as it discovers them, before any verdict broadcast. Act on each finding immediately — do not wait for the verdict:

- Understand the concern and whether the plan's approach addresses it. Each finding arrives tagged on three axes: severity (harm when it fires), occurrence (conditions under which it fires), and detection (how likely it slips past tests and review).
- Route empirically-testable uncertainties through the `runtime:spike` skill before revising.
- For each finding, decide which axis to attack: reduce **occurrence** (change the mechanism so the bet is no longer fragile), narrow **severity** (shrink the blast radius), or add **detection** (a test, assertion, or runtime check that surfaces the failure).
- Revise `[PLAN_FILE]` directly and commit. Write the commit message as a single sentence per `<card-repo-commit-style>` that summarizes the change. The reviewer reads commits when re-reviewing — the commit message is the record of how the finding was addressed. Do not narrate the revision in a reply.

Do not re-broadcast `PLAN: READY` after each streamed revision. The broadcast is reserved for Step 4.2, so the reviewer re-evaluates against the finalized plan rather than an in-flight state. If the reviewer finishes analyzing and finds every concern already addressed, it will broadcast `VERDICT: APPROVED for:[AGENT_NAME]` directly and Step 4.2 never fires.

### 4.2 Revision Trigger from the Reviewer

When the reviewer broadcasts `VERDICT: CHANGES_REQUESTED for:[AGENT_NAME]` and DMs you to finalize, any finding not already addressed under Step 4.1 is now in scope. Work through the remaining findings using the same decision rubric as Step 4.1, commit any additional revisions, then return to Step 3: Broadcast Plan State to broadcast `PLAN: READY` again.

If every streamed finding was already addressed under Step 4.1, the only remaining work is the broadcast itself — return to Step 3 directly.

### 4.3 Peer Broadcasts

Peer `FINDING:` broadcasts are workspace truth — use them as you would your own research.

Peer `PLAN: READY` broadcasts open two moves, both legitimate:

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

The reviewer picks up critiques from the broadcast stream and verifies them before folding into findings. The target planner sees the critique too — that is part of the sport. A peer's `PLAN: READY` does not obligate you to re-broadcast — only the reviewer's verdicts drive the revision loop.

</instructions>
