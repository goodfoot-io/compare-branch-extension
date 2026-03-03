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

### 2.1 Launch Assessment Subagents

Launch both assessments in parallel (one message):

```xml
<invoke name="Task">
  <parameter name="description">Structural Assessment</parameter>
  <parameter name="subagent_type">runtime:card:plan-assessor</parameter>
  <parameter name="model">haiku</parameter>
  <parameter name="prompt">
Assess plan structural compliance.

## Card Repository
!` echo $CARD_REPO_PATH`

## Workspace
!` echo $WORKSPACE_PATH`

Read the plan from PLAN.md in the card repository. Assess the plan and post a report per your instructions.
</parameter>
</invoke>

<invoke name="Task">
  <parameter name="description">Strategic Assessment</parameter>
  <parameter name="subagent_type">runtime:card:plan-refactor</parameter>
  <parameter name="model">opus</parameter>
  <parameter name="prompt">
Evaluate plan design and completeness.

## Card Repository
!` echo $CARD_REPO_PATH`

## Workspace
!` echo $WORKSPACE_PATH`

1. Read the plan from PLAN.md in the card repository.
2. Verify plan claims against workspace source files (callers, consumers, producers, imports).
3. Assess the plan and post a report per your instructions.
</parameter>
</invoke>
```

### 2.2 Collect Assessment Results

Use `TaskOutput` to retrieve results from the Structural Assessment and Strategic Assessment tasks launched above. Both results must be present before proceeding.

### 2.3 Interpret and Act

The assessor returns **"Ready for Implementation: Yes/No"** with issues categorized as CRITICAL/HIGH/MEDIUM/LOW. The refactor returns an **"Overall Assessment: READY/DISCUSS/RECONSIDER"**.

Apply the first matching condition:

1. **Assessor returns "No"**: Return to **1.2 Write and Store Plan** — structural issues must be fixed before design evaluation matters.
2. **Refactor returns RECONSIDER**: Return to **1.2 Write and Store Plan** — address fundamental design findings before proceeding.
3. **Assessor returns "Yes" AND Refactor returns DISCUSS**: Proceed, but document accepted concerns as a card comment (see below).
4. **Assessor returns "Yes" AND Refactor returns READY**: Proceed to **4. Submit for Approval**.

#### After Both Assessments Complete (Always)

1. **Resolve questions through research** — route empirically-testable uncertainties to **1.3 Spike Testable Uncertainties** before revising
2. **Surface considerations visibly** as you work through them
3. **Track subjective decisions**: Collect design choices and judgment calls (not factual resolutions like "Is X compatible with Y?") for inclusion in the process comment. These help reviewers know where to focus.
4. **Incorporate process artifacts** from both assessors (judgment calls, surprises, uncertainty) into your reasoning — these inform the process comment in Step 4.
5. **Make decisions** for non-blocking issues and document them in the plan revision
6. **Only ask the user** for blocking issues or intent clarity

#### If Revision Required (Condition 1 or 2)

Return to **1.2 Write and Store Plan** and revise.

```bash
cd $CARD_REPO_PATH
# Assessment failed — revise PLAN.md per findings above, then re-run section 2.1 Launch Assessment Subagents
```

#### If Both Pass with DISCUSS (Condition 3)

Write a comment to the card repository documenting the accepted concerns and rationale. Commit to the card repository:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[accepted concerns from the strategic assessment and rationale for why they do not block implementation]
EOF
git add comment/$COMMENT_ID.md
git commit -m "[single sentence summarizing the accepted concerns and rationale]"  # <card-repo-commit-style>
```

Proceed to **4. Submit for Approval**

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
