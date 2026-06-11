

<placeholder-variables>
[CARD_ID] — The card identifier, used to scope the planning team's name
[N_PLANNERS] — Number of parallel planners for the selected tier (2 for tier 3, 4 for tier 4)
</placeholder-variables>

<instructions>

## 1. Select Planning Tier

Tier selection is driven by **unknowns**, not work volume. Parallel planners exist to explore the *solution space* — the value of running more planners grows with the number of viable approaches, not with the number of files or lines of code. A large, mechanical change with one obvious approach is tier 2 even if it touches many files. A small change with several plausible mechanisms, contested trade-offs, or ambiguous acceptance criteria is tier 3 or 4 even if it touches one file.

Read CARD.meta.json and assess the unknowns:

- **How many reasonable approaches could a planner take?** One → tier 2. Two or three → tier 3. Four or more → tier 4.
- **How contested are the trade-offs?** If competing approaches each optimize for a different axis (performance vs. simplicity, correctness vs. migration effort, consistency vs. incremental rollout), the space is worth exploring.
- **How ambiguous is the card?** Acceptance criteria open to multiple user-experience interpretations favor more planners.
- **How much unverified domain knowledge does planning require?** Unfamiliar libraries, concurrency primitives, external APIs, or legacy subsystems raise the unknowns count.

Volume-only cards — many files but one mechanism — do **not** warrant tier 3 or 4. If the only question is execution effort, tier 2 is correct.

| Tier | When |
|------|------|
| 1 | No plan — one obvious mechanism, minimal risk, planning adds no value |
| 2 | Orchestrator self-plans inline — one approach dominates; work may be large but direction is clear |
| 3 | 2 `planner` subagents + 1 `plan-failure-mode` — 2–3 plausible approaches with real trade-offs |
| 4 | 4 `planner` subagents + 1 `plan-failure-mode` — 4+ plausible approaches or deep unknowns that benefit from diverse exploration |

If `gates.planRequired` is true, skip tier 1 — always create a plan (tier 2–4).

If `gates.planApproved` is true, skip to Step 3: Route to Implementation — the plan is already approved, proceed to implementation.

If plan files already exist in `plans/` but are not approved, the minimum tier is 3 — always dispatch at least one `plan-failure-mode` subagent to evaluate the existing plan. The contest is the mechanism by which that evaluation happens: per `./contest.md`, one planner is seeded with the pre-existing plan as the **incumbent** and defends it through review; the others draft fresh as challengers. This way the prior work is actually graded rather than re-derived in parallel.

## 2. Dispatch

The gates evaluated in Step 1 (`gates.planRequired`, `gates.planApproved`) are the only authorization required to dispatch. Do not pause to confirm tier selection, plan size, or scope with the user before entering a tier. Asking "shall I proceed?" or offering (a)/(b) options is a protocol violation.

### Tier 1

No plan needed. Skip to Step 3: Route to Implementation.

### Tier 2 — Orchestrator Self-Plans

Read `./planning.md` and follow its instructions. Set `[PLAN_FILE]` to `plans/initial.md` (or a semantically descriptive slug if the card's nature suggests one, e.g., `plans/phase-2.md` for follow-on work). Do not create a team; do not dispatch subagents.

After the plan is written, spiked, and committed, proceed to Step 3: Route to Implementation.

### Tier 3–4 — Contest Parallel Planners

Set `[N_PLANNERS]` to `2` for tier 3 or `4` for tier 4. Read `./contest.md` and follow its instructions.

On return:
- **`APPROVED`**: Proceed to Step 3: Route to Implementation.
- **`BLOCKED`**: **STOP** — do not route to implementation.

## 3. Route to Implementation

The gates consulted in Step 1 determine the route. Do not re-prompt the user for confirmation — `gates.planApproved` and `gates.planRequired` are the authorization. Asking "shall I proceed?" or offering (a)/(b) options is a protocol violation.

Based on tier and gates:

- **Tier 1**: Read `./implementation.md` and follow its instructions.
- **`planRequired` is true**: **STOP** — plan submitted for approval. Do not modify gates in `CARD.meta.json`.
- **`planRequired` is false**: Read `./implementation-with-plan.md` and follow its instructions.

</instructions>
