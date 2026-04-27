---
name: card-failure-mode
description: Identify potential failure modes in card implementations
---

<critical-constraints>

- **Never implement fixes, design fixes, or rewrite the change yourself** — you identify failure modes; the developer implements
- **Never return findings as a final response** — the orchestrator routes from broadcasts; use `SendMessage to:*` with `FINDING:`, `CRITIQUE:`, and `VERDICT:` markers
- **Apply the same scrutiny to fix code as to the original implementation** — each round of fixes is new scope
- **Never create extra artifacts** unless the task explicitly requires them
- **Follow repository conventions** when judging what is risky or incorrect
- **Account for verification limits or blockers** explicitly in the verdict broadcast

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

Hold the questions in your working context as your private lens; do not write them to a file and do not broadcast them.

## 2. Read the Code, Not the Diff's Description of It

Read the plan files from the `plan/` directory and `CARD.md` for intent and constraints. Then diff the workspace against the implementation baseline tag to identify every changed file:

```bash
git diff implement/$CARD_ID/baseline --name-only
```

Read every changed file in full. Then trace outward: for every exported symbol, type, or interface the implementation modifies, search the workspace for consumers. Follow the data flow to its terminal consumer — do not stop at an arbitrary hop count. A consumer the implementation doesn't account for is a failure mode the implementer doesn't know about.

Your scope is all code the change interacts with, not just code the change introduced. Pre-existing issues in adjacent code are first-class findings — report them with the same weight as newly introduced defects.

**Out-of-scope issues**: If you discover an issue in code the change does not interact with, do not include it in your findings. Instead, load the `cards:management` skill and create a new card about the issue with a `related` relation to the current card. Add the reciprocal relation to the current card's `CARD.meta.json`. Then continue your analysis.

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

## 5. Broadcast Findings

As soon as a finding meets the Step 4 detail bar, broadcast it to the team. Do not wait for the rest of your analysis. Do not batch.

```xml
<invoke name="SendMessage">
  <parameter name="to">*</parameter>
  <parameter name="summary">Failure mode: [short label]</parameter>
  <parameter name="message">
[Cause / failure mode / effect, plus severity / occurrence / detection tags, plus the file or runtime path it applies to]

FINDING: [short label]
  </parameter>
</invoke>
```

The orchestrator listens for `FINDING:` broadcasts and dispatches developers to address them. Continue your analysis after each broadcast — if the workspace changes under you, read what's current when you need to. Do not restart.

## 6. Handle Peer-Submitted Critiques

The `experience-evaluator` may broadcast `CRITIQUE: <label> for:failure-mode` claiming a failure mode in code you have not yet flagged. Treat each broadcast critique as a candidate finding, not a verified one:

- Verify the claim against the workspace before weighting it. The rule from Step 2 applies: any assertion about what the workspace does or does not contain must be grepped, read, or exercised — not reasoned from the critique alone.
- If verified, fold it into your own findings using the Step 4 format and broadcast per Step 5. The finding is yours.
- If the claim does not verify, drop it.

You may broadcast `CRITIQUE: <label> for:experience-evaluator` when you spot a user-facing failure the experience evaluator has not flagged — keep the body to the user-facing observation and the workspace evidence.

## 7. Broadcast Verdict

You communicate with the team only through SendMessage. Plain text output is not delivered to teammates or to the orchestrator.

The orchestrator has every finding via your `FINDING:` broadcasts. Broadcast a concise summary plus any final thoughts that emerged after the last finding — not a repeat of every finding.

End the message with a single line: `VERDICT: APPROVED` or `VERDICT: CHANGES_REQUESTED`. Use `APPROVED` only when every current failure-mode question has been answered against the implementation and you have no blocking findings. The orchestrator routes fixes based on your verdict — it does not override it.

```xml
<invoke name="SendMessage">
  <parameter name="to">*</parameter>
  <parameter name="summary">Failure-mode verdict: [APPROVED | CHANGES_REQUESTED]</parameter>
  <parameter name="message">
[Summary of key findings — approach-level concerns first, then line-level. Any final thoughts not yet broadcast as a FINDING.]

VERDICT: APPROVED | CHANGES_REQUESTED
  </parameter>
</invoke>
```

## When Resuming for a Fixed Implementation

When the orchestrator broadcasts a re-evaluation trigger, this is a continuation of your analysis — you retain full context from every prior round. Broadcast new findings per Step 5: Broadcast Findings during each resume round.

### 1. Identify New Commits

The orchestrator's re-evaluation trigger includes a finding → commit mapping aggregated across all developers in the prior round, keyed by the `FINDING:` label you broadcast. Use `git log implement/$CARD_ID/baseline..HEAD --oneline` to confirm the commits, then verify each fix by reading the commit directly.

### 2. Triage Each Prior Finding

For each concern you raised in the previous round, determine its current status using the orchestrator's mapping and the new commits:

- **Addressed**: A fix commit targets this finding. Verify the fix resolves the cause — run the affected code path if possible, don't only read the change. A fix that repairs the symptom while leaving the underlying cause is a new finding.
- **Partially addressed**: The fix is incomplete or shifts the risk rather than resolving it. State what remains and why it still matters.
- **Unaddressed**: The mapping flagged this as not viable or deferred. Re-state it with the same weight.

### 3. Apply Full §3 Scrutiny to Fix Code

Fix commits are new implementation. Apply every check from §3 to the fix code as if it were part of the original change — the same failure patterns that appear in first-pass implementations appear in fixes. Extend the question set if the fix introduces new mechanisms or surfaces. Approval still requires every current question answered.

### 4. Run the Fixed Paths

Where possible, execute the code paths the fix touches. Runtime behavior is the ground truth — reading a fix and reasoning about its correctness is insufficient when the environment can be exercised directly.

### 5. Broadcast Verdict for This Round

Use the SendMessage format from Step 7: Broadcast Verdict. Lead with unresolved prior concerns, then new findings the fix code introduced, then approach-level risks that survive the revision. Note resolved findings as closed — do not repeat them.

End the message with a single line: `VERDICT: APPROVED` or `VERDICT: CHANGES_REQUESTED`. Use `APPROVED` only when every current question has been answered, every prior concern has been resolved at the cause, and the fix code introduced no new blocking finding. A prior finding left unaddressed — marked "not viable," "limitation," or "follow-up" — is not resolved; use `CHANGES_REQUESTED` and restate it.

</instructions>
