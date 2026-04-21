<interview-before-creating-an-investigation-card>

Reach the signal required to write a well-formed investigation request before the card is created. The companion `./investigation.md` defines the target CARD.md structure; this guide defines how to get there.

<first-principles>
1. An investigation exists to unblock a decision. Without a decision, it is research, not investigation.
2. Questions must be falsifiable — if no evidence could change the answer, the question is wrong.
3. The null result is a valid outcome: "We cannot tell from available evidence" must be acceptable.
4. Evidence has provenance — source, freshness, and trust level affect the conclusion.
5. Investigation perturbs its subject. Probing production changes the system being studied.
6. Confidence threshold is set before gathering evidence, not after.
7. Prior art constrains scope — what has already been investigated bounds this work.
</first-principles>

<instructions>

## 1. Dispatch Research Immediately

Spawn `Explore` subagents in parallel with `run_in_background: true` before engaging the user. Research targets:
- Current observability on the subject (logs, metrics, traces, events)
- System boundaries — what is white-box vs. black-box
- Existing diagnostic tooling (scripts, dashboards, profilers) — note but do not execute
- Prior investigations or decision logs that touch the same question
- Data sources that could supply evidence and their known trust level

Do not block on research. Proceed to Step 2: Load Writing Skills while subagents run.

## 2. Load Writing Skills

Load `cards:markdown`, `./commanders-intent.md`, and the writing guide `./investigation.md`. The writing guide defines the CARD.md structure this interview is driving toward.

## 3. Interview

Ask one question at a time via `AskUserQuestion`. Each question must:
- Target the decision to unblock, hypotheses to test, confidence threshold, and acceptable deliverable — never facts recoverable by research.
- Include a recommendation and each option's trade-offs, including downsides.
- Force falsifiability: reject questions with no possible answer that would change behavior.

As research subagents return, fold findings into the accumulating draft (Step 4: Accumulate Findings) and let them sharpen the next question.

Prioritize question domains aligned with the first principles:
- **Decision to unblock** — what action depends on the outcome, and when
- **Decision-maker** — who signs off; who else has standing
- **Hypotheses** — explicit claims to confirm or falsify
- **Confidence threshold** — directional vs. rigorous; what evidence is enough
- **Deliverable format** — memo, benchmark, prototype, decision log
- **Null-result contingency** — what happens if evidence is inconclusive
- **Production-probing constraints** — what is safe to touch, blackout windows
- **Access and approvals** — credentials, data agreements, stakeholder interviews
- **Prior art** — existing investigations to extend or avoid redoing
- **Risks of false positive / false negative** — asymmetry of being wrong

## 4. Author and Confirm Commander's Intent

No card exists yet. Before shaping any structured section, draft the opening paragraph(s) — the decision the investigation unblocks, with the null result as an acceptable form of arrival — and confirm with the user via `AskUserQuestion` with options `accept`, `refine`, `reject`. Only accumulate further findings once the user accepts.

Hold remaining findings, the evidence-source inventory, and rejected framings in conversation state, shaped against the section structure in `./investigation.md`.

## 5. Create the Card

When the user confirms enough signal has been gathered, create the card via the `card create` flow in the parent `cards:api` skill. Compose CARD.md against `./investigation.md`. Include evidence-source inventory, prior-art references, and any approach that emerged from research in `notes/` in the initial commit. Do not write `plan/` files — planning happens in a later step.

## 6. Constraints

- No investigation execution. No diagnostic scripts, no production probes, no prototype work.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Report failing tests or broken builds you encounter during research in the card; do not remediate.

## 7. Finalize

After `card create` succeeds and CARD.md (plus any notes) is committed, report the new card ID to the user.

**STOP** — Interview complete. Do not proceed to implementation.

</instructions>

</interview-before-creating-an-investigation-card>
