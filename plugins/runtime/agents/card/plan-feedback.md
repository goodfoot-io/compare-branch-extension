---
name: plan-feedback
description: Incorporate user feedback into an existing plan and re-assess.
model: inherit
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Task", "TaskOutput", "TaskStop"]
skills: runtime:card-repo, runtime:plan
---

<placeholder-variables>
[CARD_ID] -- The card's unique identifier from `id` field in CARD.meta.json
</placeholder-variables>

<instructions>

Incorporate user feedback into an existing implementation plan and re-run assessments.

## 1. Review Feedback

### 1.1 Load Card Context

Read the card metadata and plan content from the card repository:

```bash
cat CARD.meta.json
cat PLAN.md
```

Read all comments to find the most recent user feedback:

```bash
ls -1 comment/ | sort | tail -5
# Read the latest comment files to find user feedback
```

### 1.2 Analyze User Feedback

From the latest user comment, identify:

- **Requested changes**: Specific modifications to the plan
- **Concerns raised**: Issues the user wants addressed
- **Questions asked**: Clarifications needed before approval
- **Scope adjustments**: Features to add, remove, or modify

## 2. Revise Plan

### 2.1 Research (If Needed)

If feedback requires additional investigation:

- Read relevant files in the workspace codebase (track paths for code references)
- Understand implications of requested changes
- Identify new dependencies or risks

### 2.2 Incorporate Feedback

Update the plan to address all feedback points:

- Apply requested changes
- Address raised concerns
- Answer questions within the plan context
- Adjust scope as directed

### 2.3 Store Revised Plan

Write the updated plan to `PLAN.md`, then stage and commit:

```bash
cat > PLAN.md << 'PLAN'
[revised plan markdown]
PLAN

git add PLAN.md
git commit -m "Revise plan based on user feedback"
```

## 3. Assess Revised Plan

### 3.1 Launch Assessment Subagents

Launch both assessments in parallel (one message):

```xml
<invoke name="Task">
  <parameter name="description">Structural Assessment</parameter>
  <parameter name="prompt">Card: [CARD_ID]

1. Read the plan from PLAN.md
2. Assess the plan and post a report per your instructions.
</parameter>
</invoke>

<invoke name="Task">
  <parameter name="description">Strategic Assessment</parameter>
  <parameter name="prompt">Card: [CARD_ID]

1. Read the plan from PLAN.md
2. Assess the plan and post a report per your instructions.
</parameter>
</invoke>
```

### 3.2 Address Assessment Findings

Read any assessment outputs produced by subagents.

### Combined Assessment Priority Levels
- **CRITICAL/RECONSIDER**: Must be addressed before implementation
- **HIGH/CONCERNS**: Should be addressed or explicitly accepted
- **MEDIUM**: Implementation clarity, risk coverage, dependency analysis
- **LOW**: Style suggestions, format variations

### Interpreting Combined Results

Based on combined assessment results:

- **Ready: Yes AND READY**: Proceed to step 4
- **Ready: Yes AND DISCUSS**: Proceed, but document accepted concerns
- **Ready: Yes AND RECONSIDER**: Treat as "Not Ready" -- address strategic issues
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

If any strategic concerns were accepted, write a comment documenting them:

```bash
COMMENT_ID=$(python3 -c "import uuid; print(str(uuid.uuid4()))")
cat > "comment/${COMMENT_ID}.md" << 'COMMENT'
## Accepted Concerns

The following strategic concerns were noted but accepted:
- [Concern from assessment]
- [Rationale for accepting]
COMMENT

git add "comment/${COMMENT_ID}.md"
git commit -m "Document accepted concerns"
```

Proceed to **4. Submit for Re-Approval**

## 4. Submit for Re-Approval

**Post a process-oriented comment.** The plan content is already accessible in `PLAN.md` -- do not summarize it.

Explain how you incorporated the feedback, especially where interpretation was required. Focus on what the reviewer cannot see: your reasoning process, what you learned from the revision, where you made judgment calls, and where you are less certain. Mention the plan version.

When feedback was ambiguous, surface your interpretation as a question with your selected answer inline. Include surprises, new assumptions, or risks discovered during revision when they would help the reviewer. Write naturally -- only include what is genuinely useful.

```bash
COMMENT_ID=$(python3 -c "import uuid; print(str(uuid.uuid4()))")
cat > "comment/${COMMENT_ID}.md" << 'COMMENT'
[process-oriented comment]
COMMENT

git add "comment/${COMMENT_ID}.md"
git commit -m "Submit revised plan for re-approval"
```

Update `CARD.meta.json` to set the status to `needs_review` if not already set:

```bash
# Update status to needs_review
git add CARD.meta.json
git commit -m "Set status to needs_review"
```

**STOP** -- Wait for user feedback or approval.

</instructions>
