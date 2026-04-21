---
name: interview-enhancement
description: Enrich enhancement cards with codebase context.
---

Review ./enhancement.md and ./commanders-intent.md

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

## 3. Interview and Shape the Card

The card already exists. Read `CARD.md` and use the conversation to close gaps, sharpen ambiguities, and surface assumptions the author left implicit — refining the commander's intent where the interview reveals it needs refining, rather than rebuilding it from scratch.

- Keep each exchange short. Reflect back what you're hearing and follow up on what matters underneath the request. Match the user's register — their vocabulary, level of formality, and concreteness.
- Reach for `AskUserQuestion` only when there is a genuine fork with discrete options the user must pick between.
- Target intent, priorities, trade-offs, and load-bearing assumptions — never facts recoverable by research.
- Anchor in the user's frame: name the artefact, command, or moment they will actually see. Vocabulary from the writing guides does not belong in exchanges with the user.
- Surface failure modes, edge cases, and invariants they may not have considered. Choices here are cheaper than choices made in planning.

As research subagents return and as the conversation settles pieces of the destination, fold them into the card in place — do not batch to the end:

- `CARD.meta.json` — title and metadata
- `CARD.md` — revise the commander's intent as the conversation sharpens it, then the section structure in `./enhancement.md`
- `notes/` — research findings, rejected alternatives, open questions
- `plan/` — decision logs and load-bearing assumptions only; do **not** write an implementation plan

Commit frequently so the card improves monotonically. If an earlier version of the intent named a mechanism, climb to the underlying job as you revise.

## 4. Finalize

When the user confirms the card is complete, reconcile notes into `CARD.md`, ensure every load-bearing assumption is recorded, then:

```bash
cd $CARD_REPO_PATH
git add -A
git commit -m "[single sentence summarizing how the enhancement was scoped and key decisions from the interview]"  # <card-repo-commit-style>
```

**STOP** — Interview complete. Do not proceed to implementation.

</instructions>
