---
name: card-routing
description: Evaluate card state and load the appropriate skill.
---

<routing-constraints>
The routing phase evaluates and selects — it does NOT implement, plan, or modify card content. After routing, the matched skill is loaded and its instructions take over.

| Routing phase | Loaded skill handles |
|------------------------|--------------------------------|
| Evaluating routing conditions | Implementation work |
| Selecting the appropriate skill | Plan creation and revision |
| Loading the matched skill | Bug fixing |
| | Merging, clarification, and responses |


</routing-constraints>

<quiet>
Routing runs without user interaction. Messages describing the state and routing descisions are not required.
</quiet>

<instructions>

## 1. Evaluate Routing Signals

### 1.1 Read Card State

Read `CARD.meta.json` to obtain `gates.*` and `tags`. Read `comment/*.md` files sorted by modification time (newest first) to identify the latest user comment and the most recent agent comment.

### 1.2 Derive Routing Signals

> **Comment authorship convention**: Agent-authored comments contain structured report headers (e.g., `## Implementation Summary`, `## Implementation Evaluation`, `## Plan Assessment Report`). Comments lacking these headers are treated as user-authored. Sort `comment/*.md` by modification time; the most recent file not matching the agent pattern is the "latest user comment."

| Signal | Derivation |
|--------|------------|
| HAS_ACTIVE_INFRASTRUCTURE_ERROR | Most recent agent comment reports unresolved disk, network, permission, or environment failure (historical resolved errors do not match) |
| HAS_QUESTION | Latest user comment contains a genuine information-seeking question (not rhetorical, not "Can you fix X?", not "Could you implement Y?") |
| IS_BLOCKED | `tags` contains "blocked" |
| HAS_IMPLEMENTATION_FEEDBACK | `workspace-commits.csv` contains at least one commit AND the latest user comment's modification time is more recent than the most recent agent comment's modification time. |
| REVIEW_APPROVED | `gates.reviewApproved` in CARD.meta.json |
| IS_STALE | No activity for 30+ days |
| PLAN_REQUIRED | `gates.planRequired` in CARD.meta.json |
| PLAN_APPROVED | `gates.planApproved` in CARD.meta.json |
| USER_RESPONDED_TO_PLAN | PLAN.md exists AND latest user comment is more recent than the agent comment that submitted the plan for approval. Identify the plan-submission agent comment as the most recent agent-authored comment whose body contains 'PLAN.md' or was created at the same modification time as PLAN.md. Compare that comment's file modification time against the latest user comment's modification time. |
| DOR_MET | Problem statement exists, acceptance criteria inferable, technical approach determinable |
| IS_TESTABLE_BUG | Card description has error evidence (stack traces, error messages) AND bug is programmatically verifiable |

## 2. Route

Select the **first** matching condition:

- **1. HAS_ACTIVE_INFRASTRUCTURE_ERROR**: `runtime:card-error-recovery`
- **2. HAS_QUESTION**: `runtime:card-question-response`
- **3. IS_BLOCKED**: `runtime:card-blocked`
- **4. HAS_IMPLEMENTATION_FEEDBACK**: `runtime:card-implementation-feedback`
- **5. REVIEW_APPROVED**: `runtime:card-merge`
- **6. IS_STALE**: `runtime:card-clarify-and-enrich`
- **7. PLAN_REQUIRED AND NOT PLAN_APPROVED AND USER_RESPONDED_TO_PLAN**: `runtime:card-plan-feedback` + `runtime:plan`
- **8. PLAN_REQUIRED AND NOT PLAN_APPROVED**: `runtime:card-plan` + `runtime:plan`
- **9. NOT DOR_MET**: `runtime:card-clarify-and-enrich`
- **10. PLAN_APPROVED**: `runtime:card-implementation-with-plan`
- **11. IS_TESTABLE_BUG**: `runtime:card-bug`
- **12. Otherwise**: `runtime:card-implementation` + `runtime:plan`

**Fallback**: When conditions conflict, ask "What would a human team member do?" — then write down why you're asking. Articulating the ambiguity usually resolves it.

## 3. Load Routed Skill

Load the matched skill using the Skill tool. Some routes require additional skills to be loaded alongside the primary skill.

```xml
<invoke name="Skill">
<parameter name="skill">[MATCHED_SKILL]</parameter>
</invoke>
```

When the route specifies additional skills (shown as "+ `skill:name`"), load each one immediately after:

```xml
<invoke name="Skill">
<parameter name="skill">[ADDITIONAL_SKILL]</parameter>
</invoke>
```

</instructions>
