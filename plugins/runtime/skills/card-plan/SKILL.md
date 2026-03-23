---
name: card-plan
description: Create implementation plans for user approval.
---


<instructions>

Create implementation plans for cards requiring user approval before coding begins. Do NOT make code changes — plans must be approved before any implementation begins.

## 1. Create Plan

### 1.1 Research

Research must answer five questions before the plan is written:

1. **What is the root cause?** Identify the structural property that produces the problem — not the symptom. If the root cause is inferred rather than confirmed by reading source, spike before §1.2. A plan built on a falsified root cause requires full replacement, not refinement.

2. **What is affected — and what is replaced?** Grep the workspace for each symbol, field name, and string literal being changed or removed. The module graph is not sufficient — callers exist in shell scripts, CLI binaries, git hooks, test fixtures, and configuration files. When the approach introduces a new mechanism, identify the existing one it supersedes — the plan must remove the old system, not just add the new one. A component discovered during implementation that belongs in the plan is a research failure.

3. **What do the integration points require?** For each system, API, or runtime boundary the plan touches, read beyond the type signature to understand the behavioral contract — what it assumes, what invariants it maintains, what it does not guarantee. A type signature is an interface; the implementation is the contract.

4. **Is each design decision grounded?** For each new or modified field or parameter, verify that absence is a valid consumer state — an optional field asserts "the system is correct when this is absent." When the card description, comments, and CARD.md contain inconsistent signals, resolve the conflict before writing the plan.

5. **What is the commander's intent?** Distill from CARD.md: what does the situation look like when the work is done, and what constraints must hold regardless of implementation approach. Lead with the done state, not the problem. The card describes what the user needs; the plan's intent translates that into operational direction for the implementer.

When delegating research, require structured findings per site: file path, line number, usage, and whether the site needs updating. Parallel subagents cannot cross-reference — connections across research areas must be resolved during synthesis.

### 1.2 Write and Store Plan

Write the plan to `PLAN.md` in the card repository following the `<annotated-plan-example>` from the `runtime:plan` skill. Commit to the card repository:

```bash
cd !` echo $CARD_REPO_PATH`
git add PLAN.md
git commit -m "[single sentence summarizing the approach and key decisions]"  # <card-repo-commit-style>
```

## 2. Evaluate Plan

### 2.1 Validate Plan Integrity

For each item below, output a verdict line in exactly this format, then a blank line before the next item:

```
[PASS] <item name> — <specific evidence: file paths, step numbers, section references>
[FAIL] <item name> — <what is missing or inconsistent>
[N/A]  <item name> — <why this item does not apply to this plan>
```

**Items — evaluate every one, in order:**

1. **Boundary-crossing values** — Each step that introduces a value crossing a system, process, or package boundary names both producer and consumer by file path.
2. **Symbol consumers** — Each modified symbol in Technical Approach has its consumers listed in Dependency Analysis.
3. **Step ordering** — Steps can be executed in numbered order without forward references to later steps.
4. **Mechanism replacement** — New mechanisms have corresponding removals of the systems they replace.
5. **Optional field absence** — Each optional field or parameter has absence validated as a correct consumer state.
6. **Error suppression** — Each catch or error-handling path names specific error types and rationale.
7. **Test dispositions** — Behavior changes account for existing test files, with dispositions stated (update, delete, or new).

**Rules:**
- All seven items must appear in the output. Do not batch, summarize, or skip items.
- PASS requires specific evidence — not "looks correct" or "the plan handles this."
- N/A requires a justification stating why the item does not apply.
- FAIL: return to §1.1 for the affected area — a gap in the plan reflects a gap in the research. Update PLAN.md, commit to the card repo, then re-validate from the failed item.

### 2.2 Spike Testable Uncertainties

Scan the plan for assumptions — both explicit (labeled as such) and implicit (statements presented as facts that were not read from source). Any assumption that affects a Technical Approach step is spike-eligible. The cost of an incorrect assumption is a plan revision; the cost of a spike is smaller. Skip this step only when no load-bearing assumptions exist — output `No spike-eligible assumptions identified` with a one-sentence justification.

For each spike-eligible uncertainty, invoke the `runtime:spike` skill — use validation spikes for pass/fail questions, comparison spikes for alternative selection. Launch independent spikes in parallel.

Incorporate results into the plan. A spike that disproves the root cause or a load-bearing assumption invalidates the plan from Commander's Intent through Technical Approach — rewrite, don't patch.
- Move validated assumptions from "unvalidated" to "validated" with spike path references
- Revise or remove risk mitigations based on disproven assumptions

```bash
cd !` echo $CARD_REPO_PATH`
git add PLAN.md
git commit -m "[single sentence summarizing what the spikes resolved]"  # <card-repo-commit-style>
```

## 3. Assess Plan

Load the `runtime:card-plan-evaluation` skill and follow its instructions.

## 4. Stop and Wait for Approval

**STOP** — Wait for user feedback on plan.

</instructions>
