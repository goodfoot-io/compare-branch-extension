---
name: interview-maintenance
description: Enrich maintenance cards with codebase context.
---

Review ./maintenance.md

<first-principles>
1. Debt is only debt if it costs something observable — incidents, toil, risk, blocked work — not aesthetic.
2. Invariants are the contract with the rest of the system. What must not change matters more than what will.
3. A refactor without a safety net is a rewrite. Tests, observability, and rollback paths are preconditions.
4. Partial migrations are a steady state to be designed, not an accident to be avoided.
5. Consumers are part of the system. Any change to shared surfaces is a coordination problem.
6. The end state must be describable without reference to the current state.
7. Removal is the completion criterion — debt is not retired until the old path is gone.
</first-principles>

<instructions>

## 1. Dispatch Research Immediately

Spawn `Explore` subagents in parallel with `run_in_background: true` before engaging the user. Research targets:
- Complexity-vs.-churn hotspots on the subject (git log frequency + file size/complexity)
- Test coverage of the subject; flaky or missing cases
- Dependency freshness and deprecation signals from lockfiles
- Public surfaces and their consumers (imports, API callers, exported types)
- TODO/FIXME/`deprecated` markers in-scope

Do not block on research. Proceed to Section 2 while subagents run.

## 2. Load Card Skills

Load `cards:notes` and `cards:markdown` in parallel.

## 3. Interview

Ask one question at a time via `AskUserQuestion`. Each question must:
- Target motivation, invariants, rollout strategy, and completion criteria — never facts recoverable by research.
- Include a recommendation and each option's trade-offs, including downsides.
- Force the user to name what must *not* change; unstated invariants produce regressions.

As research subagents return, fold findings into the card (Section 4) and let them sharpen the next question.

Prioritize question domains aligned with the first principles:
- **Observable cost today** — incidents, toil, latency, $$, blocked work
- **Forcing function** — EOL, upstream deprecation, compliance, security
- **Invariants** — public APIs, data formats, SLAs, keybindings, UX contracts that must be preserved
- **Safe-to-change** — behaviors explicitly free to shift
- **Rollout strategy** — big-bang, strangler, dual-write, flagged
- **Reversibility** — rollback plan, blast radius if rollout fails
- **Partial-migration tolerance** — is a half-migrated steady state acceptable, for how long
- **Consumer coordination** — who must be notified or updated
- **Completion criterion** — what "done" looks like; is old code removed
- **Performance/observability budget** — what may regress and by how much

## 4. Update the Card Continually

After each material exchange or research return, update in place. Do not batch to the end.

- `CARD.meta.json` — title and metadata
- `CARD.md` — per `./maintenance.md` structure
- `notes/` — research findings, consumer inventory, rejected approaches
- `plan/` — decision logs and load-bearing assumptions only; do **not** write a migration plan

Commit frequently so the card improves monotonically.

## 5. Constraints

- No refactoring. No dependency upgrades. No code changes of any kind.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Report failing tests or broken builds in the card; do not remediate.

## 6. Finalize

When the user confirms the card is complete, reconcile notes into `CARD.md`, ensure every load-bearing assumption is recorded, then:

```bash
cd $CARD_REPO_PATH
git add -A
git commit -m "[single sentence summarizing the maintenance approach and key decisions from the interview]"  # <card-repo-commit-style>
```

**STOP** — Interview complete. Do not proceed to implementation.

</instructions>
