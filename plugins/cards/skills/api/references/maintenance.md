<how-to-write-a-maintenance-request>

Explain **why the work matters** and **what success looks like** without prescribing implementation. Make the debt visible, bound the scope, and protect critical behavior. CARD.md describes the debt and its cost — approach observations that emerge during research belong in notes (`<take-notes>` instructions from `cards:notes` skill).

## Document Structure

| Section | Purpose | Question Answered |
|---------|---------|-------------------|
| Commander's Intent (no header in CARD.md) | Opening paragraph(s) per `./commanders-intent.md` — end state visible after the debt is retired | "What does the world look like when this debt is gone?" |
| Motivation & Impact | Explain why the work matters | "Why now?" |
| Current State | Describe the maintenance burden | "What is costly or risky today?" |
| Desired Outcomes | Define success without prescribing implementation | "What should improve?" |
| Scope & Constraints | Bound the work | "What is in/out, what must be preserved?" |
| Risks & Dependencies | Surface coordination and rollout needs | "What could go wrong or block us?" |
| Acceptance Signals | Make completion verifiable | "How do we know it's done?" |

## Section Notes

- **Commander's Intent** per `./commanders-intent.md` (no heading in CARD.md — the card opens with this paragraph). The destination must be describable without reference to the current mechanism; "table X removed" is a scope item, not an acceptance signal. Every downstream section serves the intent; anything that does not moves to `notes/` or the intent is wrong.
- **Motivation & Impact**: Anchor in measurable impact — operational risk, developer time, reliability, cost, deprecations.
  - Include evidence: incidents, metrics, toil.
  - Call out "interest" (ongoing cost) and "principal" (cleanup work).
- **Current State**: Observable facts — components, file paths, services, workflows, hotspots, versions.
  - Use code references, metrics, or links.
  - Reference self-admitted debt (TODO/FIXME).
- **Desired Outcomes**: Verifiable statements — reliability/stability targets, maintainability improvements, performance/cost targets, migration end-states.
  - Keep implementation-neutral unless hard constraints require otherwise.
- **Scope & Constraints**: In-scope and out-of-scope areas, what must not change (APIs, data formats, SLAs, user-facing behavior), compatibility requirements.
- **Risks & Dependencies**: Dependency upgrades, data migration, cross-team coordination, testing/observability gaps.
  - Note if phased rollout is likely needed.
- **Acceptance Signals**: User- or operator-observable conditions only; no properties of the chosen implementation.
  - Metrics/thresholds showing improvement, migration completion signals, documentation updates.
  - Avoid "done when refactor is complete" — use outcomes checkable by anyone.

## Key Principles

- **Intent over implementation**: State why and outcomes, not exact steps
- **Evidence over assertion**: Metrics, incidents, code references, diagrams for complex dependency or data flow relationships — not opinions. Fragment-link every named file, function, and type per `<markdown-guidelines>`.
- **Scope control**: Firm boundaries prevent refactor growth
- **Risk awareness**: Make dependencies and rollback paths explicit early

</how-to-write-a-maintenance-request>
