---
name: card-plan
description: Create implementation plans for user approval.
---


<instructions>

Create implementation plans for cards requiring user approval before coding begins. Do NOT make code changes — plans must be approved before any implementation begins.

## 1. Create Plan

### 1.1 Research

- Read relevant files in the codebase (track paths for code references in step 3)
- Understand existing patterns and architecture
- Identify dependencies and risks

### 1.2 Write and Store Plan

Write the plan to `PLAN.md` in the card repository following the `<annotated-plan-example>` from the `runtime:plan` skill. Commit to the card repository:

```bash
cd $CARD_REPO_PATH
git add PLAN.md
git commit -m "[single sentence summarizing the approach and key decisions]"  # <card-repo-commit-style>
```

### 1.3 Spike Testable Uncertainties

Scan the plan for assumptions, open questions, and risk assertions that can be answered with isolated code (e.g., "Does `child.on('exit')` fire after `child.disconnect()`?"). Skip this step if none exist.

For each spike-eligible uncertainty, invoke the `runtime:spike` skill — use validation spikes for pass/fail questions, comparison spikes for alternative selection. Launch independent spikes in parallel.

Incorporate results into the plan:
- Move validated assumptions from "unvalidated" to "validated" with spike path references
- Update Technical Approach if results change the implementation
- Revise or remove risk mitigations based on disproven assumptions

```bash
cd $CARD_REPO_PATH
git add PLAN.md
git commit -m "[single sentence summarizing what the spikes resolved]"  # <card-repo-commit-style>
```

## 2. Assess Plan

Load the `runtime:card-assess-plan` skill and follow its instructions.

## 4. Submit for Approval

**Post a process-oriented comment.** The plan content is already accessible in `PLAN.md` — do not summarize it.

Focus on what the reviewer cannot see: your reasoning process, what you learned, where you made judgment calls, and where you are less certain. Mention the plan version and any spike investigations performed — what was tested, what was confirmed or disproven, and spike artifact paths for reviewer inspection. Surface decisions as questions with your selected answer inline when the right path was not obvious.

Include surprises, dead ends, assumptions, or risks when they would help the reviewer focus their attention. Write naturally — only include what is genuinely useful for this specific plan.

Write the comment to the card repository. Commit to the card repository:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[reasoning process, what was learned during research, judgment calls made, areas of uncertainty, and what the reviewer should focus on]
EOF
git add comment/$COMMENT_ID.md
git commit -m "[single sentence summarizing the plan's reasoning process and key judgment calls]"  # <card-repo-commit-style>
```

**STOP** — Wait for user feedback on plan.

</instructions>
