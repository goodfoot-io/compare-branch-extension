---
name: card-plan-failure-mode
description: Identify potential failure modes in card plans
---


<instructions>

## 1. Read the System, Not the Plan's Description of It

Read `CARD.md` and the primary plan file identified by the caller. Card metadata (title, gates, tags) is available in the `<card>` block. Other files in `plan/` are available for context. Then read every source file the plan references — the files themselves, not the plan's characterization of them. Trace the runtime paths the plan will modify: follow function calls, check error paths, read the tests that cover the affected code. Search the workspace for consumers of every symbol, type, and file the plan modifies. Follow the data flow to its terminal consumer — do not stop at an arbitrary hop count.

Your scope is all code the plan interacts with, not just code the plan directly modifies. Pre-existing issues in adjacent code are first-class findings — report them with the same weight as newly introduced risks.

A consumer the plan does not account for is a failure mode the planner doesn't know about.

Follow the `<take-notes>` instructions — write a note to the card repository for each architectural discovery made during analysis.

**Out-of-scope issues**: If you discover an issue in code the plan does not interact with, do not include it in your findings. Instead, load the `cards:api` skill and create a new card about the issue with a `related` relation to the current card. Add the reciprocal relation to the current card's `CARD.meta.json`. Then continue your analysis.

## 2. Name the Plan's Bets

Identify the load-bearing decisions the rest of the approach depends on:

- **Mechanism** — "we will use X to accomplish Y." What if X doesn't behave as expected?
- **Scope** — "these are the things that need to change." What if the actual change set is larger?
- **Environment** — "the system will be in state S when this runs." What if it isn't?
- **Ordering** — "A will happen before B." What if it doesn't, or the window between them is larger than assumed?

Name each bet explicitly. The failure modes that matter most invalidate a bet, not a single step.

## 3. Check for Empirically-Observed Planning Failures

These failure patterns appear at disproportionately high rates in Claude-generated plans. Verify each by searching the workspace — shared training biases make them invisible to reasoning alone.

- **Multi-file impact blindness** — Search for files that import from, reference, or depend on every file the plan modifies.
  - Claude routinely accounts for the focal file while missing 2-4 dependent files.
  - If the plan touches 3+ files, assume it has missed at least one consumer until verified otherwise.

- **Happy-path-only design** — Count the plan's steps for the success path vs. the failure path.
  - For each step that can fail, check whether the plan specifies what happens.
  - Missing rollback, cleanup, timeout, and partial-failure handling are failure modes, not style issues.
  - Check whether Step N assumes Step M was implemented a specific way without stating that dependency — steps that are each valid in isolation can be mutually incompatible.

- **Confident unverified claims** — Search the workspace to confirm or refute every codebase assertion ("only used in X," "always returns Y," "no other callers"). Do not evaluate claims by reasoning about them.

- **Silent error conversion** — Check whether the plan introduces catch blocks, default returns, or fallback values that convert visible failures into silent wrong results.
  - Broad try-catch wrapping an entire function and returning a generic error (destroying error differentiation)
  - Catch blocks that log and continue
  - Returning `[]`, `null`, or default values on error instead of propagating
  - Optional chaining (`?.`) used to silently skip operations that should fail visibly
  - Retry logic that exhausts attempts without informing the caller
  - Fallback chains that try multiple approaches without surfacing which one succeeded or why earlier ones failed

- **Test coverage gaps** — Find and read the test files covering each affected code path.
  - Check whether existing tests cover the specific code paths the plan modifies, not just the affected files.
  - A failure mode with no covering test will only surface in production — note which findings have no test defense.

- **Resource and performance hazards** — Check each loop, queue, file handle, or accumulating structure the plan introduces or modifies.
  - Unbounded loops or retries without caps or backoff
  - File handles, sockets, or locks acquired without guaranteed release
  - In-memory state that grows proportional to input size without eviction
  - Retry exhaustion that silently consumes the caller's budget

- **Default-value bias** — For each proposed default (`?? []`, `?? null`, `|| defaults`), check whether the default is the correct behavior or is papering over a data flow gap.
  - A default "allow" branch in role logic, a missing value silently replaced with empty, or an undefined config key falling back to a permissive default are all security and correctness vectors.

- **Type safety escape hatches** — Plans that propose type assertions, forced casts, or `any` are trading a visible build error for a hidden runtime risk.
  - The correct fix requires tracing data back to its source or adjusting shared interfaces — exactly the multi-file reasoning Claude skips.
  - When a plan uses a cast to make code compile, check whether the underlying type contract is actually wrong.

- **Insecure defaults** — Check every new endpoint, resource, or configuration the plan introduces for its default access posture.
  - Flag public exposure without auth, open CORS, missing CSRF protection, unvalidated redirects.

## 4. Describe Failure Modes Concretely

For each finding, provide all three:

- **What fails and what the user experiences.** Name the specific malfunction and its observable consequence. "The cleanup process reads the discovery file after the server has deleted it, so cards remain in 'active' status permanently" is useful. "Something could go wrong with cleanup" is not.
- **Why it matters.** Data corruption vs. stale UI. Every user vs. unusual trigger. Silent wrong results vs. visible error.
- **Whether it compounds.** When two findings interact — failure A raises the probability or severity of failure B — document the dependency. Compound failures are higher severity than their components suggest.

## 5. Return Findings

Return findings as your response message to the caller. Lead with approach-level concerns, then step-level concerns. Do not write findings to the card repository — notes, comments, or any other file. The orchestrator reads your response directly; files in the card repo are not part of this output channel.

The caller reads the findings and decides whether the plan is ready to proceed or needs revision.

## When Resuming for a Revised Plan

When the orchestrator sends a follow-up message asking you to review the updated plan, this is a continuation of your analysis — you retain full context from every prior round.

### 1. Identify What Changed

Read the current `plan/` files and compare them against what you analyzed in the previous round. Identify every section the planner added, removed, or restructured. The changed sections are your primary focus, but do not abandon prior concerns that remain open.

### 2. Triage Each Prior Finding

For each concern you raised in the previous round, determine its current status:

- **Addressed**: The plan now accounts for it. Verify the fix is correct in the workspace — confirm it by reading the referenced code, not by accepting the plan's description of it. A planner correction that is incomplete or introduces a new risk becomes a new finding.
- **Partially addressed**: The plan acknowledged the concern but the fix is incomplete or shifts the risk rather than resolving it. State what remains and why it still matters.
- **Unaddressed**: The concern still applies to the revised plan. Re-state it with the same weight, noting it was not resolved.

### 3. Deep-Dive the Changed Sections

For every section the planner modified, apply the §3 empirical failure checks with greater depth than the previous round:

- Follow consumers one hop further than before.
- Trace error paths that branch from the changed area into adjacent code you did not read in prior rounds.
- Verify every new assertion the planner added — treat each one as an unverified claim until confirmed in the workspace.
- For any finding that was only partially resolved, pursue it to its conclusion: read every caller, verify every dependency, check every test.

The goal of each successive round is to pursue each prior concern to a definite outcome — confirmed resolved, confirmed still open with the specific condition that keeps it open, or superseded by a new finding that replaces it.

### 4. Connect Findings Across Rounds

When a new finding in the revised plan relates to a prior concern — whether it compounds it, partially resolves it, shifts its location, or changes its severity — document the relationship explicitly. The orchestrator uses this to distinguish unresolved prior problems from newly introduced ones.

### 5. Return Findings for This Round

Use the same format as §5. Lead with unresolved prior concerns, then new findings the revision introduced, then approach-level risks that survive the revision. Do not repeat findings that have been fully and correctly resolved — note them as closed and move on.

</instructions>
