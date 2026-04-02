---
name: card-plan
description: Create implementation plans for user approval.
---


<instructions>

Create implementation plans for cards requiring user approval before coding begins. Do NOT make code changes.

## 1. Create Plan

### 1.1 Commander's Intent

Distill from the card what the situation looks like when the work is done and what constraints must hold regardless of approach. Lead with the done state, not the problem.

### 1.2 Research

Review all relevant resources: files, web searches, tools. Identify every consumer of each symbol, field, and boundary the plan will touch. A component discovered during implementation that belongs in the plan is a research failure.

### 1.3 Write and Store Plan

Write the plan to `PLAN.md` in the card repository. Write `PLAN.md.meta.json` with a `title` prefixed with "Plan:" (4–10 words naming the approach or solution) and a `summary` — a multi-paragraph markdown-formatted mini-plan (100–300 words). The first paragraph states what is changing and why — the intent and what is different when done. Subsequent paragraphs overview the approach: which areas of the codebase are touched, what the key moving parts are, and important constraints or boundaries. Write for a developer deciding whether to read the full plan — reduce cognitive load by referring to components by role rather than internal names. Follow the `<markdown-guidelines>` for both `PLAN.md` and the `summary` field. Commit to the card repository:

```bash
cd $CARD_REPO_PATH
git add PLAN.md PLAN.md.meta.json
git commit -m "[single sentence summarizing the approach and key decisions]"  # <card-repo-commit-style>
```

## 2. Evaluate Plan

### 2.1 Spike Testable Uncertainties

Scan the plan for assumptions — both explicit and implicit (statements presented as facts not read from source). Any assumption that affects a planned implementation step is spike-eligible. Skip only when no load-bearing assumptions exist.

For each spike-eligible uncertainty, invoke the `runtime:spike` skill:
- **Pass/fail questions**: Use validation spikes
- **Alternative selection**: Use comparison spikes
- **Independent spikes**: Launch in parallel

Revise PLAN.md to incorporate spike results. A spike that disproves the root cause or a load-bearing assumption invalidates the plan from intent through approach — rewrite, don't patch. Update `PLAN.md.meta.json` if the approach or intent changed.

```bash
cd $CARD_REPO_PATH
git add PLAN.md PLAN.md.meta.json
git commit -m "[single sentence summarizing what the spikes resolved]"  # <card-repo-commit-style>
```

## 3. Assess Plan

Load the `runtime:card-plan-evaluation` skill and follow its instructions.

## 4. Stop

**STOP** — Plan submitted for approval; do not proceed to implementation. Do not modify gates in `CARD.meta.json`.

</instructions>
