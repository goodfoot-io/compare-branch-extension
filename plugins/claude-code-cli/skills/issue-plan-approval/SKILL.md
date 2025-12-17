---
name: issue-plan-approval
description: Submit implementation plan for user approval before coding. Use when [PLAN_REQUIRED] is true and [PLAN_APPROVED] is false.
---

## Submit Plan for Approval

Use when [PLAN_REQUIRED] is true and [PLAN_APPROVED] is false. Research and present a plan—no code changes until user approves via comment.

### Interpreting User Feedback on Plans

**Treat as APPROVAL** (proceed to code-implementation-protocol):
- Explicit approval: "Approved", "LGTM", "Go ahead", "Proceed", "Ship it"
- Unqualified positive: "This looks good", "Perfect", "Great plan"

**Treat as REVISION REQUEST** (revise plan in this protocol):
- Qualified positive: "Looks good, but..." or "Mostly good, however..."
- Suggestions: "Can you consider...", "Can you also...", "What about..."
- Uncertainty: "I'm not sure about...", "Maybe we should..."
- Questions about approach: "Why not use X instead?"

**When ambiguous**: Default to revision request. It's safer to clarify than to build the wrong thing.

### Step 1: Check for Previous Plan and Feedback

Check if an agent comment contains a previous plan. If so, examine [LATEST_USER_COMMENT]:
- If it contains approval language (see above) → this protocol should not have been invoked; re-check routing
- If it contains revision request language or is ambiguous → incorporate feedback into revised plan

If no previous plan exists, continue to Step 2.

### Step 2: Confirm Status
Status is already `in_progress` (set by Instructions Step 3). No additional update needed.

### Step 3: Load Plan Skill
Invoke the `issues:plan` skill to access plan structure requirements and examples.

### Step 4: Research and Analyze
- Read relevant files in the codebase
- Understand existing patterns and architecture
- Identify dependencies and risks
- Do NOT create worktrees or make code changes

### Step 5: Draft Implementation Plan
Create a detailed plan including:
- Objective and scope
- Proposed approach with steps
- Files to be modified
- Testing strategy
- Risks and mitigations
- Any questions or decision points

If this is a revision, clearly note what changed from the previous version.

### Step 6: Post Plan for Approval
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Implementation Plan\n\n[Your detailed plan]\n\n---\n**Please review and approve this plan before I proceed with implementation.**",
  "author": "agent",
  "codeReferences": [/* relevant files reviewed */]
}
```

### Step 7: Set Status and Wait
```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review"
}
```

**STOP** — Wait for user approval via comment before proceeding to `<code-implementation-protocol>`.

If the user responds with changes or rejection, return to Step 1 and create a revised plan.
