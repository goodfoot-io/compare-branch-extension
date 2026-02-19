---
name: plan
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

Write the plan to `PLAN.md` in the card repository. Commit to the card repository:

```bash
git add PLAN.md
git commit -m "[summary of the plan's approach, key design decisions, and identified risks]"
```

## 2. Assess Plan

### 2.1 Launch Assessment Subagents

Launch both assessments in parallel (one message):

```xml
<invoke name="Task">
  <parameter name="description">Structural Assessment</parameter>
  <parameter name="subagent_type">runtime:card:plan-assessor</parameter>
  <parameter name="prompt">
1. Read the plan from PLAN.md in the card repository.
2. Assess the plan and post a report per your instructions.
</parameter>
</invoke>

<invoke name="Task">
  <parameter name="description">Strategic Assessment</parameter>
  <parameter name="subagent_type">runtime:card:plan-refactor</parameter>
  <parameter name="prompt">
1. Read the plan from PLAN.md in the card repository.
2. Assess the plan and post a report per your instructions.
</parameter>
</invoke>
```

### 2.2 Address Assessment Findings

Read the assessment results from comments or assessment files in the card repository.

### Combined Assessment Priority Levels
- **CRITICAL/RECONSIDER**: Must be addressed before implementation
- **HIGH/CONCERNS**: Should be addressed or explicitly accepted
- **MEDIUM**: Implementation clarity, risk coverage, dependency analysis
- **LOW**: Style suggestions, format variations

### Interpreting Combined Results

Based on combined assessment results:

- **Ready: Yes AND READY**: Proceed to step 3
- **Ready: Yes AND DISCUSS**: Proceed, but document accepted concerns
- **Ready: Yes AND RECONSIDER**: Treat as "Not Ready" — address strategic issues
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

Return to **1.2 Write and Store Plan** and revise.

#### If Both Assessments Pass (Ready: Yes + READY/DISCUSS)

If Plan Refactor returned DISCUSS, write a comment to the card repository documenting the accepted concerns and rationale. Commit to the card repository:

```bash
git add comment/
git commit -m "[which concerns were accepted and why they do not block implementation]"
```

Proceed to **3. Submit for Approval**

## 3. Submit for Approval

**Post a process-oriented comment.** The plan content is already accessible in `PLAN.md` — do not summarize it.

Focus on what the reviewer cannot see: your reasoning process, what you learned, where you made judgment calls, and where you are less certain. Mention the plan version. Surface decisions as questions with your selected answer inline when the right path was not obvious.

Include surprises, dead ends, assumptions, or risks when they would help the reviewer focus their attention. Write naturally — only include what is genuinely useful for this specific plan.

Write the comment to the card repository. Update `CARD.meta.json` to set the status to `needs_review`. Commit to the card repository:

```bash
git add CARD.meta.json comment/
git commit -m "[reasoning process, key judgment calls, areas of uncertainty, and what the reviewer should focus on]"
```

**STOP** — Wait for user feedback on plan.

</instructions>
