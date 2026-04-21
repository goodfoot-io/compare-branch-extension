---
name: interview-enhancement
description: Enrich enhancement cards with codebase context.
---

Review ./enhancement.md

<first-principles>
1. The stated solution is a hypothesis — recover the underlying job.
2. A feature is defined by its contract (inputs, outputs, invariants, error behavior), not its code.
3. Empty, partial, and broken states are part of the feature.
4. Behavior at boundaries (limits, concurrency, permissions, failures) defines the feature more than behavior at the center.
5. Every new capability is also a new compatibility surface.
6. Observability is a requirement, not a follow-up.
7. Non-goals are as load-bearing as goals.
</first-principles>

<critical-constraints>

- No implementation. No code, no scaffolding, no script execution.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Report failing tests or broken builds in the card; do not remediate.

</critical-constraints>

<instructions>

## 1. Dispatch Research Immediately

Spawn `Explore` subagents in parallel with `run_in_background: true` before engaging the user. Research targets:
- Data flow, schemas, and API contracts adjacent to the request
- Why existing code is shaped this way (git log/blame on the affected surface)
- Existing extension points, feature flags, and compatibility surfaces
- Current observability coverage of the affected paths
- Tests that protect current behavior (or their absence)

Do not block on research. Proceed to Section 2 while subagents run.

## 2. Load Card Skills

Load `cards:notes` and `cards:markdown` in parallel.

## 3. Interview

Ask one question at a time via `AskUserQuestion`. Each question must:
- Target intent, priorities, trade-offs, disambiguation, or confirmation of load-bearing assumptions — never facts recoverable by research.
- Include a recommendation and each option's trade-offs, including downsides.
- Surface failure modes, edge cases, and invariants the user may not have considered. Do not shrink from hard questions; choices made here are cheaper than choices made in planning.

As research subagents return, fold findings into the card (Section 4) and let them sharpen the next question.

Prioritize question domains aligned with the first principles:
- **Job-to-be-done vs. stated mechanism** — is the described solution the only acceptable shape?
- **Contract** — required vs. optional inputs, output stability, idempotency, concurrency
- **Boundary behavior** — empty, null, oversized, unauthorized, offline, timeout, rate-limited
- **Failure posture** — fail-open vs. fail-closed, retry semantics, user-visible messaging
- **Compatibility** — existing data, URLs, APIs, keybindings, adjacent features at risk of regression
- **Rollout** — feature flag, staged, all-at-once; migration of existing state
- **Observability** — metrics/logs/traces required to know the feature is working
- **Accessibility, i18n, privacy** — scope and must-haves when applicable
- **Acceptance** — what a demo looks like; who signs off
- **Non-goals** — explicitly out-of-scope

## 4. Update the Card Continually

Open `CARD.md` per `./commanders-intent.md` before drafting any structured section, then confirm the opening with the user via `AskUserQuestion` with options `accept`, `refine`, `reject`. If the user's first description named a mechanism, recover the underlying job before drafting.

After each material exchange or research return, update in place. Do not batch to the end.

- `CARD.meta.json` — title and metadata
- `CARD.md` — Commander's Intent paragraph first, then the section structure in `./enhancement.md`
- `notes/` — research findings, rejected alternatives, open questions
- `plan/` — decision logs and load-bearing assumptions only; do **not** write an implementation plan

Commit frequently so the card improves monotonically.

## 5. Finalize

When the user confirms the card is complete, reconcile notes into `CARD.md`, ensure every load-bearing assumption is recorded, then:

```bash
cd $CARD_REPO_PATH
git add -A
git commit -m "[single sentence summarizing how the enhancement was scoped and key decisions from the interview]"  # <card-repo-commit-style>
```

**STOP** — Interview complete. Do not proceed to implementation.

</instructions>
