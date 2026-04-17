---
name: interview-bug-report
description: Enrich bug report cards with codebase context.
---

Review ./bug-report.md

<first-principles>
1. Reproducibility is the unit of truth — without it, everything else is speculation.
2. Observation and interpretation must be kept separate.
3. The environment is part of the bug: (code, state, inputs, environment) is the defect.
4. Severity tracks impact, not loudness. Silent data corruption outranks visible crashes.
5. Regression vs. latent defect changes the investigation entirely.
6. Missing observability is a defect of its own.
7. Workarounds are data — what makes the bug go away reveals its shape.
</first-principles>

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

## 3. Interview

Ask one question at a time via `AskUserQuestion`. Each question must:
- Target what only the user can supply: reproduction specifics, environment, severity, workarounds, observed vs. expected, sensitivity of repro data.
- Include a recommendation and each option's trade-offs, including downsides.
- Separate observation from interpretation; do not let the user's hypothesis narrow the investigation prematurely.

As research subagents return, fold findings into the card (Section 4) and let them sharpen the next question.

Prioritize question domains aligned with the first principles:
- **Reproduction** — exact steps, starting state, prerequisites
- **Reproducibility rate** — always / sometimes / once
- **Environment** — OS, IDE variant, extension version, workspace shape, settings overrides
- **Regression boundary** — first known good, first known bad, recent user-side changes
- **Severity and impact** — blast radius, data loss vs. cosmetic, who is blocked
- **Urgency** — user-facing deadline or incident coupling
- **Workarounds** — what the user tried; what made it better or worse
- **Data sensitivity** — can repros/logs be attached or must they be redacted?
- **Observability gaps** — what log or metric *would* have made this obvious
- **Acceptance of fix** — how the user will verify the fix beyond the original repro

## 4. Update the Card Continually

After each material exchange or research return, update in place. Do not batch to the end.

- `CARD.meta.json` — title and metadata
- `CARD.md` — per `./bug-report.md` structure
- `notes/` — research findings, log excerpts, rejected hypotheses
- `plan/` — decision logs and load-bearing assumptions only; do **not** write a fix plan

Commit frequently so the card improves monotonically.

## 5. Constraints

- No fixes. No code, no remediation, no test stubs.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Report failing tests or broken builds in the card; do not remediate.

## 6. Finalize

When the user confirms the card is complete, reconcile notes into `CARD.md`, ensure every load-bearing assumption is recorded, then:

```bash
cd $CARD_REPO_PATH
git add -A
git commit -m "[single sentence summarizing how the bug was characterized and key decisions from the interview]"  # <card-repo-commit-style>
```

**STOP** — Interview complete. Do not proceed to implementation.

</instructions>
