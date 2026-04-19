<interview-before-creating-a-maintenance-card>

Reach the signal required to write a well-formed maintenance request before the card is created. The companion `./maintenance.md` defines the target CARD.md structure; this guide defines how to get there.

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

Do not block on research. Proceed to Step 2: Load Writing Skills while subagents run.

## 2. Load Writing Skills

Load `cards:markdown` and the writing guide `./maintenance.md`. The writing guide defines the CARD.md structure this interview is driving toward.

## 3. Interview

Ask one question at a time via `AskUserQuestion`. Each question must:
- Target motivation, invariants, rollout strategy, and completion criteria — never facts recoverable by research.
- Include a recommendation and each option's trade-offs, including downsides.
- Force the user to name what must *not* change; unstated invariants produce regressions.

As research subagents return, fold findings into the accumulating draft (Step 4: Accumulate Findings) and let them sharpen the next question.

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

## 4. Accumulate Findings

No card exists yet. Hold research findings, consumer inventory, and rejected approaches in conversation state, shaped against the section structure in `./maintenance.md`.

## 5. Create the Card

When the user confirms enough signal has been gathered, create the card via the `card create` flow in the parent `cards:api` skill. Compose CARD.md against `./maintenance.md`. Write plan files only if an approach has emerged clearly from research — otherwise omit. Include consumer inventory and rejected approaches in `notes/` in the initial commit.

## 6. Constraints

- No refactoring. No dependency upgrades. No code changes of any kind.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Report failing tests or broken builds you encounter during research in the card; do not remediate.

## 7. Finalize

After `card create` succeeds and CARD.md (plus any notes/plan) is committed, report the new card ID to the user.

**STOP** — Interview complete. Do not proceed to implementation.

</instructions>

</interview-before-creating-a-maintenance-card>
