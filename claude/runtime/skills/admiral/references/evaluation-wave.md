# Evaluator Wave

Independent adversarial evaluation via background evaluator subagents. Entered from `./implementation-evaluation.md` Step 3 (or `./validate.md` Step 4) with changes committed, validation passing, and a clean tree.

<placeholder-variables>
[HEAD_SHA] — The commit under evaluation; the tree must be clean at dispatch
</placeholder-variables>

<instructions>

## 1. Dispatch Evaluators

Diff `implement/[CARD_ID]/baseline..HEAD`. **Choose which evaluators to dispatch by judgment**: `failure-mode` always; add `experience-evaluator` when the change materially touches user-facing behavior, acceptance criteria are experiential, or the card's value is only observable from its entry points. Dispatching both is "Deep"; adjust the peer lines in the prompts to match what you actually dispatch.

The evaluators form an ad-hoc group purely by being named, and run in the background so you can collect their DMs while they work. After DMing a round's `VERDICT:` an evaluator goes idle and stops on its own; your Step 5 re-evaluation DM wakes it with its prior context, resuming at its skill's "When Resuming for a Fixed Implementation" section.

Read the diff and the card before writing the prompts. Each prompt must reflect the specific nature of this implementation and this card. Record the HEAD SHA you dispatch against and inline it in every prompt. When dispatching both evaluators, place both invokes in a single message so they run concurrently.

```xml
<invoke name="Agent">
<parameter name="description">Failure mode analysis</parameter>
<parameter name="subagent_type">runtime:card:failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">failure-mode</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
Follow the skill from the top. Draft the failure-mode questions for this implementation, then evaluate against them. DM each finding as `FINDING:` to `team-lead` (and on Deep depth, also DM `experience-evaluator`); DM critiques of the experience-evaluator's findings directly to `experience-evaluator` as `CRITIQUE: <label>`; DM a `VERDICT: APPROVED` or `VERDICT: CHANGES_REQUESTED` to `team-lead` when analysis is complete. Every DM follows your skill's `<dm-envelope>`. The orchestrator DMs you a re-evaluation trigger after fix commits land — extend the questions, triage prior findings, and DM a new verdict.

## Peers
The orchestrator is `team-lead`. On Deep depth, your peer evaluator is `experience-evaluator`.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Evaluate commit [HEAD_SHA]; changes are `implement/[CARD_ID]/baseline..HEAD`. Never evaluate the working tree — if `git status --porcelain` is non-empty, DM `team-lead` a question naming the dirty paths, and yield.

## Validation
All validation has passed. Focus on runtime behavior, semantic failures, and gaps the validation suite does not cover.

[Describe the specific failure risks this implementation presents. Where does the diff suggest the implementer's attention was concentrated, and where are the blind spots most likely? Which runtime paths are unexercised by tests, which contracts may drift silently, and which consumer assumptions break? Write this from what you found in the diff and the card, not as generic instructions.]
</parameter>
</invoke>
```

For **Deep**, add the second dispatch in the same message:

```xml
<invoke name="Agent">
<parameter name="description">Experience evaluation</parameter>
<parameter name="subagent_type">runtime:card:experience-evaluator</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">experience-evaluator</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
Follow the skill from the top. Draft the user-outcome failure-mode questions, then evaluate by exercising the user entry points. DM each finding as `FINDING:` to `team-lead` and to `failure-mode`; DM critiques of the failure-mode evaluator's findings directly to `failure-mode` as `CRITIQUE: <label>`; DM a verdict to `team-lead` when analysis is complete. Every DM follows your skill's `<dm-envelope>`. The orchestrator DMs you a re-evaluation trigger after fix commits land — extend the questions, triage prior findings, and DM a new verdict.

## Peers
The orchestrator is `team-lead`. Your peer evaluator is `failure-mode`.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Evaluate commit [HEAD_SHA]; changes are `implement/[CARD_ID]/baseline..HEAD`. Never exercise the working tree — if `git status --porcelain` is non-empty, DM `team-lead` a question naming the dirty paths, and yield.

## Validation
All validation has passed. Focus on what a user would experience as broken, wrong, or missing that the validation suite does not cover.

[Translate the card's requirements into user scenarios this implementation must satisfy: acceptance criteria to verify, user-facing entry points, what a user testing against the card should do and observe. Write this from what you found in the card, not as a generic description.]
</parameter>
</invoke>
```

When an evaluator needs to compare behavior against the pre-implementation state, dispatch `runtime:card:pre-existing-condition` with the behavior under investigation and the card's diff scope rather than running the comparison in the active workspace — it reproduces on the baseline ref and returns the result.

## 2. Collect Verdicts and Route

Monitor inbound DMs from each evaluator:

- **`FINDING:` DM**: Record the finding (short label and body) so you can route it into a developer wave in Step 3 and, after fixes land, brief the evaluators on what changed. Keep what you need to do those two things — not a cross-referenced ledger.
- **`VERDICT:` DM**: Record the verdict for this round. From an `APPROVED` body, capture the open sub-blocking list (label + witness) — it is the pre-finalize sweep's only input.

Cross-evaluator critiques travel as evaluator-to-evaluator DMs and do not reach you. On Deep, evaluators also DM each other their `FINDING:` markers directly; you receive your own copy from each evaluator. A verified peer CRITIQUE arrives as a fresh `FINDING:` DM from the verifying evaluator. Do not deduplicate across evaluators — two evaluators may legitimately raise the same underlying issue from different angles.

Continue until every dispatched evaluator has DM'd a `VERDICT:` for the current round. Before accepting a `VERDICT: APPROVED`, confirm the evaluator's questions note (`failure-mode-questions` or `user-outcome-questions`) is committed in the card repo's `notes/`; if missing, DM the evaluator to publish the note and re-issue — an unnoted `APPROVED` does not count. A `CHANGES_REQUESTED` routes immediately; if its note is missing at round 1, add "publish your questions note before your next verdict" to that evaluator's Step 5 re-evaluation DM. Do not adjudicate findings — route on the verdict, not your assessment of the findings. You may not override a verdict, reclassify a finding as a "limitation" or "follow-up," or document it as a known issue in lieu of fixing it.

An `idle_notification` means the evaluator's process has stopped; it runs again only when an inbound message wakes it. Idle after DMing this round's `VERDICT:` is the normal settled state. Idle **without** it, the evaluator will never act again on its own — wake it with a DM that inlines whatever it is waiting on; task-notifications for work it delegated may be delivered to you, not to it, so forward those results in the wake-up DM.

An evaluator that yielded on a dirty tree is the exception. Commit or revert the outstanding changes, then wake it with the new HEAD SHA — never re-dispatch, which would re-open findings already accepted.

Otherwise, if it idles again without a verdict, or cannot run, re-dispatch a replacement (or BLOCKED per the branch below). Never re-dispatch without a failed wake attempt on record. A replacement is a fresh agent dispatched through Step 1 under the same name, evaluating current HEAD from scratch — point it at its lane's questions note in the card repo's `notes/`, inline the known prior-round findings for its lane, and state the round number it inherits (question-gating and the blocking threshold count per evaluation, not per agent instance).

A mixed set — one evaluator approves while another requests changes — is CHANGES_REQUESTED.

- **All APPROVED** (every dispatched evaluator): Proceed to Step 6: Finalize. This is the only path to Finalize.
- **Any CHANGES_REQUESTED**: Proceed to Step 3: Dispatch Developer Wave with the recorded findings. You do not fix evaluator findings — the developer wave does.
- **BLOCKED** (an evaluator names an external constraint preventing the fix): Document the constraint and the specific finding in a comment, add `blocked` to `tags` in `CARD.meta.json`, commit, then **STOP**.

## 3. Dispatch Developer Wave

Group the findings by coherence and dispatch per `./developer-wave.md` — its routing, dispatch constraints, and `<model-selection>` apply. Inline every finding a developer must address into its initial prompt (full body plus the file or runtime path it applies to); do not stream new findings to a running developer. Each developer owns the files its assigned findings touch. Developers are **not** part of the evaluation group and receive no follow-up SendMessages. Add to each prompt's Guidelines: a fix introducing a new mechanism lands with a regression test for it and an end-to-end exercise of the mechanism composed with what it touches; report each such witness (mechanism → test/command) on return.

## 4. Validate and Commit

Apply `./developer-wave.md`'s `<group-validation-gate>`: wait for the whole wave, fold back any stray commits, lint/typecheck/scoped-test, then commit — or fix mechanical wave errors inline, or discard and re-dispatch on implementation errors. Confirm every new mechanism the wave introduced carries its regression test and composed exercise; one without them is an implementation error — re-dispatch.

If you arrived from the caller's pre-evaluation validation failure, return there; otherwise proceed to Step 5.

## 5. Trigger Re-Evaluation

DM a re-evaluation trigger to every dispatched evaluator (both DMs in a single message on Deep). The evaluator holds its own findings in context. Give it the new HEAD SHA, the commit range, a plain account of what the wave changed and why, and anything the wave could *not* fix.

```xml
<invoke name="SendMessage">
  <parameter name="to">failure-mode</parameter>
  <parameter name="summary">Re-evaluate against revised implementation</parameter>
  <parameter name="message">
RE_EVALUATE
---
The implementation has been updated to address the prior round's findings. Re-evaluate against commit [HEAD_SHA]; the tree is clean at that commit.

Fix commits: implement/[CARD_ID]/baseline..HEAD (this wave: [SHA list])
What changed and why: [a plain account — which findings the wave addressed and how, in enough detail to re-check]
New witnesses: [mechanism → test/command, for each new mechanism the wave introduced — omit if none]
Not fixed: [any finding the wave could not address, and why — omit if none]
  </parameter>
</invoke>
```

Each evaluator resumes and DMs a fresh verdict. Return to Step 2. The loop continues until every evaluator DMs `APPROVED`, or a BLOCKED branch fires.

## 6. Finalize

Enter only when every dispatched evaluator has DM'd `VERDICT: APPROVED` for the current round.

**Pre-finalize sweep.** If sub-blocking findings or witness repairs remain open (the lists from the `APPROVED` bodies), dispatch one final developer wave for them per Step 3, scoped to the listed findings' own files — no discretionary refactoring. Validate and commit per `./developer-wave.md`'s gate — do **not** route into Step 5 — then re-run each repaired witness yourself and confirm the expected result, and run the caller's validation commands. If a witness re-run fails or validation cannot pass, fall back to Step 5 — the only path from the sweep into a re-evaluation round. Skip the sweep when nothing is open.

Evaluators that DM'd `VERDICT: APPROVED` have already gone idle — proceed directly. Only if one is still actively working and you want to stop it early, DM it `{"type": "shutdown_request"}`.

Do not modify gates in `CARD.meta.json`. Return control to the caller.

</instructions>
