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

Spawn `explorer` sub-agents in parallel (`spawn_agent` with `agent_type: explorer`) before engaging the user. Research targets:
- The code path implicated by the error (symbol, file, caller/callee chain)
- Recent changes to that path via git log/blame (regression candidates)
- Test coverage of the path and known flaky history
- Error/log instrumentation already in place
- Adjacent failure modes the same code could exhibit

Do not block on research. Proceed to Step 2: Load Writing Skills while subagents run.

## 2. Load Writing Skills

Load `$markdown`, `./commanders-intent.md`, and the writing guide `./bug-report.md`. The writing guide defines the CARD.md structure this interview is driving toward.

## 3. Interview and Accumulate Findings

Interview the user conversationally. The commander's intent is built through the conversation, not drafted and approved as a document.

- Keep each exchange short. Reflect back what you're hearing and follow up on what matters underneath the report. Match the user's register — their vocabulary, level of formality, and concreteness.
- Use the `AskUserQuestion` tool for discrete classifications the user is best placed to pick:
  - Ask one question per turn. Batch only when a single scenario illustrates the whole cluster.
  - Attach several short "good" and "bad" scenarios to each option — concrete, one-line each — when picking exposes non-obvious downstream consequences (e.g., "intermittent vs. deterministic" reproducibility routes the fix toward timing or ordering work the reporter may not have anticipated). Skip scenarios when the trade-off is implicit in the question itself (e.g., repro-data shape, where the fidelity-vs.-sensitivity trade is self-evident from the data involved).
  - Topic axes: regression vs. latent, reproducibility class, repro surface, source of expected behavior, repro-data shape.
  - Stay in chat for the reproduction narrative, observed-vs.-expected framing, and anything that risks freezing the user's hypothesis.
- Target what only the user can supply: reproduction specifics, environment, workarounds, observed vs. expected, sensitivity of repro data.
- Anchor in the user's frame: name the artefact, command, or moment they will actually see. Vocabulary from the writing guides does not belong in exchanges with the user.
- Separate observation from interpretation; do not let the user's hypothesis narrow the investigation prematurely.

As research subagents return and as the conversation settles pieces of the destination, hold findings, user answers, and rejected hypotheses in conversation state, shaped against the section structure in `./bug-report.md`. Separate observation from speculation as you go.

## 4. Create the Card

When the destination is clear, write the opening paragraph as a summary of what the conversation has settled and check it with the user inline. Then create the card via the `card create` flow in the parent `$management` skill. Compose CARD.md against `./bug-report.md`. Include research excerpts, rejected hypotheses, and any approach that emerged from research in `notes/` in the initial commit. Do not write `plan/` files — planning happens in a later step.

## 5. Constraints

- No fixes. No code, no remediation, no test stubs.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Do not ask the user how the bug currently affects them or to rate its severity — current-impact questions yield answers that are neither actionable nor relevant to the resolution. Derive impact and blast radius from the reproduction and the affected code path instead.
- Ask only for the expected observable behavior, never for the resolution. Do not ask the user where the fix should live, which component to change, or which mechanism resolves the defect — the reporter supplies the symptom; choosing the fix is a later step.
- Report failing tests or broken builds you encounter during research in the card; do not remediate.

## 6. Finalize

After `card create` succeeds and CARD.md (plus any notes) is committed, report the new card ID to the user.

**STOP** — Interview complete. Do not proceed to implementation.

</instructions>

</interview-before-creating-a-bug-report-card>
