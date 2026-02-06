---
name: issue-plan-feedback
description: Incorporate user feedback into an existing plan and re-assess.
---

<placeholder-variables>
[LATEST_USER_COMMENT] — Most recent comment from `author: "user"` containing feedback
[PLAN_CONTENT] — The existing plan markdown content from `planContent` field

Note: [CARD_ID], [TITLE], and [DESCRIPTION] are defined in `prompt.md`.
</placeholder-variables>

<instructions>

Incorporate user feedback into an existing implementation plan and re-run assessments. This skill continues from where `issue-plan` stopped after submitting for approval.

## 1. Review Feedback

### 1.1 Analyze User Feedback

Read and understand [LATEST_USER_COMMENT]:

- **Requested changes**: Specific modifications to the plan
- **Concerns raised**: Issues the user wants addressed
- **Questions asked**: Clarifications needed before approval
- **Scope adjustments**: Features to add, remove, or modify

### 1.2 Load Plan Skill

Load the `claude-code-cli:plan` skill for structure requirements and examples.

## 2. Revise Plan

### 2.1 Research (If Needed)

If feedback requires additional investigation:

- Read relevant files in the codebase (track paths for `codeReferences`)
- Understand implications of requested changes
- Identify new dependencies or risks

### 2.2 Incorporate Feedback

Update the plan to address all feedback points:

- Apply requested changes
- Address raised concerns
- Answer questions within the plan context
- Adjust scope as directed

### 2.3 Store Revised Plan

Store the updated plan:

```
PATCH /cards/[CARD_ID]
{
  "planContent": "[revised plan markdown]"
}
```

## 3. Assess Revised Plan

### 3.1 Launch Assessment Subagents

Launch both assessments in parallel (one message):

```xml
<invoke name="Task">
  <parameter name="description">Structural Assessment</parameter>
  <parameter name="subagent_type">claude-code-cli:plan-assessor</parameter>
  <parameter name="prompt">Issue: [CARD_ID]

1. Read the plan:
```
GET /cards/[CARD_ID]/plan
```

2. Assess the plan and post a report per your `<instructions>`.
</parameter>
</invoke>

<invoke name="Task">
  <parameter name="description">Strategic Assessment</parameter>
  <parameter name="subagent_type">claude-code-cli:plan-refactor</parameter>
  <parameter name="prompt">Issue: [CARD_ID]

1. Read the plan:
```
GET /cards/[CARD_ID]/plan
```

2. Assess the plan and post a report per your `<instructions>`.
</parameter>
</invoke>
```

### 3.2 Address Assessment Findings

Read the assessments:

```
GET /cards/[CARD_ID]/plan-assessments
```

### Combined Assessment Priority Levels
- **CRITICAL/RECONSIDER**: Must be addressed before implementation
- **HIGH/CONCERNS**: Should be addressed or explicitly accepted
- **MEDIUM**: Implementation clarity, risk coverage, dependency analysis
- **LOW**: Style suggestions, format variations

### Interpreting Combined Results

Based on combined assessment results:

- **Ready: Yes AND READY**: Proceed to step 4
- **Ready: Yes AND DISCUSS**: Proceed, but document accepted concerns
- **Ready: Yes AND RECONSIDER**: Treat as "Not Ready" - address strategic issues
- **Ready: Yes (suggestions) AND READY/DISCUSS**: Proceed with awareness of suggestions
- **Ready: No**: Address structural issues first
- **RECONSIDER (any Ready state)**: Address strategic issues before proceeding

#### After Both Assessments Complete (Always)

1. **Resolve questions through research**
2. **Surface considerations visibly** as you work through them
3. **Track subjective decisions**: Collect design choices and judgment calls (not factual resolutions like "Is X compatible with Y?") for inclusion in the process comment. These help reviewers know where to focus.
4. **Make decisions** for non-blocking issues and document them in the plan revision
5. **Only ask the user** for blocking issues or intent clarity
6. **Determine next action** based on combined results (see "Interpreting Combined Results" above)

#### If Either Assessment Fails (Ready: No OR CRITICAL/RECONSIDER OR HIGH/MEDIUM/CONCERNS issues)

Return to **2.2 Incorporate Feedback** and revise.

#### If Both Assessments Pass (Ready: Yes + READY/DISCUSS)

If Plan Refactor returned DISCUSS, log accepted concerns:

```
POST /cards/[CARD_ID]/comments
{
  "body": "## Accepted Concerns\n\nThe following strategic concerns were noted but accepted:\n- [Concern from plan-refactor evaluation]\n- [Rationale for accepting]",
  "author": "agent"
}
```

Proceed to **4. Submit for Re-Approval**

## 4. Submit for Re-Approval

**Post a process-oriented comment.** The plan content is already accessible—don't summarize it.

Explain how you incorporated the feedback, especially where interpretation was required. Focus on what the reviewer can't see: your reasoning process, what you learned from the revision, where you made judgment calls, and where you're less certain. Mention the plan version.

When feedback was ambiguous, surface your interpretation as a question with your selected answer inline. Include surprises, new assumptions, or risks discovered during revision when they'd help the reviewer. Write naturally—only include what's genuinely useful.

```
POST /cards/[CARD_ID]/comments
{
  "body": "[process-oriented comment]",
  "author": "agent"
}
```

**STOP** — Wait for user feedback or approval

</instructions>
