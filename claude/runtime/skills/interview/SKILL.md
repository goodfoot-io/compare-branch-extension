---
name: interview
description: Route interview cards to the appropriate skill.
---

<routing-constraints>
The routing phase evaluates and selects — it does NOT interview the user or modify card content. After routing, the matched references are loaded and their instructions take over.

| Routing phase | Loaded references handle |
|------------------------|--------------------------------|
| Evaluating routing conditions | Conducting the interview |
| Selecting the appropriate type | Gathering requirements |
| Loading the matched references | Producing the card |

**Never update card status directly** — hooks handle status transitions automatically.
</routing-constraints>

<quiet>
Routing runs without user interaction. Messages describing state and routing decisions are not required.
</quiet>

<routing-instructions>

## 1. Evaluate Routing Signals

### 1.1 Read Card State

Obtain `title`, `status`, and `tags` from the `<card>` block in your session context. Read `CARD.md` to obtain the card description, including problem statements, desired outcomes, and any error evidence.

### 1.2 Derive Routing Signals

| Signal | Derivation |
|--------|------------|
| IS_BUG_REPORT | Card describes unexpected behavior, errors, or broken functionality |
| HAS_ERROR_EVIDENCE | `CARD.md` contains stack traces, error messages, failing outputs, or reproducible breakage |
| IS_OPERATIONS_REQUEST | Card describes CI/build failures, infra chores, operational support, or incident follow-ups |
| IS_DOCUMENTATION_REQUEST | Card requests docs, guides, examples, runbooks, or knowledge-base updates |
| IS_INVESTIGATION_REQUEST | Card requests research, diagnostics, spikes, or feasibility checks |
| IS_MAINTENANCE_REQUEST | Card requests refactors, upgrades, migrations, or reliability/performance improvements without new behavior |
| IS_ENHANCEMENT_REQUEST | Card requests new or changed behavior without describing breakage |

## 2. Route

Select the **first** matching condition and note the card type:

| Condition | Card type |
|-----------|-----------|
| IS_BUG_REPORT OR HAS_ERROR_EVIDENCE | `bug-report` |
| IS_OPERATIONS_REQUEST | `operations` |
| IS_DOCUMENTATION_REQUEST | `documentation` |
| IS_INVESTIGATION_REQUEST | `investigation` |
| IS_MAINTENANCE_REQUEST | `maintenance` |
| IS_ENHANCEMENT_REQUEST | `enhancement` |
| Otherwise | `enhancement` |

**Conflicting conditions**: Ask "What would a human team member do?" and write down why you're asking. Articulating the ambiguity usually resolves it.

## 3. Load Interview References

Read the following three files in parallel, substituting `[type]` with the card type from Step 2:

- `./references/commanders-intent.md`
- `./references/[type].md`
- `./references/interview-[type].md`

Follow the instructions in `./references/interview-[type].md`.

</routing-instructions>
