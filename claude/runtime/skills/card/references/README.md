<!-- @goodfoot/agent-skills source: public/skills-src/runtime/card/references/README.md.eta sha256:d82474d4f8bc2443ea6667df9665fd250a9226f2d1c93f09efbdffecb2ccb04c -->
# Card References

Per-condition reference files for the `runtime:card` skill. The router in `../SKILL.md` evaluates card state, selects one condition, and reads the matched file.

## Consumer

**`runtime:card` skill** — loads exactly one of these references per session, per Step 3 of `../SKILL.md`. The skill is self-contained: it shares no reference files with `runtime:captain`. Protocol references dispatch the plugin's shared `runtime:card:*` agents (and their portability skills), which are plugin assets, not card-skill dependencies.

## Routing Map

The condition → reference table lives in `../SKILL.md` Step 2 — the router is the single source of truth. Each routed condition maps to `[condition-reference].md` in this directory.

## Shared Procedures

- `implementation.md` — implementation entry point for both plan-driven and direct work, loaded by `plan.md` and `implementation-feedback.md`.
- `implementation-evaluation.md` — post-implementation review, loaded by `implementation.md` when evaluation is needed.
- `bug-dirty-tree.md` — dirty-worktree triage, loaded by `bug.md` Step 1.1.

## Escalation Protocols (Loaded by Judgment)

Loaded only when the orchestrator chooses the heavy end of a step's weight spectrum:

- `contest.md` — parallel planner contest, loaded by `plan.md` Step 2.
- `developer-wave.md` — persistent developer-team delegation, loaded by `implementation.md`, `implementation-evaluation.md`, and `evaluation-wave.md`.
- `evaluation-wave.md` — background evaluator protocol, loaded by `implementation-evaluation.md` Step 3 and `validate.md` Step 4.

## Not Router-Reachable

- `shutdown.md` — shutdown runbook. Loaded by the idle-nudge hooks via a hard-coded path when `EXIT_WHEN_DONE=true`; also referenced by the terminal-state protocol. Never loaded by the router.
