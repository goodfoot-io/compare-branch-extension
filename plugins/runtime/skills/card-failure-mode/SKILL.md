---
name: card-failure-mode
description: Identify potential failure modes in implementation plans.
---

<instructions>

Identify ways an implementation plan could fail — not just at the level of individual steps, but at the level of the approach itself. The most valuable failure mode analysis asks whether the plan is making the right bets, whether its complexity is proportional to the problem, and what happens when its assumptions are wrong. The goal is to surface problems clearly enough that the planner and maintainer can decide what to do about them.

## 1. Understand What the Plan Is Betting On

Read the plan. Then read every source file the plan references — not the plan's description of those files, but the files themselves. Trace the runtime paths the plan will modify: follow function calls, check what happens on error paths, read the tests that cover the affected code. Search the workspace for consumers of the symbols, types, and files the plan modifies — when a consumer exists that the plan does not account for, that is a failure mode the planner doesn't know about. The failure modes live in the gap between the planner's model of the system and the system's actual behavior.

Identify the plan's key bets — the load-bearing decisions that the rest of the approach depends on:

- A bet on **mechanism**: "we will use X to accomplish Y" — what if X doesn't behave as expected?
- A bet on **scope**: "these are the things that need to change" — what if the actual change set is larger or smaller than assumed?
- A bet on **environment**: "the system will be in state S when this runs" — what if it isn't?
- A bet on **ordering**: "A will happen before B" — what if it doesn't, or what if the window between them is larger than assumed?

Name each bet explicitly. The failure modes that matter most are the ones that invalidate a bet — not the ones that affect a single step.

## 2. Question the Approach

For each key bet, ask whether it could go wrong:

**Does the plan create problems it then has to solve?** Some failure modes are inherent to the problem domain. Others are artifacts of the chosen approach — timing windows that exist because of an architectural decision, error handling complexity that exists because of a protocol choice, concurrency issues that exist because of a data flow design. When a failure mode is an artifact of the approach rather than the problem, say so.

**What happens when the plan's assumptions are wrong?** Every plan operates on a model of the system. Where that model is built from reading source code, it's grounded. Where it's built from documentation, type signatures, or convention, it could be wrong. For each assumption: if it's false, does the plan degrade gracefully, fail visibly, or fail silently? An approach that fails silently on a false assumption is more dangerous than one that fails loudly, regardless of how likely the assumption is to be wrong.

**Is the plan's complexity proportional to the problem?** A plan that introduces a new protocol, a new module, and a new build step to solve a problem that could be solved by modifying an existing function is carrying unnecessary risk. Each layer of indirection is a place where behavior can diverge from intent. When the plan is more complex than the problem requires, describe where the disproportion is.

## 3. Identify Specific Failure Modes

Where the approach has genuine risks, describe each one concretely:

**What fails and what the user experiences.** Name the specific malfunction and its observable consequence. "The cleanup process reads the discovery file after the server has deleted it, so cards remain in 'active' status permanently" is useful. "Something could go wrong with cleanup" is not.

**Why it matters.** A failure that corrupts data is different from one that shows a stale UI. A failure that affects every user is different from one that requires an unusual trigger. A failure that produces silently wrong results is different from one that produces a visible error. State the reasoning — the planner needs to weigh this against other priorities.

**Whether it would be caught.** Would the type system prevent it? Would an existing test catch it? Would it only surface in production under specific conditions? The planner needs to know whether existing defenses cover this failure or whether it's an open risk.

## 4. Deliver and Continue

Send the report to both the team lead and the maintainer via SendMessage as soon as the analysis is complete. Do not wait for the maintainer to finish their review — delivering findings early gives the maintainer the opportunity to incorporate them into the review in progress. Lead with approach-level concerns, then step-level concerns.

When the planner revises the plan and messages the team to re-review, re-read the updated PLAN.md and the workspace source files it references. Produce a fresh report. Prior findings that have been addressed or rendered moot by an approach change can be dropped. New risks introduced by the revision should be surfaced. Send the updated report to both the team lead and the maintainer as soon as ready.

The planner and maintainer are not required to address every finding. Findings are advisory — they inform the planner's revision decisions and the maintainer's review judgment.

</instructions>
