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

Load `cards:markdown` and the writing guide `./operations.md`. The writing guide defines the CARD.md structure this interview is driving toward.

## 3. Interview

Ask one question at a time via `AskUserQuestion`. Each question must:
- Target urgency, blast radius, reversibility, approvals, and verification — never facts recoverable by research.
- Include a recommendation and each option's trade-offs, including downsides.
- Force a rollback and verification plan. An operation without both is not ready to plan.

As research subagents return, fold findings into the accumulating draft (Step 4: Accumulate Findings) and let them sharpen the next question.

Prioritize question domains aligned with the first principles:
- **Urgency and change class** — standard / normal / emergency; justification
- **Blast radius** — environments, users, adjacent systems affected
- **Reversibility** — rollback path, time-to-rollback target, acceptable data loss
- **Preconditions** — access, credentials, backups, feature-flag state, quorum
- **Verification signal** — dashboard, metric, or query confirming success
- **Canary / staged rollout** — expectation and graduation criteria
- **Change window and approvals** — ITSM/ITIL class, freeze-period awareness
- **Stakeholder communication** — pre, during, post; on-call and downstream owners
- **Observability additions** — missing metrics/alerts to add before the change
- **Failure modes and known risks** — what the user has seen go wrong before
- **Cost and compliance implications** — spend, licensing, audit, data-handling

## 4. Author and Confirm Commander's Intent

No card exists yet. Before shaping any structured section, draft the opening paragraph(s) per `./commanders-intent.md` — the target system state after the change — and confirm with the user via `AskUserQuestion` with options `accept`, `refine`, `reject`. Only accumulate further findings once the user accepts.

Hold remaining findings, related incidents, and rejected approaches in conversation state, shaped against the section structure in `./operations.md`.

## 5. Create the Card

When the user confirms enough signal has been gathered, create the card via the `card create` flow in the parent `cards:api` skill. Compose CARD.md against `./operations.md`. Include related incidents, rejected approaches, and any approach that emerged from research in `notes/` in the initial commit. Do not write `plan/` files — planning happens in a later step.

## 6. Constraints

- No operational execution. No scripts, no infra changes, no configuration edits.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Report failing tests or broken builds you encounter during research in the card; do not remediate.

## 7. Finalize

After `card create` succeeds and CARD.md (plus any notes) is committed, report the new card ID to the user.

**STOP** — Interview complete. Do not proceed to implementation.

</instructions>

</interview-before-creating-an-operations-card>
