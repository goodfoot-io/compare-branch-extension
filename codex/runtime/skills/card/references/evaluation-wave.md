# Evaluator Wave

Independent adversarial evaluation via spawned evaluator children. Entered from `./implementation-evaluation.md` Step 3 (or `./validate.md` Step 4) with changes committed, validation passing, and a clean tree.

The evaluator children form an ephemeral spawn tree under you — there is no team to create. You spawn them directly in Step 1, and they report their result to you when their task completes. Across revision rounds you re-engage the same lanes: `send_message` a live evaluator, `resume_agent` a completed one (it restores with its findings in context), and spawn a fresh evaluator with prior findings inlined only when re-engagement fails (Step 5).

<placeholder-variables>
[HEAD_SHA] — The commit under evaluation; the tree must be clean at dispatch
[EFFORT] — Chosen by the diff's scope and risk, same criteria as `./developer-wave.md`'s `<effort-selection>`: `deep` for system-level, high-ambiguity, or cross-cutting changes; a lighter tier when the diff is small and low-ambiguity
</placeholder-variables>

<instructions>

## 1. Spawn Evaluators

Diff `implement/[CARD_ID]/baseline..HEAD`. **Choose which evaluators to spawn by judgment**: `failure_mode` always; add `experience_evaluator` when the change materially touches user-facing behavior, acceptance criteria are experiential, or the card's value is only observable from its entry points. Spawning both is "Deep"; adjust the peer references in the messages to match what you actually spawn.

Read the diff and the card before writing the spawn messages. Each message must reflect the specific nature of this implementation and this card. Record the HEAD SHA you spawn against and inline it in every message. When spawning both evaluators, issue both `spawn_agent` calls in the same turn so they run concurrently. Pass `[EFFORT]` as each evaluator's `agent_type` when a matching config role exists.

For the `failure_mode` child (`task_name: failure_mode`), the `message`:

```
Use the $runtime:card-failure-mode skill and follow it from the top. Draft the failure-mode questions for this implementation, then evaluate against them. Record each finding with a `FINDING:` marker and report a `VERDICT: APPROVED` or `VERDICT: CHANGES_REQUESTED` as your final message to me, the orchestrator that spawned you. On Deep depth I relay the experience-evaluator's findings to you for cross-evaluator critique; include any `CRITIQUE: <label>` responses in your report and I relay them back. After fix commits land I re-engage you to re-evaluate — extend the questions, triage prior findings, and report a fresh verdict.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Evaluate commit [HEAD_SHA]; changes are `implement/[CARD_ID]/baseline..HEAD`. Never evaluate the working tree — if `git status --porcelain` is non-empty, report the dirty paths to me instead of a verdict.

## Validation
All validation has passed. Focus on runtime behavior, semantic failures, and gaps the validation suite does not cover.

[Describe the specific failure risks this implementation presents. Where does the diff suggest the implementer's attention was concentrated, and where are the blind spots most likely? Which runtime paths are unexercised by tests, which contracts may drift silently, and which consumer assumptions break? Write this from what you found in the diff and the card, not as generic instructions.]
```

For **Deep**, also spawn the `experience_evaluator` child (`task_name: experience_evaluator`) with the `message`:

```
Use the $runtime:card-experience-evaluator skill and follow it from the top. Draft the user-outcome failure-mode questions, then evaluate by exercising the user entry points. Record each finding with a `FINDING:` marker and report a verdict as your final message to me, the orchestrator that spawned you. I relay the failure-mode evaluator's findings to you for cross-evaluator critique; include any `CRITIQUE: <label>` responses in your report and I relay them back. After fix commits land I re-engage you to re-evaluate — extend the questions, triage prior findings, and report a fresh verdict.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Evaluate commit [HEAD_SHA]; changes are `implement/[CARD_ID]/baseline..HEAD`. Never exercise the working tree — if `git status --porcelain` is non-empty, report the dirty paths to me instead of a verdict.

## Validation
All validation has passed. Focus on what a user would experience as broken, wrong, or missing that the validation suite does not cover.

[Translate the card's requirements into user scenarios this implementation must satisfy: acceptance criteria to verify, user-facing entry points, what a user testing against the card should do and observe. Write this from what you found in the card, not as a generic description.]
```

When an evaluator needs to compare behavior against the pre-implementation state, spawn a `$runtime:card-pre-existing-condition` child with the behavior under investigation and the card's diff scope rather than running the comparison in the active workspace — it reproduces on the baseline ref and reports the result back.

## 2. Collect Verdicts and Route

Each evaluator child returns a structured final report to you when its task completes, and on a live re-evaluation reports a fresh verdict via the same channel:

- **`FINDING:` entries**: Record each finding (short label and body) so you can route it into a developer wave in Step 3 and, after fixes land, brief the evaluators on what changed. Keep what you need to do those two things — not a cross-referenced ledger.
- **`VERDICT:` line**: Record the verdict for this round. From an `APPROVED` body, capture the open sub-blocking list (label + witness) — it is the pre-finalize sweep's only input.

On Deep depth you mediate cross-evaluator critique: relay each evaluator's `FINDING:` entries to the peer evaluator (via `send_message` if the peer is still live, or inlined into the peer's next resume or spawn message), and relay any `CRITIQUE: <label>` an evaluator includes back to the evaluator it targets. If an evaluator verifies a relayed critique and folds it into its own findings, it returns that as a fresh `FINDING:` in its report. Treat each `FINDING:` as a record from its sender — do not deduplicate across evaluators. Two evaluators may legitimately raise the same underlying issue from different angles.

Continue until every spawned evaluator has reported a `VERDICT:` for the current round. Before accepting a `VERDICT: APPROVED`, confirm the evaluator's questions note (`failure-mode-questions` or `user-outcome-questions`) is committed in the card repo's `notes/`; if missing, re-engage the evaluator to publish the note and re-issue — an unnoted `APPROVED` does not count. A `CHANGES_REQUESTED` counts without its note; if the note is missing at round 1, add "publish your questions note before your next verdict" to that lane's Step 5 re-evaluation message. Do not spawn or re-engage developer workers while any evaluator is still mid-round — workers would dirty the tree under it. Do not adjudicate findings — read each evaluator's `VERDICT:` line and route on the verdict, not your assessment of the findings. A finding its evaluator retracts is dropped; one under peer critique stays in the wave until its owner retracts it. You may not override a verdict, reclassify a finding as a "limitation" or "follow-up," or document it as a known issue in lieu of fixing it.

An `idle_notification` or a report that arrives without a verdict means the evaluator's process has stopped; it runs again only when you re-engage it. An evaluator that reported dirty paths instead of a verdict is the exception. Commit or revert the outstanding changes, then re-engage that lane with the new HEAD SHA — never spawn a fresh replacement, which would re-open findings already accepted.

Otherwise, an evaluator that finished its task without a usable verdict, or that cannot run, is a judgment call: spawn a fresh replacement, or treat the evaluation as BLOCKED per the branch below if it cannot run. Re-engage the lane first — `send_message` if live, `resume_agent` if completed — never spawn a replacement without a failed re-engagement attempt on record. A fresh replacement is a new child with no prior context: spawn it through Step 1, evaluating current HEAD from scratch — point it at its lane's questions note in the card repo's `notes/`, inline the known prior-round findings for its lane, and state the round number it inherits (question-gating and the blocking threshold count per evaluation, not per agent instance).

A mixed set — one evaluator approves while another requests changes — is CHANGES_REQUESTED.

- **All APPROVED** (every spawned evaluator): Proceed to Step 6: Finalize. This is the only path to Finalize.
- **Any CHANGES_REQUESTED**: Proceed to Step 3: Dispatch Developer Team with the recorded findings. You do not fix evaluator findings — the developer team does.
- **BLOCKED** (an evaluator names an external constraint preventing the fix): Document the constraint and the specific finding in a comment, add `blocked` to `tags` in `CARD.meta.json`, commit, then **STOP**.

## 3. Dispatch Developer Team

Group the findings by the package they touch and route each group to the owning worker per `./developer-wave.md` — spawn a fresh worker for a package with none yet. Inline every finding the worker must address into its task (full body plus the file or runtime path it applies to); do not stream new findings to a worker mid-task. Developer-team workers are **not** part of the evaluation group and receive no follow-up messages from evaluators. Add to each task's Workflow: a fix introducing a new mechanism lands with a regression test for it and an end-to-end exercise of the mechanism composed with what it touches; report each such witness (mechanism → test/command) in the `REPORT:`.

## 4. Validate and Commit

Apply `./developer-wave.md`'s `<integration-gate>`: wait for every worker's report, fold back any stray commits, lint/typecheck/scoped-test, then commit — or fix mechanical errors inline, or send an implementation error back to the owning worker. Confirm every new mechanism the wave introduced carries its regression test and composed exercise; one without them is an implementation error — send it back.

If you arrived from the caller's pre-evaluation validation failure, return there; otherwise proceed to Step 5.

## 5. Trigger Re-Evaluation

Re-engage every evaluator lane against the revised implementation. If an evaluator is still live, `send_message` it the re-evaluation context by its task path; if its task already completed, `resume_agent` it and send the same context — it resumes per its skill's "When Resuming" path with its findings in context. Only if re-engagement fails, `spawn_agent` a fresh child for that lane and inline its prior findings plus the re-evaluation context into the spawn `message`.

The evaluator holds its own findings in context (live or resumed) or receives them inlined (spawned replacement). Give it the new HEAD SHA, the commit range, a plain account of what the wave changed and why, and anything the wave could *not* fix. The literal `RE_EVALUATE` marker wakes the evaluator's resume behavior — a free-form status message with the same content does not.

```
The implementation has been updated to address the prior round's findings. Re-evaluate against commit [HEAD_SHA]; the tree is clean at that commit.

Fix commits: implement/[CARD_ID]/baseline..HEAD (this wave: [SHA list])
What changed and why: [a plain account — which findings the wave addressed and how, in enough detail to re-check]
New witnesses: [mechanism → test/command, for each new mechanism the wave introduced — omit if none]
Not fixed: [any finding the wave could not address, and why — including findings a worker disputed, with its reasoning; omit if none]

RE_EVALUATE
```

For Deep, deliver the same message to the `experience_evaluator` lane.

Each evaluator resumes its analysis (per its skill's "When Resuming for a Fixed Implementation" section) and reports a fresh verdict for this round. Return to Step 2: Collect Verdicts and Route. The loop continues until every evaluator reports `APPROVED`, or a BLOCKED branch fires.

## 6. Finalize

Enter only when every spawned evaluator has reported `VERDICT: APPROVED` for the current round.

**Pre-finalize sweep.** If sub-blocking findings or witness repairs remain open (the lists from the `APPROVED` bodies), dispatch one final developer wave for them per Step 3, scoped to the listed findings' own files — no discretionary refactoring. Validate and commit per `./developer-wave.md`'s gate — do **not** route into Step 5 — then re-run each repaired witness yourself and confirm the expected result, and run the caller's validation commands. If a witness re-run fails or validation cannot pass, fall back to Step 5 — the only path from the sweep into a re-evaluation round. Skip the sweep when nothing is open.

The evaluator children auto-terminate when their tasks complete; there is no team to tear down. Wait for any still-live evaluator to finish, and do not spawn new ones.

If the developer team was dispatched in this wave (the caller had none live), drain it per `./developer-wave.md` `<lifecycle>` before returning. Do not modify gates in `CARD.meta.json`. Return control to the caller.

</instructions>
