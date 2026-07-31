# Card References

Per-condition reference files for the `runtime:card` skill. The router in `../SKILL.md` evaluates card state, selects one condition, and reads the matched file.

## Consumer

**`runtime:card` skill** — loads exactly one of these references per session, per Step 3 of `../SKILL.md`. References cross-load each other by sibling path (e.g. `./plan.md`) when one hands off to another.

## Routing Map

The condition → reference table lives in `../SKILL.md` Step 2 — the router is the single source of truth. Each routed condition maps to `[condition-reference].md` in this directory.

## Shared Procedures

- `planning.md` — Tier 2 self-plan procedure, also loaded by the `runtime:card-planner` subagent in tier 3–4.
- `contest.md` — Tier 3–4 planner-contest dispatch, loaded by `plan.md`.
- `implementation.md` — Tier 1 implementation, loaded by `plan.md`.
- `implementation-evaluation.md` — post-implementation evaluator wave, loaded by both implementation references when evaluation is needed.
- `bug-dirty-tree.md` — dirty-worktree triage, loaded by `bug.md` Step 1.1.

## Not Router-Reachable

- `shutdown.md` — shutdown handshake runbook. Loaded by the exit-when-done Stop hook via a hard-coded path, never by the router; renaming it breaks that reference.

## Standalone Agent Skills (Not Consolidated)

These stay as distinct top-level skills for portability to non-Claude agent systems — the skill ID is the contract a different harness honors:

- `runtime:card-developer` — loaded via foreground subagent frontmatter.
- `runtime:card-planner` — loaded via team dispatch prompt in `contest.md`.
- `runtime:card-plan-failure-mode` — loaded via team dispatch prompt in `contest.md`.
- `runtime:card-failure-mode` — loaded via team dispatch prompt in `implementation-evaluation.md`.
- `runtime:card-experience-evaluator` — loaded via team dispatch prompt in `implementation-evaluation.md`.
- `runtime:card-pre-existing-condition` (skill) — loaded via the `runtime:card:pre-existing-condition` agent's frontmatter; dispatched from both implementation references and `validate.md` when a validation failure looks pre-existing. Invoke as agent `runtime:card:pre-existing-condition` (colons), not by the skill name (hyphens).
