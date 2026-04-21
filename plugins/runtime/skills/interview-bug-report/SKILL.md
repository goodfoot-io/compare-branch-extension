---
name: interview-bug-report
description: Enrich bug report cards with codebase context.
---

Review ./bug-report.md and ./commanders-intent.md

<first-principles>
1. Reproducibility is the unit of truth — without it, everything else is speculation.
2. Observation and interpretation must be kept separate.
3. The environment is part of the bug: (code, state, inputs, environment) is the defect.
4. Severity tracks impact, not loudness. Silent data corruption outranks visible crashes.
5. Regression vs. latent defect changes the investigation entirely.
6. Missing observability is a defect of its own.
7. Workarounds are data — what makes the bug go away reveals its shape.
</first-principles>

<critical-constraints>

- No fixes. No code, no remediation, no test stubs.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Report failing tests or broken builds in the card; do not remediate.

</critical-constraints>

<instructions>

## 1. Dispatch Research Immediately

Spawn `Explore` subagents in parallel with `run_in_background: true` before engaging the user. Research targets:
- The code path implicated by the error (symbol, file, caller/callee chain)
- Recent changes to that path via git log/blame (regression candidates)
- Test coverage of the path and known flaky history
- Error/log instrumentation already in place
- Adjacent failure modes the same code could exhibit

Do not block on research. Proceed to Section 2 while subagents run.

## 2. Load Card Skills

Load `cards:notes` and `cards:markdown` in parallel.

## 3. Interview and Shape the Card

The card already exists. Read `CARD.md` and use the conversation to close gaps, sharpen ambiguities, and surface assumptions the author left implicit — refining the commander's intent where the interview reveals it needs refining, rather than rebuilding it from scratch.

- Keep each exchange short. Reflect back what you're hearing and follow up on what matters underneath the report. Match the user's register — their vocabulary, level of formality, and concreteness.
- Reach for `AskUserQuestion` only when there is a genuine fork with discrete options the user must pick between.
- Target what only the user can supply: reproduction specifics, environment, severity, workarounds, observed vs. expected, sensitivity of repro data.
- Anchor in the user's frame: name the artefact, command, or moment they will actually see. Vocabulary from the writing guides does not belong in exchanges with the user.
- Separate observation from interpretation; do not let the user's hypothesis narrow the investigation prematurely.

As research subagents return and as the conversation settles pieces of the destination, fold them into the card in place — do not batch to the end:

- `CARD.meta.json` — title and metadata
- `CARD.md` — revise the commander's intent as the conversation sharpens it, then the section structure in `./bug-report.md`
- `notes/` — research findings, log excerpts, rejected hypotheses
- `plan/` — decision logs and load-bearing assumptions only; do **not** write a fix plan

Commit frequently so the card improves monotonically.

## 4. Finalize

When the user confirms the card is complete, reconcile notes into `CARD.md`, ensure every load-bearing assumption is recorded, then:

```bash
cd $CARD_REPO_PATH
git add -A
git commit -m "[single sentence summarizing how the bug was characterized and key decisions from the interview]"  # <card-repo-commit-style>
```

**STOP** — Interview complete. Do not proceed to implementation.

</instructions>
