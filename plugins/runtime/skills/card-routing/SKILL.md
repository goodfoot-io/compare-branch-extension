---
name: card-routing
description: Recommend the appropriate skill based on card state.
---

<routing-constraints>
The router evaluates, routes, and coordinates — it does NOT implement, plan, or modify card content.

| Router handles directly | Other skills handle |
|------------------------|--------------------------------|
| Evaluating routing conditions | Implementation work |
| Recommending the appropriate skill | Plan creation and revision |
| | Bug fixing |
| | Merging, clarification, and responses |

**Never update card status directly** — hooks handle status transitions automatically.
</routing-constraints>

<instructions>

## 1. Evaluate Routing Signals

| Signal | Derivation |
|--------|------------|
| STATUS | `status` in CARD.meta.json |
| PLAN_REQUIRED | `gates.planRequired` in CARD.meta.json |
| PLAN_APPROVED | `gates.planApproved` in CARD.meta.json |
| REVIEW_APPROVED | `gates.reviewApproved` in CARD.meta.json |
| IS_BLOCKED | `tags` contains "blocked" |
| HAS_ACTIVE_INFRASTRUCTURE_ERROR | Most recent agent comment reports unresolved disk, network, permission, or environment failure (historical resolved errors do not match) |
| HAS_QUESTION | Latest user comment contains a genuine information-seeking question (not rhetorical, not "Can you fix X?", not "Could you implement Y?") |
| HAS_MODIFICATION_REQUEST | Latest user comment requests changes ("update", "change", "fix", "modify", "add", "remove") |
| HAS_REOPEN_REQUEST | Latest user comment indicates card is not complete (missed requirements, found bugs, wants changes) |
| IS_STALE | No activity for 30+ days AND status not "done" or "archived" |
| IS_TESTABLE_BUG | Card description has error evidence (stack traces, error messages) AND bug is programmatically verifiable |
| DOR_MET | Problem statement exists, acceptance criteria inferable, technical approach determinable |
| USER_RESPONDED_TO_PLAN | PLAN.md exists AND latest user comment is more recent than the agent comment that submitted the plan for approval |

## 2. Route

Select the **first** matching condition:

- **1. HAS_ACTIVE_INFRASTRUCTURE_ERROR**: `runtime:card-error-recovery`
- **2. HAS_QUESTION**: `runtime:card-question-response`
- **3. STATUS = "backlog"**: `runtime:card-backlog-response`
- **4. REVIEW_APPROVED**: `runtime:card-merge`
- **5. IS_BLOCKED**: `runtime:card-blocked`
- **6. STATUS = "done" AND HAS_REOPEN_REQUEST**: `runtime:card-reopen-and-implement`
- **7. STATUS = "done"**: `runtime:card-no-action`
- **8. STATUS = "needs_review" AND NOT HAS_MODIFICATION_REQUEST**: `runtime:card-awaiting-review`
- **9. IS_STALE AND STATUS != "needs_review"**: `runtime:card-clarification`
- **10. PLAN_REQUIRED AND NOT PLAN_APPROVED AND USER_RESPONDED_TO_PLAN**: `runtime:card-plan-feedback`
- **11. PLAN_REQUIRED AND NOT PLAN_APPROVED**: `runtime:card-plan`
- **12. STATUS = "todo" AND NOT DOR_MET**: `runtime:card-clarification`
- **13. PLAN_APPROVED**: `runtime:card-implementation-with-plan`
- **14. IS_TESTABLE_BUG**: `runtime:card-bug`
- **15. Otherwise**: `runtime:card-implementation`

**Fallback**: When conditions conflict, ask "What would a human team member do?" — then write down why you're asking. Articulating the ambiguity usually resolves it.

## 3. Send Skill Recommendation

Send the matched skill name to the team lead:

```xml
<invoke name="SendMessage">
<parameter name="type">message</parameter>
<parameter name="recipient">team-lead</parameter>
<parameter name="content">Recommended skill: [MATCHED_SKILL]</parameter>
<parameter name="summary">Route: [MATCHED_SKILL]</parameter>
</invoke>
```

Then **STOP**.

</instructions>
