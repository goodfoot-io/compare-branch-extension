---
name: slice
description: Evaluate card state and load the appropriate reference for a slicing session.
---

<routing-constraints>
The routing phase evaluates and selects — it does NOT slice, implement, or modify card content. After routing, the matched reference is loaded and its instructions take over.

| Routing phase | Loaded reference handles |
|------------------------|--------------------------------|
| Evaluating routing conditions | Slice dispatch and iteration |
| Selecting the appropriate reference | Gate-mismatch reporting |
| Loading the matched reference | Merging and clarification |

</routing-constraints>

<quiet>
Routing runs without user interaction. Messages describing state and routing decisions are not required.
</quiet>

<routing-instructions>

## 1. Evaluate Routing Signals

### 1.1 Read Card State

Obtain `gates.*` and `tags` from the `<card>` block in your session context. Obtain the comment file listing from the `$CARD_REPO_PATH/comments` directory.

### 1.2 Derive Routing Signals

| Signal | Derivation |
|--------|------------|
| IS_BLOCKED | `tags` contains "blocked" |
| REVIEW_APPROVED | `gates.mergeApproved` in the `<card>` block |
| PLAN_REQUIRED | `gates.planRequired` in the `<card>` block |
| PLAN_APPROVED | `gates.planApproved` in the `<card>` block |
| DOR_MET | Card description states what the user wants to achieve and why; acceptance criteria inferable; public-API surface determinable from CARD.md, comments, and referenced code |
| IS_TESTABLE_BUG | Card describes an expected-vs-actual behavior gap on a named surface (file, component, command, or user action). Stack traces and error messages count; so does an observable wrong behavior. "Sometimes" and "intermittent" do not disqualify — they describe the race the test must force. |

Questions and implementation feedback are not routing signals in slicing mode — the slice orchestrator reads the full card (CARD.md, comments, notes, prior commits) and folds questions, feedback, and fresh scope into the next slice's brief.

## 2. Route

Select the **first** matching condition and note the matched reference:

| Condition | Reference |
|-----------|-----------|
| IS_BLOCKED | `blocked` |
| REVIEW_APPROVED | `merge` |
| NOT DOR_MET | `clarify-and-enrich` |
| PLAN_REQUIRED AND NOT PLAN_APPROVED | `needs-plan-approval` |
| IS_TESTABLE_BUG | `bug` |
| Otherwise | `slice` |

**Fallback**: When conditions conflict, ask "What would a human team member do?" and write down why. Articulating the ambiguity usually resolves it.

## 3. Load Routed Reference

Read `./references/[MATCHED].md` and follow its instructions.

</routing-instructions>
