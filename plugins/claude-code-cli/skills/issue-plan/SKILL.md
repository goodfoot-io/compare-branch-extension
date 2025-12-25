---
name: issue-plan
description: Create and submit implementation plans with dual assessment. Use when [PLAN_REQUIRED] is true and [PLAN_APPROVED] is false.
---

<input-format>
Extract from issue data:

**Derived Fields:**
- [LATEST_USER_COMMENT] = Most recent comment from `author: "user"` (if any)
- [PLAN_CONTENT] = The plan markdown content from `planContent` field (string or null if not set)
</input-format>

<instructions>

## Protocol Overview

Use when [PLAN_REQUIRED] is true and [PLAN_APPROVED] is false. Research and present a plan—no code changes until user approves via comment.

## Interpreting User Feedback on Plans

**Treat as APPROVAL** (proceed to `claude-code-cli:issue-implementation`):
- Explicit approval: "Approved", "LGTM", "Go ahead", "Proceed", "Ship it"
- Unqualified positive: "This looks good", "Perfect", "Great plan"

**Treat as REVISION REQUEST** (revise plan in this protocol):
- Qualified positive: "Looks good, but..." or "Mostly good, however..."
- Suggestions: "Can you consider...", "Can you also...", "What about..."
- Uncertainty: "I'm not sure about...", "Maybe we should..."
- Questions about approach: "Why not use X instead?"

**When ambiguous**: Default to revision request. It's safer to clarify than to build the wrong thing.

## Phase 1: Create and Submit Implementation Plan

### Step 1.1: Check for Previous Plan and Feedback

Check if an agent comment contains a previous plan. If so, examine [LATEST_USER_COMMENT]:
- If it contains approval language (see above) → this protocol should not have been invoked; re-check routing
- If it contains revision request language or is ambiguous → incorporate feedback into revised plan

If no previous plan exists, continue to Step 1.2.

### Step 1.2: Confirm Status
Status is already `in_progress` (set by Instructions Step 3). No additional update needed.

### Step 1.3: Load Plan Skill
Invoke the `claude-code-cli:plan` skill to access plan structure requirements and examples.

### Step 1.4: Research and Analyze
- Read relevant files in the codebase
- Understand existing patterns and architecture
- Identify dependencies and risks
- Do NOT create worktrees or make code changes

### Step 1.5: Draft Implementation Plan
Create a detailed plan including:
- Objective and scope
- Proposed approach with steps
- Files to be modified
- Testing strategy
- Risks and mitigations
- Any questions or decision points

If this is a revision, clearly note what changed from the previous version.

### Step 1.6: Run Dual Assessment

When [PLAN_CONTENT] is not null after drafting, store the plan on the issue and launch parallel assessment agents before presenting for user review:

1. First, store the plan content on the issue:
```
PATCH /issues/[ISSUE_ID]
{
  "planContent": "[PLAN_CONTENT]"
}
```

2. Then launch both assessment agents in parallel (they will fetch planContent from the API):

<!-- PARALLEL EXECUTION: Send both assessments in ONE message -->
```xml
<invoke name="Task">
<parameter name="description">Structural Assessment</parameter>
<parameter name="subagent_type">claude-code-cli:plan-assessor</parameter>
<parameter name="prompt">Assess the plan for structural compliance, technical feasibility, and completeness.

Issue: [ISSUE_ID] - [TITLE]
Description: [DESCRIPTION]</parameter>
</invoke>

<invoke name="Task">
<parameter name="description">Strategic Assessment</parameter>
<parameter name="subagent_type">claude-code-cli:plan-refactor</parameter>
<parameter name="prompt">Evaluate the plan using the seven evaluation principles. Challenge assumptions, identify structural issues, and surface design decisions that warrant reconsideration.

Issue: [ISSUE_ID] - [TITLE]
Description: [DESCRIPTION]</parameter>
</invoke>
```

### Step 1.7: Review and Address Issues

Review both assessment reports before presenting the plan for user approval. Address any CRITICAL or HIGH priority issues identified before requesting approval.

If assessments reveal significant issues:
- Revise the plan to address CRITICAL and HIGH priority findings
- Re-run Step 1.6 if functional changes were made
- Add comments documenting what was changed based on assessment feedback
- Add comments documenting questions raised in the assessment reports, and what the resulting decision made was

### Step 1.8: Post Plan for Approval
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Implementation Plan\n\n[Your detailed plan]\n\n---\n**Please review and approve this plan before I proceed with implementation.**",
  "author": "agent",
  "codeReferences": [/* relevant files reviewed */]
}
```

### Step 1.9: Set Status and Wait
```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_approval"
}
```

**STOP** — Wait for user approval via comment. Once approved, the system will re-invoke with [PLAN_APPROVED]=true, routing to `claude-code-cli:issue-implementation`.

Note: `needs_approval` indicates a plan awaiting approval, while `needs_review` indicates implementation work awaiting review.

If the user responds with changes or rejection, return to Step 1.1 and create a revised plan.

</instructions>
