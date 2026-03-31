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
Routing runs without user interaction. Messages describing state and routing decisions are not required.
</quiet>

<instructions>

## 1. Evaluate Routing Signals

### 1.1 Read Card State

Read `CARD.meta.json` to obtain `gates.*` and `tags`. Read `comment/*.md` files sorted by modification time (newest first) to identify the latest user comment and the most recent agent comment.

### 1.2 Derive Routing Signals

> **Comment authorship convention**: Determine authorship from the git commit that added each comment file: `git log --diff-filter=A --format='%an' -1 -- comment/<file>`. User-authored comments are committed by the user's git identity; agent-authored comments are committed by the agent's git identity. Sort `comment/*.md` by modification time; the most recent user-authored file is the "latest user comment."

| Signal | Derivation |
|--------|------------|
| HAS_ACTIVE_INFRASTRUCTURE_ERROR | Most recent agent comment reports unresolved disk, network, permission, or environment failure (historical resolved errors do not match) |
| HAS_QUESTION | Latest user comment contains a genuine information-seeking question (not rhetorical, not "Can you fix X?", not "Could you implement Y?") |
| IS_BLOCKED | `tags` contains "blocked" |
| HAS_IMPLEMENTATION_FEEDBACK | `workspace-commits.csv` contains at least one commit AND the latest user comment's modification time is more recent than the most recent agent comment's modification time. |
| REVIEW_APPROVED | `gates.mergeApproved` in CARD.meta.json |
| IS_STALE | No activity for 30+ days |
| PLAN_REQUIRED | `gates.planRequired` in CARD.meta.json |
| PLAN_APPROVED | `gates.planApproved` in CARD.meta.json |
| USER_RESPONDED_TO_PLAN | PLAN.md exists AND latest user comment is more recent than the plan-submission agent comment. Plan-submission comment: most recent agent-authored comment whose body contains 'PLAN.md' or was created at the same modification time as PLAN.md. Compare that comment's file modification time against the latest user comment's. |
| DOR_MET | Card description states what the user wants to achieve and why; acceptance criteria inferable; technical approach determinable |
| IS_TESTABLE_BUG | Card description has error evidence (stack traces, error messages) AND bug is programmatically verifiable |

## 2. Route

Select the **first** matching condition:

- **1. HAS_ACTIVE_INFRASTRUCTURE_ERROR**: `runtime:card-error-recovery`
- **2. HAS_QUESTION**: `runtime:card-question-response`
- **3. IS_BLOCKED**: `runtime:card-blocked`
- **4. HAS_IMPLEMENTATION_FEEDBACK**: `runtime:card-implementation-feedback`
- **5. REVIEW_APPROVED**: `runtime:card-merge`
- **6. IS_STALE**: `runtime:card-clarify-and-enrich`
- **7. PLAN_REQUIRED AND NOT PLAN_APPROVED AND USER_RESPONDED_TO_PLAN**: `runtime:card-plan-feedback`
- **8. PLAN_REQUIRED AND NOT PLAN_APPROVED**: `runtime:card-plan`
- **9. NOT DOR_MET**: `runtime:card-clarify-and-enrich`
- **10. PLAN_APPROVED**: `runtime:card-implementation-with-plan`
- **11. IS_TESTABLE_BUG**: `runtime:card-bug`
- **12. Otherwise**: `runtime:card-implementation`

**Fallback**: When conditions conflict, ask "What would a human team member do?" and write down why. Articulating the ambiguity usually resolves it.

## 3. Load Routed Skill

Load the matched skill using the Skill tool.

```xml
<invoke name="Skill">
<parameter name="skill">[MATCHED_SKILL]</parameter>
</invoke>
```

</instructions>
