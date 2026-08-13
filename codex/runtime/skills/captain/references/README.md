# Captain References

Per-condition reference files for the `$runtime:captain` skill. The router in `../SKILL.md` evaluates card state, selects one condition, and reads the matched file.

## Consumer

**`$runtime:captain` skill** — loads exactly one of these references per session, per Step 3 of `../SKILL.md`. References cross-load each other by sibling path (e.g. `./plan.md`) when one hands off to another.

## Routing Map

The condition → reference table lives in `../SKILL.md` Step 2 — the router is the single source of truth. Each routed condition maps to `[condition-reference].md` in this directory.

## Shared Procedures

- `implementation.md` — implementation entry point for both plan-driven and direct work, loaded by `plan.md` and `implementation-feedback.md`.
- `bug-dirty-tree.md` — dirty-worktree triage, loaded by `bug.md` Step 1.1.
