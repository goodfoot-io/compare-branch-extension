# Card References

Per-condition reference files for the `$runtime:card` skill. The router in `../SKILL.md` evaluates card state, selects one condition, and reads the matched file.

## Consumer

**`$runtime:card` skill** — loads exactly one of these references per session, per Step 3 of `../SKILL.md`. References cross-load each other by sibling path (e.g. `./plan.md`) when one hands off to another.

## Routing Map

The condition → reference table lives in `../SKILL.md` Step 2 — the router is the single source of truth. Each routed condition maps to `[condition-reference].md` in this directory.

## Shared Procedures

- `planning.md` — Tier 2 self-plan procedure, also used by spawned `$runtime:card-planner` children in tier 3–4.
- `contest.md` — Tier 3–4 planner-contest spawn tree, loaded by `plan.md`.
- `implementation.md` — Tier 1 implementation, loaded by `plan.md`.
- `implementation-evaluation.md` — post-implementation evaluator wave, loaded by both implementation references when evaluation is needed.
- `bug-dirty-tree.md` — dirty-worktree triage, loaded by `bug.md` Step 1.1.

## Standalone Agent Skills (Not Consolidated)

These stay as distinct top-level skills for portability across agent systems — the skill ID is the contract a different harness honors, and each pairs with an `agents/openai.yaml` so it can be selected as a spawned agent role:

- `$runtime:card-developer` — spawned to implement a group of work.
- `$runtime:card-planner` — spawned per planner in the `contest.md` spawn tree.
- `$runtime:card-plan-failure-mode` — spawned as the reviewer in the `contest.md` spawn tree.
- `$runtime:card-failure-mode` — spawned as an evaluator in `implementation-evaluation.md`.
- `$runtime:card-experience-evaluator` — spawned as the Deep-depth evaluator in `implementation-evaluation.md`.
- `$runtime:card-pre-existing-condition` — spawned from both implementation references and `validate.md` when a validation failure looks pre-existing.
