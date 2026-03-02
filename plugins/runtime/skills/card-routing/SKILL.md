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

**Never update card status directly** — hooks handle status transitions automatically.
</routing-constraints>

<instructions>

## 1. Evaluate Routing Signals

### 1.1 Read Card State

Read `CARD.meta.json` to obtain `gates.*` and `tags`. Read `comment/*.md` files sorted by modification time (newest first) to identify the latest user comment and the most recent agent comment.

### 1.2 Derive Routing Signals

> **Comment authorship convention**: Agent-authored comments contain structured report headers (e.g., `## Implementation Summary`, `## Implementation Evaluation`, `## Plan Assessment Report`). Comments lacking these headers are treated as user-authored. Sort `comment/*.md` by modification time; the most recent file not matching the agent pattern is the "latest user comment."

| Signal | Derivation |
|--------|------------|
| PLAN_REQUIRED | `gates.planRequired` in CARD.meta.json |
| PLAN_APPROVED | `gates.planApproved` in CARD.meta.json |
| REVIEW_APPROVED | `gates.reviewApproved` in CARD.meta.json |
| IS_BLOCKED | `tags` contains "blocked" |
| HAS_ACTIVE_INFRASTRUCTURE_ERROR | Most recent agent comment reports unresolved disk, network, permission, or environment failure (historical resolved errors do not match) |
| HAS_QUESTION | Latest user comment contains a genuine information-seeking question (not rhetorical, not "Can you fix X?", not "Could you implement Y?") |
| HAS_REOPEN_REQUEST | Latest user comment indicates card is not complete (missed requirements, found bugs, wants changes) |
| IS_STALE | No activity for 30+ days |
| IS_TESTABLE_BUG | Card description has error evidence (stack traces, error messages) AND bug is programmatically verifiable |
| DOR_MET | Problem statement exists, acceptance criteria inferable, technical approach determinable |
| USER_RESPONDED_TO_PLAN | PLAN.md exists AND latest user comment is more recent than the agent comment that submitted the plan for approval. Identify the plan-submission agent comment as the most recent agent-authored comment whose body contains 'PLAN.md' or was created at the same modification time as PLAN.md. Compare that comment's file modification time against the latest user comment's modification time. |
| HAS_IMPLEMENTATION_FEEDBACK | `gates.reviewApproved` is false AND the most recent agent-authored comment contains "awaiting review" or "awaiting approval" (case-insensitive) AND the latest user comment's modification time is more recent than that agent comment's modification time. |

## 2. Route

Select the **first** matching condition:

- **1. HAS_ACTIVE_INFRASTRUCTURE_ERROR**: `runtime:card-error-recovery`
- **2. HAS_QUESTION**: `runtime:card-question-response`
- **3. REVIEW_APPROVED AND HAS_REOPEN_REQUEST**: `runtime:card-reopen-and-implement`
- **4. REVIEW_APPROVED**: `runtime:card-merge`
- **5. IS_BLOCKED**: `runtime:card-blocked`
- **6. IS_STALE**: `runtime:card-clarify-and-enrich`
- **7. PLAN_REQUIRED AND NOT PLAN_APPROVED AND USER_RESPONDED_TO_PLAN**: `runtime:card-plan-feedback`
- **8. PLAN_REQUIRED AND NOT PLAN_APPROVED**: `runtime:card-plan`
- **9. NOT DOR_MET**: `runtime:card-clarify-and-enrich`
- **10. HAS_IMPLEMENTATION_FEEDBACK**: `runtime:card-implementation-feedback`
- **11. PLAN_APPROVED**: `runtime:card-implementation-with-plan`
- **12. IS_TESTABLE_BUG**: `runtime:card-bug`
- **13. Otherwise**: `runtime:card-implementation`

**Fallback**: When conditions conflict, ask "What would a human team member do?" — then write down why you're asking. Articulating the ambiguity usually resolves it.

## 3. Load Routed Skill

Load the matched skill using the Skill tool:

```xml
<invoke name="Skill">
<parameter name="skill">[MATCHED_SKILL]</parameter>
</invoke>
```

</instructions>
