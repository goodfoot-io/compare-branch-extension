---
name: interview-investigation
description: Enrich investigation cards with codebase context.
---

Review ./investigation.md and ./commanders-intent.md

<first-principles>
1. An investigation exists to unblock a decision. Without a decision, it is research, not investigation.
2. Questions must be falsifiable — if no evidence could change the answer, the question is wrong.
3. The null result is a valid outcome: "We cannot tell from available evidence" must be acceptable.
4. Evidence has provenance — source, freshness, and trust level affect the conclusion.
5. Investigation perturbs its subject. Probing production changes the system being studied.
6. Confidence threshold is set before gathering evidence, not after.
7. Prior art constrains scope — what has already been investigated bounds this work.
</first-principles>

<critical-constraints>

- No investigation execution. No diagnostic scripts, no production probes, no prototype work.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Report failing tests or broken builds in the card; do not remediate.

</critical-constraints>

<instructions>

## 1. Dispatch Research Immediately

Spawn `Explore` subagents in parallel with `run_in_background: true` before engaging the user. Research targets:
- Current observability on the subject (logs, metrics, traces, events)
- System boundaries — what is white-box vs. black-box
- Existing diagnostic tooling (scripts, dashboards, profilers) — note but do not execute
- Prior investigations or decision logs that touch the same question
- Data sources that could supply evidence and their known trust level

Do not block on research. Proceed to Section 2 while subagents run.

## 2. Load Card Skills

Load `cards:notes` and `cards:markdown` in parallel.

## 3. Interview

Ask one question at a time via `AskUserQuestion`. Each question must:
- Target the decision to unblock, hypotheses to test, confidence threshold, and acceptable deliverable — never facts recoverable by research.
- Include a recommendation and each option's trade-offs, including downsides.
- Force falsifiability: reject questions with no possible answer that would change behavior.

As research subagents return, fold findings into the card (Section 4) and let them sharpen the next question.

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

## 4. Update the Card Continually

Open `CARD.md` before drafting any structured section, then confirm the opening with the user via `AskUserQuestion` with options `accept`, `refine`, `reject`. The null result is an acceptable form of arrival.

After each material exchange or research return, update in place. Do not batch to the end.

- `CARD.meta.json` — title and metadata
- `CARD.md` — Commander's Intent paragraph first, then the section structure in `./investigation.md`
- `notes/` — research findings, evidence-source inventory, rejected framings
- `plan/` — decision logs and load-bearing assumptions only; do **not** write an investigation plan

Commit frequently so the card improves monotonically.

## 5. Finalize

When the user confirms the card is complete, reconcile notes into `CARD.md`, ensure every load-bearing assumption is recorded, then:

```bash
cd $CARD_REPO_PATH
git add -A
git commit -m "[single sentence summarizing the investigation's focus and key decisions from the interview]"  # <card-repo-commit-style>
```

**STOP** — Interview complete. Do not proceed to implementation.

</instructions>
