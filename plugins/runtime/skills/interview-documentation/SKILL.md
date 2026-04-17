---
name: interview-documentation
description: Enrich documentation cards with codebase context.
---

Review ./documentation.md

<first-principles>
1. Docs exist to change reader behavior — if no action or understanding changes, the doc has no purpose.
2. Audience and task define the document; format follows.
3. A doc without an owner will lie. Source of truth and maintainer must be named up front.
4. Discoverability is part of the doc — an unfindable doc does not exist.
5. Examples are the contract readers trust most; they must be correct and representative.
6. Scope is bounded by what the reader needs, not by what the author knows.
7. Deprecation is authorship — replacing or retiring existing docs is part of writing new ones.
</first-principles>

<instructions>

## 1. Dispatch Research Immediately

Spawn `Explore` subagents in parallel with `run_in_background: true` before engaging the user. Research targets:
- Existing documentation culture (`docs/`, co-located `README.md`, wiki, website)
- The code/behavior the documentation must describe (to verify accuracy)
- Consumers of the subject (grep for import patterns, API callers) to infer audience
- Existing related docs that may overlap, conflict, or be replaced
- Freshness — git timestamps of candidate source-of-truth files

Do not block on research. Proceed to Section 2 while subagents run.

## 2. Load Card Skills

Load `cards:notes` and `cards:markdown` in parallel.

## 3. Interview

Ask one question at a time via `AskUserQuestion`. Each question must:
- Target intent, audience, ownership, and trade-offs — never facts recoverable by research.
- Include a recommendation and each option's trade-offs, including downsides.
- Force clarity on audience and task; ambiguity here produces unusable docs.

As research subagents return, fold findings into the card (Section 4) and let them sharpen the next question.

Prioritize question domains aligned with the first principles:
- **Audience persona** — role, prior knowledge, what they know vs. what they need
- **Task / job-to-be-done** — what the reader is trying to accomplish when they arrive
- **Diataxis type** — tutorial / how-to / reference / explanation / runbook
- **Discoverability** — entry point (search, in-product link, onboarding, index)
- **Owner** — who maintains it and how drift will be detected
- **Source of truth** — authoritative artifact; accuracy boundaries; update cadence
- **Versioning** — tracks a release, a branch, or "current"
- **Confidentiality tier** — public / internal / restricted
- **Examples** — required, whether they must be executable/tested
- **Non-audience and non-topics** — explicit exclusions
- **Deprecation** — which existing docs are replaced or retired
- **Success signals** — observable indicators the docs work

## 4. Update the Card Continually

After each material exchange or research return, update in place. Do not batch to the end.

- `CARD.meta.json` — title and metadata
- `CARD.md` — per `./documentation.md` structure
- `notes/` — research findings, candidate sources, rejected framings
- `plan/` — decision logs and load-bearing assumptions only; do **not** draft the documentation itself

Commit frequently so the card improves monotonically.

## 5. Constraints

- No documentation drafting. The card describes the need; writing happens in a later phase.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Report failing tests or broken builds in the card; do not remediate.

## 6. Finalize

When the user confirms the card is complete, reconcile notes into `CARD.md`, ensure every load-bearing assumption is recorded, then:

```bash
cd $CARD_REPO_PATH
git add -A
git commit -m "[single sentence summarizing the documentation scope, audience, and key decisions from the interview]"  # <card-repo-commit-style>
```

**STOP** — Interview complete. Do not proceed to implementation.

</instructions>
