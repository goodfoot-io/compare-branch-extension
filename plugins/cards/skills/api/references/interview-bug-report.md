<interview-before-creating-a-bug-report-card>

Reach the signal required to write a well-formed bug report before the card is created. The companion `./bug-report.md` defines the target CARD.md structure; this guide defines how to get there.

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

Do not block on research. Proceed to Step 2: Load Writing Skills while subagents run.

## 2. Load Writing Skills

Load `cards:markdown` and the writing guide `./bug-report.md`. The writing guide defines the CARD.md structure this interview is driving toward.

## 3. Interview

Ask one question at a time via `AskUserQuestion`. Each question must:
- Target what only the user can supply: reproduction specifics, environment, severity, workarounds, observed vs. expected, sensitivity of repro data.
- Include a recommendation and each option's trade-offs, including downsides.
- Separate observation from interpretation; do not let the user's hypothesis narrow the investigation prematurely.

As research subagents return, fold findings into the accumulating draft (Step 4: Accumulate Findings) and let them sharpen the next question.

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

## 4. Accumulate Findings

No card exists yet. Hold research findings, user answers, and rejected hypotheses in conversation state, shaped against the section structure in `./bug-report.md`. Separate observation from speculation as you go.

## 5. Create the Card

When the user confirms enough signal has been gathered, create the card via the `card create` flow in the parent `cards:api` skill. Compose CARD.md against `./bug-report.md`. Include research excerpts, rejected hypotheses, and any approach that emerged from research in `notes/` in the initial commit. Do not write `plan/` files — planning happens in a later step.

## 6. Constraints

- No fixes. No code, no remediation, no test stubs.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Report failing tests or broken builds you encounter during research in the card; do not remediate.

## 7. Finalize

After `card create` succeeds and CARD.md (plus any notes) is committed, report the new card ID to the user.

**STOP** — Interview complete. Do not proceed to implementation.

</instructions>

</interview-before-creating-a-bug-report-card>
