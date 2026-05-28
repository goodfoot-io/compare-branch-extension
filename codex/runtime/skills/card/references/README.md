# Card References

Per-condition reference files for the `$card` skill. The router in `../SKILL.md` evaluates card state, selects one condition, and reads the matched file.

## Consumer

**`$card` skill** — loads exactly one of these references per session, per Step 3 of `../SKILL.md`. References cross-load each other by sibling path (e.g. `./plan.md`) when one hands off to another.

## Routing Map

| Condition | Reference |
|-----------|-----------|
| HAS_QUESTION | `question-response.md` |
| IS_BLOCKED | `blocked.md` |
| HAS_IMPLEMENTATION_FEEDBACK | `implementation-feedback.md` |
| REVIEW_APPROVED | `merge.md` |
| IS_STALE | `clarify-and-enrich.md` |
| PLAN_REQUIRED AND NOT PLAN_APPROVED AND USER_RESPONDED_TO_PLAN | `plan-feedback.md` |
| PLAN_REQUIRED AND NOT PLAN_APPROVED | `plan.md` |
| NOT DOR_MET | `clarify-and-enrich.md` |
| PLAN_REQUIRED AND PLAN_APPROVED | `implementation-with-plan.md` |
| IS_TESTABLE_BUG | `bug.md` |
| Otherwise | `plan.md` |

## Shared Procedures

- `planning.md` — Tier 2 self-plan procedure, also used by spawned `$card-planner` children in tier 3–4.
- `contest.md` — Tier 3–4 planner-contest spawn tree, loaded by `plan.md`.

## Standalone Agent Skills (Not Consolidated)

These stay as distinct top-level skills for portability across agent systems — the skill ID is the contract a different harness honors, and each pairs with an `agents/openai.yaml` so it can be selected as a spawned agent role:

- `$card-developer` — spawned to implement a group of work.
- `$card-planner` — spawned per planner in the `contest.md` spawn tree.
- `$card-plan-failure-mode` — spawned as the reviewer in the `contest.md` spawn tree.
- `$card-failure-mode` — spawned as an evaluator in `implementation-evaluation.md`.
- `$card-experience-evaluator` — spawned as the Deep-depth evaluator in `implementation-evaluation.md`.
- `$card-pre-existing-condition` — spawned from `implementation-with-plan.md` when validation fails on a pre-existing condition.
