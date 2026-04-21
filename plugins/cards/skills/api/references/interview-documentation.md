<interview-before-creating-a-documentation-card>

Reach the signal required to write a well-formed documentation request before the card is created. The companion `./documentation.md` defines the target CARD.md structure; this guide defines how to get there.

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

Do not block on research. Proceed to Step 2: Load Writing Skills while subagents run.

## 2. Load Writing Skills

Load `cards:markdown` and the writing guide `./documentation.md`. The writing guide defines the CARD.md structure this interview is driving toward.

## 3. Interview

Ask one question at a time via `AskUserQuestion`. Each question must:
- Target intent, audience, ownership, and trade-offs — never facts recoverable by research.
- Include a recommendation and each option's trade-offs, including downsides.
- Force clarity on audience and task; ambiguity here produces unusable docs.

As research subagents return, fold findings into the accumulating draft (Step 4: Accumulate Findings) and let them sharpen the next question.

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

## 4. Accumulate Findings

No card exists yet. Hold research findings, candidate sources, and rejected framings in conversation state, shaped against the section structure in `./documentation.md`.

## 5. Create the Card

When the user confirms enough signal has been gathered, create the card via the `card create` flow in the parent `cards:api` skill. Compose CARD.md against `./documentation.md`. Include candidate-source inventory, freshness findings, and any approach that emerged from research in `notes/` in the initial commit. Do not write `plan/` files — planning happens in a later step.

## 6. Constraints

- No documentation drafting. The card describes the need; writing happens in a later phase.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Report failing tests or broken builds you encounter during research in the card; do not remediate.

## 7. Finalize

After `card create` succeeds and CARD.md (plus any notes) is committed, report the new card ID to the user.

**STOP** — Interview complete. Do not proceed to implementation.

</instructions>

</interview-before-creating-a-documentation-card>
