---
name: interview-operations
description: Enrich operations cards with codebase context.
---

Review ./operations.md

<first-principles>
1. Fail closed by default — when uncertain, the safer action preserves current state.
2. A change is defined by its blast radius and its reversibility.
3. Verification precedes the declaration of success. Intent to change is not evidence of change.
4. Every change has a rollback, even if the rollback is "escalate."
5. Observability before action — if the signal that would detect failure doesn't exist, create it first.
6. Change is a communication event, not only a technical one.
7. Environment parity is a premise to verify, not assume.
</first-principles>

<critical-constraints>

- No operational execution. No scripts, no infra changes, no configuration edits.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Report failing tests or broken builds in the card; do not remediate.

</critical-constraints>

<instructions>

## 1. Dispatch Research Immediately

Spawn `Explore` subagents in parallel with `run_in_background: true` before engaging the user. Research targets:
- Deploy, rollback, and safety scripts currently in the repo
- Configuration surface (env vars, feature flags, secrets) touching the subject
- Monitoring/alerting tied to the affected system
- Recent changes to the target system via git log (recent volatility)
- Existing runbooks or ops notes for adjacent procedures

Do not block on research. Proceed to Section 2 while subagents run.

## 2. Load Card Skills

Load `cards:notes` and `cards:markdown` in parallel.

## 3. Interview

Ask one question at a time via `AskUserQuestion`. Each question must:
- Target urgency, blast radius, reversibility, approvals, and verification — never facts recoverable by research.
- Include a recommendation and each option's trade-offs, including downsides.
- Force a rollback and verification plan. An operation without both is not ready to plan.

As research subagents return, fold findings into the card (Section 4) and let them sharpen the next question.

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

## 4. Update the Card Continually

Open `CARD.md` per `./commanders-intent.md` before drafting any structured section, then confirm the opening with the user via `AskUserQuestion` with options `accept`, `refine`, `reject`.

After each material exchange or research return, update in place. Do not batch to the end.

- `CARD.meta.json` — title and metadata
- `CARD.md` — Commander's Intent paragraph first, then the section structure in `./operations.md`
- `notes/` — research findings, related incidents, rejected approaches
- `plan/` — decision logs and load-bearing assumptions only; do **not** write a change plan

Commit frequently so the card improves monotonically.

## 5. Finalize

When the user confirms the card is complete, reconcile notes into `CARD.md`, ensure every load-bearing assumption is recorded, then:

```bash
cd $CARD_REPO_PATH
git add -A
git commit -m "[single sentence summarizing the operational scope, risk assessment, and key decisions from the interview]"  # <card-repo-commit-style>
```

**STOP** — Interview complete. Do not proceed to implementation.

</instructions>
