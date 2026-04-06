---
name: card-failure-mode
description: Identify potential failure modes in card implementations
---

<instructions>

## 1. Read the Code, Not the Plan's Description of It

Read PLAN.md and CARD.md from the card repository for intent and constraints. Then diff the workspace against the implementation baseline tag to identify every changed file:

```bash
git diff implement/$CARD_ID/baseline --name-only
```

Read every changed file in full. Then trace outward: for every exported symbol, type, or interface the implementation modifies, search the workspace for consumers. Follow the data flow to its terminal consumer — do not stop at an arbitrary hop count. A consumer the implementation doesn't account for is a failure mode the implementer doesn't know about.

Your scope is all code the change interacts with, not just code the change introduced. Pre-existing issues in adjacent code are first-class findings — report them with the same weight as newly introduced defects.

**Out-of-scope issues**: If you discover an issue in code the change does not interact with, do not include it in your findings. Instead, load the `cards:api` skill and create a new card about the issue with a `related` relation to the current card. Add the reciprocal relation to the current card's `CARD.meta.json`. Then continue your analysis.

Run the code where possible — exercising runtime paths reveals failures that static analysis misses, especially against shared blind spots with the author.

## 2. Name the Implementation's Bets

Identify the load-bearing decisions the implementation depends on:

- **Mechanism** — "X is used to accomplish Y." What if X doesn't behave as expected at runtime?
- **Scope** — "These are the files that changed." What consumers were missed?
- **Contract** — "This interface/type means Z." What if a producer or consumer disagrees?
- **Ordering** — "A happens before B." What if it doesn't, or the window between them is larger than assumed?
- **Error handling** — "Failures are caught here." What if an unexpected error type reaches that catch block?

Name each bet explicitly. The failure modes that matter most invalidate a bet, not a single line.

## 3. Check for Empirically-Observed Implementation Failures

These failure patterns appear at disproportionately high rates in Claude-generated code. Verify each by tracing runtime paths — shared training biases make them invisible to code reading alone.

- **Multi-file impact blindness** — Search the workspace for files that import from, reference, or depend on every modified file.
  - Claude routinely modifies the focal file while missing 2-4 dependent files.
  - If the diff touches 3+ files, assume it has missed at least one consumer until verified otherwise.

- **Silent error conversion** — Search every catch block, default return, and fallback value in the changed code.
  - Broad try-catch wrapping an entire function and returning a generic error (destroying error differentiation)
  - Catch blocks that log and continue
  - Returning `[]`, `null`, or default values on error instead of propagating
  - Optional chaining (`?.`) used to silently skip operations that should fail visibly
  - Retry logic that exhausts attempts without informing the caller
  - Fallback chains that try multiple approaches without surfacing which one succeeded or why earlier ones failed

- **Default-value bias** — For each fallback (`?? []`, `?? null`, `|| defaults`) in the diff, check whether the default is the correct behavior or is papering over a data flow gap.
  - A default "allow" branch in role logic, a missing value silently replaced with empty, or an undefined config key falling back to a permissive default are all security and correctness vectors.

- **Type safety escape hatches** — Search the diff for type assertions (`as X`), forced casts, and `any`.
  - Each trades a visible build error for a hidden runtime risk.
  - When a cast makes the code compile, check whether the underlying type contract is actually wrong.

- **Copy-paste mutation** — Check each variant when the implementation creates similar-but-different handlers, mappings, or cases. Claude carries over wrong variables, constants, or field names from the template.

- **Insecure defaults** — Check every new endpoint, resource, or configuration for its default access posture.
  - Flag public exposure without auth, open CORS, missing CSRF protection, unvalidated redirects.

- **Dead writes and orphaned parameters** — Search for:
  - Return values no caller consumes
  - Parameters no caller passes meaningful values for
  - Properties written to objects nothing reads
  - Production code that falls back to mock or stub implementations (mock/fake fallbacks outside tests indicate architectural gaps, not graceful degradation)

- **Async and ordering hazards** — Check for:
  - Unhandled promise rejections
  - Fire-and-forget async calls (`void asyncFn()`)
  - Race conditions between concurrent operations accessing shared state
  - Missing `await` on async operations whose result matters

## 4. Question the Approach

For each key bet, ask whether it could go wrong:

**Does the implementation create problems it then has to solve?** When a failure mode is an artifact of the chosen approach (timing windows, error handling complexity, concurrency issues) rather than the problem domain, say so explicitly.

**How does it fail?** For each assumption the implementation makes: if it's false, does the code degrade gracefully, fail visibly, or fail silently? Rank silent failures highest — they are more dangerous than loud ones regardless of likelihood.

**Is complexity proportional?** Each layer of indirection is a place where behavior can diverge from intent. When the implementation introduces more machinery than the problem requires, describe where the disproportion is.

## 5. Describe Failure Modes Concretely

For each finding, provide all three:

- **What fails and what the user experiences.** Name the specific malfunction and its observable consequence. "The cleanup handler catches the AbortError from the cancelled fetch, returns an empty array, and the UI renders 'no results' instead of showing the previous data" is useful. "Something could go wrong with cleanup" is not.
- **Why it matters.** Data corruption vs. stale UI. Every user vs. unusual trigger. Silent wrong results vs. visible error.
- **Whether it would be caught.** Would the type system prevent it? Would an existing test catch it? Would it only surface in production under specific conditions? If no existing defense covers this failure, say so.

## 6. Return Findings

Return the report to the caller as soon as the analysis is complete. Lead with approach-level concerns, then line-level concerns.

The caller reads the findings and decides whether the implementation is ready or needs revision.

</instructions>
