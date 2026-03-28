<how-to-write-a-maintenance-request>

Maintenance requests should explain **why the work matters** and **what success looks like** without prescribing how to implement it. The document should make the debt visible, bound the scope, and protect critical behavior.

## Document Structure

| Section | Purpose | Question Answered |
|---------|---------|-------------------|
| Motivation & Impact | Explain why the work matters | "Why now?" |
| Current State | Describe the maintenance burden | "What is costly or risky today?" |
| Desired Outcomes | Define success without prescribing implementation | "What should improve?" |
| Scope & Constraints | Bound the work | "What is in/out, what must be preserved?" |
| Risks & Dependencies | Surface coordination and rollout needs | "What could go wrong or block us?" |
| Acceptance Signals | Make completion verifiable | "How do we know it's done?" |

## Section Notes

- **Motivation & Impact** (omit header in output): Anchor in measurable impact — operational risk, developer time, reliability, cost, deprecations. Include evidence: incidents, metrics, toil. Use the technical-debt metaphor: call out the "interest" (ongoing cost) and the "principal" (cleanup work).
- **Current State**: Observable facts — components, file paths, services, workflows and their friction, hotspots, versions. Use code references, metrics, or links. Reference self-admitted debt (TODO/FIXME).
- **Desired Outcomes**: Verifiable statements — reliability/stability targets, maintainability improvements, performance/cost targets, migration end-states. Keep implementation-neutral unless hard constraints require otherwise.
- **Scope & Constraints**: In-scope and out-of-scope areas, what must not change (APIs, data formats, SLAs, user-facing behavior), compatibility requirements, operational constraints.
- **Risks & Dependencies**: Dependency upgrades, data migration, cross-team coordination, testing/observability gaps. Note if phased rollout is likely needed.
- **Acceptance Signals**: Metrics/thresholds showing improvement, migration completion signals, documentation updates. Avoid "done when refactor is complete" — use outcomes checkable by anyone.

## Key Principles

- **Intent over implementation**: State why and outcomes, not exact steps
- **Evidence over assertion**: Metrics, incidents, code references as fragment links, diagrams for complex dependency or data flow relationships — not opinions. Use markdown fragment links for workspace files — `[src/auth/provider.ts L42](./src/auth/provider.ts#L42)` — instead of backtick code spans so references are clickable in the card-detail webview. Non-workspace paths remain as backtick code spans.
- **Scope control**: Firm boundaries prevent refactor growth
- **Risk awareness**: Make dependencies and rollback paths explicit early

</how-to-write-a-maintenance-request>
