---
name: card
description: Evaluate card state and load the appropriate reference.
---

<routing-constraints>
The routing phase evaluates and selects — it does NOT implement, plan, or modify card content. After routing, the matched reference is loaded and its instructions take over.

| Routing phase | Loaded reference handles |
|------------------------|--------------------------------|
| Evaluating routing conditions | Implementation work |
| Selecting the appropriate reference | Plan creation and revision |
| Loading the matched reference | Bug fixing |
| | Merging, clarification, and responses |


</routing-constraints>

<quiet>
Routing runs without user interaction. Messages describing state and routing decisions are not required.
</quiet>

<routing-instructions>

## 1. Evaluate Routing Signals

### 1.1 Read Card State

Obtain `gates.*` and `tags` from the `<card>` block in your session context. Obtain the comment file listing from the `<card-repo>` block.

### 1.2 Derive Routing Signals

> **Comment authorship convention**: Determine authorship from the git commit that added each comment file: `git log --diff-filter=A --format='%an' -1 -- comment/<file>`. User-authored comments are committed by the user's git identity; agent-authored comments are committed by the agent's git identity. Sort `comment/*.md` by modification time; the most recent user-authored file is the "latest user comment."

| Signal | Derivation |
|--------|------------|
| HAS_QUESTION | Latest user comment contains a genuine information-seeking question (not rhetorical, not "Can you fix X?", not "Could you implement Y?") |
| IS_BLOCKED | `tags` contains "blocked" |
| HAS_IMPLEMENTATION_FEEDBACK | `commits.csv` contains at least one commit AND the latest user comment's modification time is more recent than the most recent agent comment's modification time. |
| REVIEW_APPROVED | `gates.mergeApproved` in the `<card>` block |
| IS_STALE | No activity for 30+ days |
| PLAN_REQUIRED | `gates.planRequired` in the `<card>` block |
| PLAN_APPROVED | `gates.planApproved` in the `<card>` block |
| HAS_PLAN | `plan/` directory in the card repository contains at least one `.md` file |
| USER_RESPONDED_TO_PLAN | `plan/` directory contains at least one `.md` file AND there exists a user-authored commit — more recent than the most recent `plan/*.md` file's commit — that adds or modifies non-metadata files. Metadata files (`CARD.meta.json`, `branches.json`, `commits.csv`, and their sidecars) are excluded; gate changes and status transitions do not constitute a plan response. |
| DOR_MET | Card description states what the user wants to achieve and why; acceptance criteria inferable; technical approach determinable |
| IS_TESTABLE_BUG | Card describes an expected-vs-actual behavior gap on a named surface (file, component, command, or user action). Stack traces and error messages count; so does an observable wrong behavior. "Sometimes" and "intermittent" do not disqualify — they describe the race the test must force. |

## 2. Route

Select the **first** matching condition and note the matched reference:

| Condition | Reference |
|-----------|-----------|
| HAS_QUESTION | `question-response` |
| IS_BLOCKED | `blocked` |
| HAS_IMPLEMENTATION_FEEDBACK | `implementation-feedback` |
| REVIEW_APPROVED | `merge` |
| IS_STALE | `clarify-and-enrich` |
| PLAN_REQUIRED AND NOT PLAN_APPROVED AND USER_RESPONDED_TO_PLAN | `plan-feedback` |
| PLAN_REQUIRED AND NOT PLAN_APPROVED | `plan` |
| NOT DOR_MET | `clarify-and-enrich` |
| PLAN_REQUIRED AND PLAN_APPROVED | `implementation-with-plan` |
| IS_TESTABLE_BUG | `bug` |
| Otherwise | `plan` |

**Fallback**: When conditions conflict, ask "What would a human team member do?" and write down why. Articulating the ambiguity usually resolves it.

## 3. Load Routed Reference

Read `./references/[MATCHED].md` and follow its instructions.

</routing-instructions>
