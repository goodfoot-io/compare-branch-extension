---
name: card-plan
description: Create implementation plans for user approval.
---


<instructions>

Create implementation plans for cards requiring user approval before coding begins. Do NOT make code changes — plans must be approved before any implementation begins.

## 1. Create Plan

### 1.1 Commander's Intent

Distill from the card what the situation looks like when the work is done, and what constraints must hold regardless of implementation approach. Lead with the done state, not the problem. The card describes what the user needs; the plan's intent translates that into operational direction for the implementer.

### 1.2 Research

Research by reviewing any relevant resource avaialble to you, including files, web searches, or tool. Identify every consumer of each symbol, field, and boundary the plan will touch. A component discovered during implementation that belongs in the plan is a research failure.

### 1.3 Write and Store Plan

Write the plan to `PLAN.md` in the card repository. Commit to the card repository:

```bash
cd !` echo $CARD_REPO_PATH`
git add PLAN.md
git commit -m "[single sentence summarizing the approach and key decisions]"  # <card-repo-commit-style>
```

## 2. Evaluate Plan

### 2.1 Spike Testable Uncertainties

Scan the plan for assumptions — both explicit (labeled as such) and implicit (statements presented as facts that were not read from source). Any assumption that affects a planned implementation step is spike-eligible. The cost of an incorrect assumption is a plan revision; the cost of a spike is smaller. Skip this step only when no load-bearing assumptions exist.

For each spike-eligible uncertainty, invoke the `runtime:spike` skill — use validation spikes for pass/fail questions, comparison spikes for alternative selection. Launch independent spikes in parallel.

Revise PLAN.md to incorporate spike results. A spike that disproves the root cause or a load-bearing assumption invalidates the plan from intent through approach — rewrite, don't patch.

```bash
cd !` echo $CARD_REPO_PATH`
git add PLAN.md
git commit -m "[single sentence summarizing what the spikes resolved]"  # <card-repo-commit-style>
```

## 3. Assess Plan

Load the `runtime:card-plan-evaluation` skill and follow its instructions.

## 4. Stop

**STOP** — Plan submitted for approval; do not proceed to implementation. Do not modify gates in `CARD.meta.json`.

</instructions>
