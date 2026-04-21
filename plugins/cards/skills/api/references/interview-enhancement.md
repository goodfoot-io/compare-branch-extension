<interview-before-creating-an-enhancement-card>

Reach the signal required to write a well-formed enhancement request before the card is created. The companion `./enhancement.md` defines the target CARD.md structure; this guide defines how to get there.

<first-principles>
1. The stated solution is a hypothesis — recover the underlying job.
2. A feature is defined by its contract (inputs, outputs, invariants, error behavior), not its code.
3. Empty, partial, and broken states are part of the feature.
4. Behavior at boundaries (limits, concurrency, permissions, failures) defines the feature more than behavior at the center.
5. Every new capability is also a new compatibility surface.
6. Observability is a requirement, not a follow-up.
7. Non-goals are as load-bearing as goals.
</first-principles>

<instructions>

## 1. Dispatch Research Immediately

Spawn `Explore` subagents in parallel with `run_in_background: true` before engaging the user. Research targets:
- Data flow, schemas, and API contracts adjacent to the request
- Why existing code is shaped this way (git log/blame on the affected surface)
- Existing extension points, feature flags, and compatibility surfaces
- Current observability coverage of the affected paths
- Tests that protect current behavior (or their absence)

Do not block on research. Proceed to Step 2: Load Writing Skills while subagents run.

## 2. Load Writing Skills

Load `cards:markdown` and the writing guide `./enhancement.md`. The writing guide defines the CARD.md structure this interview is driving toward.

## 3. Interview

Ask one question at a time via `AskUserQuestion`. Each question must:
- Target intent, priorities, trade-offs, disambiguation, or confirmation of load-bearing assumptions — never facts recoverable by research.
- Include a recommendation and each option's trade-offs, including downsides.
- Surface failure modes, edge cases, and invariants the user may not have considered. Do not shrink from hard questions; choices made here are cheaper than choices made in planning.

As research subagents return, fold findings into the accumulating draft (Step 4: Accumulate Findings) and let them sharpen the next question.

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

## 4. Accumulate Findings

No card exists yet. Hold research findings, user answers, rejected alternatives, and open questions in conversation state, shaped against the section structure in `./enhancement.md`.

## 5. Create the Card

When the user confirms enough signal has been gathered, create the card via the `card create` flow in the parent `cards:api` skill. Compose CARD.md against `./enhancement.md`. Include research excerpts, rejected alternatives, and any approach that emerged from research in `notes/` in the initial commit. Do not write `plan/` files — planning happens in a later step.

## 6. Constraints

- No implementation. No code, no scaffolding, no script execution.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Report failing tests or broken builds you encounter during research in the card; do not remediate.

## 7. Finalize

After `card create` succeeds and CARD.md (plus any notes) is committed, report the new card ID to the user.

**STOP** — Interview complete. Do not proceed to implementation.

</instructions>

</interview-before-creating-an-enhancement-card>
