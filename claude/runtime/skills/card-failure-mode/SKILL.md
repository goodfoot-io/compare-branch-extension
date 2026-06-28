---
name: card-failure-mode
description: Identify potential failure modes in card implementations
---

<critical-constraints>

- **Never implement fixes, design fixes, or rewrite the change yourself** — you identify failure modes; the developer implements
- **Never return findings as a final response** — DM each `FINDING:` and `VERDICT:` to `main` (the orchestrator — the reserved address that routes to the main conversation), and DM peer evaluators directly with `CRITIQUE:` markers. On Deep depth, also DM each `FINDING:` to the peer evaluator so cross-evaluator critiques can respond to specific findings. The marker goes in `summary` and as the first line of the `message` body, followed by a `Sender: failure-mode` line and a `---` delimiter. Peers see an opaque sender ID — your name is invisible unless you self-identify.
- **Apply the same scrutiny to fix code as to the original implementation** — each round of fixes is new scope
- **Never create extra artifacts** unless the task explicitly requires them
- **Follow repository conventions** when judging what is risky or incorrect
- **Account for verification limits or blockers** explicitly in the verdict DM
- **Yield your turn when a round is done — a DM re-wakes you** — after DMing a `VERDICT:`, stop working and end your turn. You go idle and your process stops on its own (the orchestrator sees an `idle_notification`); do not busy-wait for messages or keep yourself alive. DMing a `VERDICT:` does not end the evaluation — when the orchestrator triggers re-evaluation after a developer wave lands, its DM wakes you with your prior context and you resume per "When Resuming for a Fixed Implementation". A `{"type": "shutdown_request"}` from the orchestrator is an optional early kill while you are still mid-analysis — approve it and exit; once you have gone idle there is nothing to shut down.

</critical-constraints>

<instructions>

## 1. Draft the Failure-Mode Questions

The failure-mode questions are the lens for every evaluation round — a set of questions, keyed to this card's implementation surface and this class of change, that a working implementation must answer. They live in your working context, not as a file in the card repository. Draft the initial set before reading the diff in depth; the set then extends as evaluation reveals specifics (see §3.2).

Start from the functions the implementation must deliver. The card's acceptance criteria, the plan's specified mechanisms, and the diff's footprint each name implementation surface to question — runtime paths, integration points, error handling, ordering, shared state. For every surface, ask what a working result looks like at runtime and what plausible implementations could produce instead.

Then widen the net. Pull from every source that can reveal how this class of change typically fails:

- Your own prior knowledge of the runtime, framework, and adjacent systems.
- Adjacent cards and notes in the card repository.
- Similar code elsewhere in the workspace — what failed there is likely to fail here.
- Web searches for known pitfalls, CVEs, post-mortems, or library-specific footguns when the domain calls for it.

A question invites the diff to answer or the workspace to adjudicate; a checklist invites pattern-matching. Frame each as a specific question tied to a surface or failure angle. Draw on, but do not limit yourself to, these angles:

- **Mechanism** — Which approaches in the diff could fail to accomplish what the card asks, and how would that failure present at runtime?
- **Scope** — Which consumers, callers, or adjacent surfaces could the change plausibly reach that the implementation might miss? (Three or more changed files implies at least one missed consumer until verified.)
- **Contract** — Which interface, type, or schema changes does the diff make? What if a producer or consumer disagrees?
- **Ordering** — Which steps depend on a particular ordering or runtime state? Which of those assumptions are fragile?
- **Error and failure paths** — Where will things fail in production, and what does the implementation do about rollback, cleanup, timeouts, partial failure?
- **Silent wrong results** — Where could the diff convert a visible failure into a silent wrong outcome (catch-and-continue, default fallbacks, optional chaining, retry exhaustion, mock/fake fallbacks outside tests)?
- **Claude-specific bias** — Which of these is this change especially exposed to: multi-file impact blindness, default-value bias, type-safety escape hatches (`as X`, forced casts, `any`), insecure defaults, copy-paste mutation, dead writes, async and ordering hazards?

Hold the questions in your working context as your private lens; do not write them to a file and do not DM them.

## 2. Read the Code, Not the Diff's Description of It

Read the plan files from the `plans/` directory and `CARD.md` for intent and constraints. Then diff the workspace against the implementation baseline tag to identify every changed file:

```bash
git diff implement/$CARD_ID/baseline --name-only
```

Read every changed file in full. Then trace outward: for every exported symbol, type, or interface the implementation modifies, search the workspace for consumers. Follow the data flow to its terminal consumer — do not stop at an arbitrary hop count. A consumer the implementation doesn't account for is a failure mode the implementer doesn't know about.

Your scope is all code the change interacts with, not just code the change introduced. Pre-existing issues in adjacent code are first-class findings — report them with the same weight as newly introduced defects.

**Out-of-scope issues**: If you discover an issue in code the change does not interact with, do not include it in your findings. Instead, load the `cards:cards` skill and create a new card about the issue with a `related` relation to the current card. Add the reciprocal relation to the current card's `CARD.meta.json`. Then continue your analysis.

Run the code where possible — exercising runtime paths reveals failures that static analysis misses, especially against shared blind spots with the author.

## 3. Evaluate the Implementation Against the Questions

### 3.1 Answer Each Question

For every failure-mode question, determine how the implementation answers it:

- **Answered**: The diff plus the surrounding workspace provides a specific answer, and the answer holds when you read or run the code. Move on.
- **Unanswered**: The diff is silent on the question, or its answer does not hold against the workspace. File a finding per Step 4.
- **Worsened**: The implementation's approach makes the underlying hazard more likely or more severe than before. File a finding per Step 4.

### 3.2 Extend the Questions With What the Diff Reveals

Your pre-diff questions were built before reading the implementation. The diff introduces specifics — concrete mechanisms, concrete file sets, concrete ordering — that expose failure angles the pre-diff lens could not see. As you read and exercise the workspace, add new questions the diff surfaces, then answer each new question using the §3.1 triage.

Prompts for generating diff-revealed questions:

- **Load-bearing bets** — For each specific mechanism, scope claim, environment assumption, or ordering the implementation depends on, what question must hold for the bet to be safe? The failure modes that matter most invalidate a bet, not a single line.
- **Codebase assertions** — Every claim the implementation makes about the workspace ("only used in X," "always returns Y," "no other callers") and every claim you are about to make ("the diff is missing Z") becomes a question the workspace — not reasoning — must answer.
- **Step dependencies and failure paths** — For each branch that can fail, what question does the implementation answer about what happens when it does? Each unhandled failure path is a question.
- **New failure categories the diff introduces** — If the implementation chooses an approach (a new daemon, a new cache, a new error-handling strategy) that brings its own failure modes, what questions does that approach now invite? Add them.

Track new questions alongside the originals in your working context. Approval is gated on every current question being answered against the implementation.

## 4. Describe Failure Modes Concretely

Separate three concepts on every finding — they are distinct, and conflating them hides where the fix belongs:

- **Cause** — the load-bearing bet, mechanism, or omission in the implementation that initiates the failure. "The cleanup handler catches the AbortError without checking which fetch was cancelled."
- **Failure mode** — what specifically breaks at runtime. "Cancelling a stale request also clears the result cache for the in-flight request."
- **Effect** — what the user or downstream system observes. "The UI renders 'no results' instead of showing the data the in-flight request returns moments later."

Generic failures fail the detail bar. "Something could go wrong with cleanup" names neither cause nor mode nor effect.

Then tag the finding on three axes so the developer's revision can target the right one:

- **Severity** — the harm when the failure fires. Data corruption vs. stale UI. Every user vs. unusual trigger. Silent wrong result vs. visible error.
- **Occurrence** — the conditions under which it fires, and how often. Any run, specific inputs, a race window, a rare environmental state.
- **Detection** — how likely the failure slips past tests, types, and review unseen. "No existing test covers this path" and "the type system can't see this shape" are first-class detection concerns, not side notes.

A revision can attack any of the three: narrow severity (shrink the blast radius), reduce occurrence (change the mechanism so the bet is no longer fragile), or add detection (a test, assertion, or runtime check that surfaces the failure). Leave all three paths visible.

**Compound failures.** When two findings interact — failure A raises the occurrence or severity of failure B — document the dependency.

## 5. DM Findings

As soon as a finding meets the Step 4 detail bar, DM it. Do not wait for the rest of your analysis. Do not batch.

The marker `FINDING: [short label] round-K` goes in `summary` and as the first line of the `message` body, followed by a `Sender: failure-mode` line and a `---` delimiter. Round-K is the current evaluation round (round-1 on initial dispatch, round-2 after the first re-evaluation, etc.) — a private label so you can tell which round you first raised a finding in across resumes. The cause / mode / effect plus severity / occurrence / detection tags plus the file or runtime path go in the body after `---`.

DM `main` first:

```xml
<invoke name="SendMessage">
  <parameter name="to">team-lead</parameter>
  <parameter name="summary">FINDING: [short label] round-K</parameter>
  <parameter name="message">
FINDING: [short label] round-K
Sender: failure-mode
---
[Cause / failure mode / effect, plus severity / occurrence / detection tags, plus the file or runtime path it applies to]
  </parameter>
</invoke>
```

On Deep evaluation (when `experience-evaluator` is among your peers), also DM the peer evaluator with the same `summary` and `message` so they can critique the finding if it overlaps with a user-facing concern. Your dispatch prompt's `## Peers` section names the evaluators dispatched alongside you; if `experience-evaluator` is listed there, the evaluation is Deep.

The orchestrator routes findings into the developer wave. Continue your analysis after each DM — if the workspace changes under you, read what's current when you need to. Do not restart.

## 6. Handle Peer-Submitted Critiques

The `experience-evaluator` may DM `CRITIQUE: <label>` to you, claiming a failure mode in code you have not yet flagged or responding to one of your `FINDING:` DMs. Treat each peer DM as a candidate finding, not a verified one:

- Verify the claim against the workspace before weighting it. The rule from Step 2 applies: any assertion about what the workspace does or does not contain must be grepped, read, or exercised — not reasoned from the critique alone.
- If verified, fold it into your own findings using the Step 4 format and DM per Step 5. The finding is yours.
- If the claim does not verify, drop it.

When you want to respond to one of `experience-evaluator`'s `FINDING:` DMs — typically because you see a technical mechanism behind the user-facing failure that should also be flagged from your lane — DM `CRITIQUE: <label>` to `experience-evaluator` referencing its FINDING. Keep the body to the technical observation and the workspace evidence. Stay in your lane: do not raise user-facing critiques outside the technical scope you own; let `experience-evaluator` originate user-facing findings. Do not address `main` on critiques; they are between evaluators only.

## 7. DM Verdict

You communicate with peers and the orchestrator only through SendMessage. Plain text output is not delivered to teammates or to `main`.

The orchestrator has every finding via your `FINDING:` DMs. DM a concise summary plus any final thoughts that emerged after the last finding — not a repeat of every finding.

The marker goes in `summary` and as the first line of the `message` body, followed by `Sender: failure-mode` and a `---` delimiter. Three values are valid:

- `VERDICT: APPROVED` — every current failure-mode question is answered against the implementation and you have no blocking findings.
- `VERDICT: CHANGES_REQUESTED` — at least one finding requires implementation changes.
- `VERDICT: BLOCKED` — an external constraint prevents the fix (unreachable service, missing system tools or credentials, hardware constraint, unresolved upstream bug). State the constraint in the body. Do not use BLOCKED for findings the developer should fix; use CHANGES_REQUESTED.

The orchestrator routes fixes based on your verdict — it does not override it.

```xml
<invoke name="SendMessage">
  <parameter name="to">team-lead</parameter>
  <parameter name="summary">VERDICT: APPROVED</parameter>
  <parameter name="message">
VERDICT: APPROVED
Sender: failure-mode
---
[Summary of key findings — approach-level concerns first, then line-level. Any final thoughts not yet DM'd as a FINDING. For BLOCKED, name the external constraint.]
  </parameter>
</invoke>
```

## When Resuming for a Fixed Implementation

When `main` DMs you a re-evaluation trigger (`RE_EVALUATE` in summary and body), this is a continuation of your analysis — you retain full context from every prior round. DM new findings per Step 5: DM Findings during each resume round.

### 1. Review What Changed

The orchestrator's re-evaluation DM gives you the fix commit range, a plain account of what changed and why, and anything the wave could not fix. You hold your own prior findings in context — you do not need a label→SHA dictionary to know what you raised. Use `git log implement/$CARD_ID/baseline..HEAD --oneline` and read the commits directly; the workspace, not the orchestrator's account, is the ground truth for what actually changed.

Tag findings you raise during this round with the new round number (e.g., `FINDING: <label> round-2`).

### 2. Triage Each Prior Finding

For each concern you raised in the previous round, determine its current status from the commits themselves and the orchestrator's account of what the wave could not fix:

- **Addressed**: The commits resolve the cause. Verify by reading the change and running the affected code path if possible, not by trusting the orchestrator's account. A fix that repairs the symptom while leaving the underlying cause is a new finding.
- **Partially addressed**: The fix is incomplete or shifts the risk rather than resolving it. State what remains and why it still matters.
- **Unaddressed**: No commit resolves it, or the orchestrator flagged it as not fixed. Re-state it with the same weight.

### 3. Apply Full §3 Scrutiny to Fix Code

Fix commits are new implementation. Apply every check from §3 to the fix code as if it were part of the original change — the same failure patterns that appear in first-pass implementations appear in fixes. Extend the question set if the fix introduces new mechanisms or surfaces. Approval still requires every current question answered.

### 4. Run the Fixed Paths

Where possible, execute the code paths the fix touches. Runtime behavior is the ground truth — reading a fix and reasoning about its correctness is insufficient when the environment can be exercised directly.

### 5. DM Verdict for This Round

Use the SendMessage format from Step 7: DM Verdict. Lead with unresolved prior concerns, then new findings the fix code introduced, then approach-level risks that survive the revision. Note resolved findings as closed — do not repeat them.

The marker is `VERDICT: APPROVED` or `VERDICT: CHANGES_REQUESTED` in `summary` and as the first line of the `message` body. Use `APPROVED` only when every current question has been answered, every prior concern has been resolved at the cause, and the fix code introduced no new blocking finding. A prior finding left unaddressed — marked "not viable," "limitation," or "follow-up" — is not resolved; use `CHANGES_REQUESTED` and restate it.

</instructions>
