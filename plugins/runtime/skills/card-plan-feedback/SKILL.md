---
name: card-plan-feedback
description: Incorporate user feedback into an existing plan and re-assess.
---


<instructions>

Incorporate user feedback into an existing implementation plan and re-run assessments.

## 1. Review Feedback

### 1.1 Read Card State

```bash
cd !` echo $CARD_REPO_PATH`
```

Read `PLAN.md` and the most recent `comment/*.md` files in the card repository.

### 1.2 Analyze User Feedback

From the latest user comment, identify:

- **Requested changes**: Specific modifications to the plan
- **Concerns raised**: Issues the user wants addressed
- **Questions asked**: Clarifications needed before approval
- **Scope adjustments**: Features to add, remove, or modify

## 2. Revise Plan

### 2.1 Research (If Needed)

If feedback requires additional investigation in the workspace repository:

- Read relevant files in the workspace codebase (track paths for code references)
- Understand implications of requested changes. When the feedback modifies the Technical Approach (changes data structures, shifts responsibility between components, replaces a component, simplifies a step), re-verify the complete data-flow connections for the affected path — not only the changed sections. A design revision can disconnect wiring that was correct under the previous design; incremental research on the changed parts alone is insufficient.
- Identify new dependencies or risks

### 2.2 Incorporate Feedback

Update the plan to address all feedback points:

- Apply requested changes
- Address raised concerns
- Answer questions within the plan context
- Adjust scope as directed

### 2.3 Store Revised Plan

Write the updated plan to `PLAN.md` in the card repository. Commit to the card repository:

```bash
cd !` echo $CARD_REPO_PATH`
git add PLAN.md
git commit -m "[single sentence summarizing what feedback was incorporated into the plan]"  # <card-repo-commit-style>
```

## 3. Assess Revised Plan

### 3.1 Launch Assessment Subagents

Launch both assessments in parallel (one message):

```xml
<invoke name="Agent">
  <parameter name="description">Structural Assessment</parameter>
  <parameter name="subagent_type">runtime:card:plan-assessor</parameter>
  <parameter name="prompt">
1. Read the plan from PLAN.md in the card repository.
2. Assess the plan and post a report per your instructions.
</parameter>
</invoke>

<invoke name="Agent">
  <parameter name="description">Strategic Assessment</parameter>
  <parameter name="subagent_type">runtime:card:plan-refactor</parameter>
  <parameter name="prompt">
1. Read the plan from PLAN.md in the card repository.
2. Assess the plan and post a report per your instructions.
</parameter>
</invoke>
```

### 3.2 Collect Assessment Results

Use `TaskOutput` to retrieve results from the Structural Assessment and Strategic Assessment tasks launched above. Both results must be present before proceeding.

### 3.3 Priority Reference

- **CRITICAL/RECONSIDER**: Must be addressed before implementation
- **HIGH/CONCERNS**: Should be addressed or explicitly accepted
- **MEDIUM**: Implementation clarity, risk coverage, dependency analysis
- **LOW**: Style suggestions, format variations

### 3.4 Interpret and Act

Based on combined assessment results:

- **Ready: Yes AND READY**: Proceed to **4. Submit for Re-Approval**
- **Ready: Yes AND GAPS**: Incorporate GAPS findings into PLAN.md (return to **2.2 Incorporate Feedback**) — gaps are missing specs, not accepted tradeoffs
- **Ready: Yes AND RECONSIDER**: Treat as "Not Ready" — address strategic issues
- **Ready: Yes (suggestions) AND READY**: Proceed with awareness of suggestions
- **Ready: No**: Address structural issues first
- **RECONSIDER (any Ready state)**: Address strategic issues before proceeding

#### After Both Assessments Complete (Always)

1. **Resolve questions through research**
2. **Surface considerations visibly** as you work through them
3. **Track subjective decisions**: Collect design choices and judgment calls (not factual resolutions like "Is X compatible with Y?") for inclusion in the process comment. These help reviewers know where to focus.
4. **Make decisions** for non-blocking issues and document them in the plan revision
5. **Only ask the user** for blocking issues or intent clarity
6. **Determine next action** based on combined results (see decision table above)

#### If Either Assessment Fails (Ready: No OR CRITICAL/RECONSIDER OR HIGH/MEDIUM/CONCERNS issues)

Return to **2.2 Incorporate Feedback** and revise.

```bash
cd !` echo $CARD_REPO_PATH`
# Assessment failed — revise PLAN.md per findings above, then re-run section 3.1 Launch Assessment Subagents
```

#### If Both Assessments Pass (Ready: Yes + READY)

Proceed to **4. Submit for Re-Approval**

## 4. Submit for Re-Approval

**Post a process-oriented comment.** The plan content is already accessible in `PLAN.md` — do not summarize it.

Explain how you incorporated the feedback, especially where interpretation was required. Focus on what the reviewer cannot see: your reasoning process, what you learned from the revision, where you made judgment calls, and where you are less certain. Mention the plan version.

When feedback was ambiguous, surface your interpretation as a question with your selected answer inline. Include surprises, new assumptions, or risks discovered during revision when they would help the reviewer. Write naturally — only include what is genuinely useful.

Write the comment to the card repository. Commit to the card repository:

```bash
cd !` echo $CARD_REPO_PATH`
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[how feedback was incorporated, reasoning process and judgment calls made, interpretations of ambiguous feedback, and any surprises, new assumptions, or risks discovered during revision]
EOF
git add comment/$COMMENT_ID.md
git commit -m "[single sentence summarizing how feedback was incorporated and key judgment calls]"  # <card-repo-commit-style>
```

**STOP** — Wait for user feedback or approval.

</instructions>
