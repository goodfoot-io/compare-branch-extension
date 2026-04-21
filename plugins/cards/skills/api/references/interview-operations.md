<interview-before-creating-an-operations-card>

Reach the signal required to write a well-formed operations request before the card is created. The companion `./operations.md` defines the target CARD.md structure; this guide defines how to get there.

<first-principles>
1. Fail closed by default — when uncertain, the safer action preserves current state.
2. A change is defined by its blast radius and its reversibility.
3. Verification precedes the declaration of success. Intent to change is not evidence of change.
4. Every change has a rollback, even if the rollback is "escalate."
5. Observability before action — if the signal that would detect failure doesn't exist, create it first.
6. Change is a communication event, not only a technical one.
7. Environment parity is a premise to verify, not assume.
</first-principles>

<instructions>

## 1. Dispatch Research Immediately

Spawn `Explore` subagents in parallel with `run_in_background: true` before engaging the user. Research targets:
- Deploy, rollback, and safety scripts currently in the repo
- Configuration surface (env vars, feature flags, secrets) touching the subject
- Monitoring/alerting tied to the affected system
- Recent changes to the target system via git log (recent volatility)
- Existing runbooks or ops notes for adjacent procedures

Do not block on research. Proceed to Step 2: Load Writing Skills while subagents run.

## 2. Load Writing Skills

Load `cards:markdown`, `./commanders-intent.md`, and the writing guide `./operations.md`. The writing guide defines the CARD.md structure this interview is driving toward.

## 3. Interview and Accumulate Findings

Interview the user conversationally. The commander's intent is built through the conversation, not drafted and approved as a document.

- Keep each exchange short. Reflect back what you're hearing and follow up on what matters underneath the request. Match the user's register — their vocabulary, level of formality, and concreteness.
- Reach for `AskUserQuestion` only when there is a genuine fork with discrete options the user must pick between.
- Target urgency, blast radius, reversibility, approvals, and verification — never facts recoverable by research.
- Anchor in the user's frame: name the artefact, command, or moment they will actually see. Vocabulary from the writing guides does not belong in exchanges with the user.
- Force a rollback and verification plan. An operation without both is not ready to plan.

As research subagents return and as the conversation settles pieces of the destination, hold findings, related incidents, and rejected approaches in conversation state, shaped against the section structure in `./operations.md`.

## 4. Create the Card

When the destination is clear, write the opening paragraph as a summary of what the conversation has settled and check it with the user inline. Then create the card via the `card create` flow in the parent `cards:api` skill. Compose CARD.md against `./operations.md`. Include related incidents, rejected approaches, and any approach that emerged from research in `notes/` in the initial commit. Do not write `plan/` files — planning happens in a later step.

## 5. Constraints

- No operational execution. No scripts, no infra changes, no configuration edits.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Report failing tests or broken builds you encounter during research in the card; do not remediate.

## 6. Finalize

After `card create` succeeds and CARD.md (plus any notes) is committed, report the new card ID to the user.

**STOP** — Interview complete. Do not proceed to implementation.

</instructions>

</interview-before-creating-an-operations-card>
