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
| IS_TESTABLE_BUG | Card description has error evidence (stack traces, error messages) AND bug is programmatically verifiable |

## 2. Route

Select the **first** matching condition:

- **1. HAS_QUESTION**: `runtime:card-question-response`
- **2. IS_BLOCKED**: `runtime:card-blocked`
- **3. HAS_IMPLEMENTATION_FEEDBACK**: `runtime:card-implementation-feedback`
- **4. REVIEW_APPROVED**: `runtime:card-merge`
- **5. IS_STALE**: `runtime:card-clarify-and-enrich`
- **6. PLAN_REQUIRED AND NOT PLAN_APPROVED AND USER_RESPONDED_TO_PLAN**: `runtime:card-plan-feedback`
- **7. PLAN_REQUIRED AND NOT PLAN_APPROVED**: `runtime:card-plan`
- **8. NOT DOR_MET**: `runtime:card-clarify-and-enrich`
- **9. PLAN_REQUIRED AND PLAN_APPROVED**: `runtime:card-implementation-with-plan`
- **10. IS_TESTABLE_BUG**: `runtime:card-bug`
- **11. Otherwise**: `runtime:card-plan`

**Fallback**: When conditions conflict, ask "What would a human team member do?" and write down why. Articulating the ambiguity usually resolves it.

## 3. Load Routed Skill

Load the matched skill using the Skill tool.

```xml
<invoke name="Skill">
<parameter name="skill">[MATCHED_SKILL]</parameter>
</invoke>
```

</routing-instructions>
