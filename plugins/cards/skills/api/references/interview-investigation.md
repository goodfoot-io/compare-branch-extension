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

## 3. Interview and Accumulate Findings

Interview the user conversationally. The commander's intent is built through the conversation, not drafted and approved as a document.

- Keep each exchange short. Reflect back what you're hearing and follow up on what matters underneath the request. Match the user's register — their vocabulary, level of formality, and concreteness.
- Use the `AskUserQuestion` tool for discrete parameters the user is best placed to set:
  - Ask one question per turn. Batch only when a single scenario illustrates the whole cluster.
  - Attach several short "good" and "bad" scenarios to each option — concrete, one-line each — when picking exposes non-obvious downstream consequences (e.g., a confidence threshold of "80% vs. 95%" changes which evidence sources become load-bearing and how long the investigation runs). Skip scenarios when the trade-off is implicit in the question itself (e.g., deliverable format, where the cost is obvious from the format itself).
  - Topic axes: confidence threshold, deliverable shape, what the outcome unblocks, evidence-staleness tolerance, subject boundary.
  - Stay in chat for the decision being unblocked, hypothesis generation, and falsifiability checks.
- Target the decision to unblock, hypotheses to test, confidence threshold, and acceptable deliverable — never facts recoverable by research.
- Anchor in the user's frame: name the artefact, command, or moment they will actually see. Vocabulary from the writing guides does not belong in exchanges with the user.
- Force falsifiability: reject questions with no possible answer that would change behavior.

As research subagents return and as the conversation settles pieces of the destination, hold findings, the evidence-source inventory, and rejected framings in conversation state, shaped against the section structure in `./investigation.md`. The null result is an acceptable form of arrival.

## 4. Create the Card

When the destination is clear, write the opening paragraph as a summary of what the conversation has settled and check it with the user inline. Then create the card via the `card create` flow in the parent `cards:api` skill. Compose CARD.md against `./investigation.md`. Include evidence-source inventory, prior-art references, and any approach that emerged from research in `notes/` in the initial commit. Do not write `plan/` files — planning happens in a later step.

## 5. Constraints

- No investigation execution. No diagnostic scripts, no production probes, no prototype work.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Report failing tests or broken builds you encounter during research in the card; do not remediate.

## 6. Finalize

After `card create` succeeds and CARD.md (plus any notes) is committed, report the new card ID to the user.

**STOP** — Interview complete. Do not proceed to implementation.

</instructions>

</interview-before-creating-an-investigation-card>
