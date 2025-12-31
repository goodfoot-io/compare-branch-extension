---
name: issue-plan
description: Create implementation plans for user approval.
---

<placeholder-variables>
[LATEST_USER_COMMENT] — Most recent comment from `author: "user"` (if any)
[PLAN_CONTENT] — The plan markdown content from `planContent` field (string or null if not set)

Note: [ISSUE_ID], [TITLE], and [DESCRIPTION] are defined in `prompt.md`.
</placeholder-variables>

<instructions>

Create implementation plans for issues requiring user approval before coding begins. Do NOT create worktrees or make code changes—plans must be approved before any implementation begins.

## 1. Entry Check

Evaluate conditions in order (first match wins). "Previous plan" = [PLAN_CONTENT] is not null.

- **Previous plan AND [LATEST_USER_COMMENT] is null**: Skip to step 3.9 (Wait)
- **Previous plan AND [LATEST_USER_COMMENT] contains revision request**: Revise plan. Start at step 2 or 3 depending on scope. Assessment cycles reset.
- **Previous plan AND [LATEST_USER_COMMENT] exists but no revision signals**: Skip to step 3.9 (Wait)
- **No previous plan**: Create new plan. Start at step 2.

## 2. Classifying User Feedback

**Default: When intent is unclear, treat as revision request.**

<revision-signals>
These signals mean stay in this skill and revise:
- Qualified positive: "Looks good, but...", "Mostly good, however..."
- Suggestions: "Can you consider...", "Can you also...", "What about..."
- Uncertainty: "I'm not sure about...", "Maybe we should..."
- Alternative proposals: "Why not use X instead?"
</revision-signals>

## 3. Workflow

### 3.1 Load Plan Skill

Invoke `claude-code-cli:plan` for structure requirements and examples.

### 3.2 Research

Before asking the user any question, follow this research-first protocol.

#### 3.2.1 Conduct Research

1. **Search the codebase** for existing patterns, conventions, and constraints
2. **Check package.json** and lock files for version constraints and dependencies
3. **Search the web** for package documentation, type definitions, and known issues
4. **Eliminate options** that conflict with architecture, constraints, or documented limitations

Track all reviewed paths for `codeReferences` in step 3.8.

#### 3.2.2 Translate Questions to Research

| Abstract Question | Concrete Research |
|-------------------|-------------------|
| "Solving actual problem?" | Find existing code handling this case |
| "Earn complexity?" | Count usages of proposed abstraction |
| "Right abstraction level?" | Search for similar patterns in codebase |
| "Implicit assumptions?" | Search for undocumented conventions |

#### 3.2.3 Surface Considerations, Then Decide

After research:
- State the consideration you're weighing
- Share what you discovered and which options remain viable
- Make your recommended decision with rationale
- Document the decision in the plan for user approval

**Only ask the user when:**
- **Blocking**: Cannot proceed without their input (e.g., missing credentials, conflicting hard requirements)
- **Intent clarity**: Risk of solving the wrong problem

For all other decisions, make your best judgment. The plan is the approval checkpoint.

#### 3.2.4 Default Stances (Apply Without Asking)

| Situation | Default |
|-----------|---------|
| New package needed | Use latest stable version |
| Existing package in project | Preserve current version unless upgrade required |
| Single viable approach after research | Proceed with documented rationale |
| Multiple viable approaches | Choose recommended approach, document alternatives in plan |

#### 3.2.5 Determine Spike Needs

After research, evaluate whether technical uncertainties require empirical validation.

**Key decision: Has the technology/approach been chosen?**

- **Technology NOT chosen**: Strategic spike — compare 2-3 alternatives
- **Technology chosen, capability uncertain**: Tactical spike — validate specific capability
- **Well-documented standard feature**: Skip spikes

**Conduct spikes when:**
- Multiple viable approaches exist and prototyping would reveal material differences
- Decision significantly impacts architecture
- Specific capability or version compatibility needs verification
- Integration between libraries needs validation

**Skip spikes when:**
- Official documentation confirms capability with working examples
- Codebase already uses the pattern successfully
- Standard language/framework features
- Technology selection hasn't been considered yet (research codebase first)

### 3.3 Conduct Spikes (When Needed)

If section 3.2.5 identified spike needs, invoke the spike skill:

```xml
<invoke name="Skill">
  <parameter name="skill">claude-code-cli:spike</parameter>
</invoke>
```

Then provide spike details in your message:

**For Strategic Spikes** (comparing alternatives):
```
Compare [Approach A], [Approach B], and [Approach C] for [use case].
Compare [criterion 1], [criterion 2], and [criterion 3].
Use spike path `.spikes/[ISSUE_ID]/[test-name]/`
```

**For Tactical Spikes** (validating single approach):
```
Verify [Library@version] supports [specific capability].
Use spike path `.spikes/[ISSUE_ID]/[test-name]/`
```

After spike completes:
1. Review spike artifacts at `.spikes/[ISSUE_ID]/[test-name]/`
2. Incorporate findings into plan's Technical Approach
3. Document results in plan's Technical Spike Results section

If no spikes needed, proceed to section 3.4.

### 3.4 Clarify Title and Description

After research, evaluate whether the title and description clearly represent the planned work.

#### 3.4.1 Title Evaluation

A good title completes the sentence: *"To finish this ticket, I need to [TITLE]"*

Determine the issue type, then apply the corresponding rules:

- **Feature or enhancement**: Title should start with action verb ("Add", "Update", "Remove") and describe the user-observable outcome
- **Bug or diagnostic issue**: Title should identify root cause and impact — diagnostic clarity takes precedence over action verbs (e.g., "SessionPidRegistry never instantiated — process tracking disabled" is preferred over "Instantiate SessionPidRegistry")
- **API or infrastructure change**: The technical change IS the observable outcome for developer users — titles like "Add GraphQL subscriptions for issue updates" are acceptable

Clarify title when:

- **Truncated or incomplete**: Complete the thought concisely
- **Describes symptom only**: Add root cause if research revealed it
- **References wrong component**: Correct to match codebase
- **Contains rationale clause**: Move "because..." or "as..." explanations to description
- **Multi-part scope unclear**: If issue has multiple distinct changes, title should summarize the primary change or use "and" to connect two major items (not three or more)

#### 3.4.2 Description Evaluation

Clarify description when:

- **Duplicates title verbatim**: Expand with context, motivation, and criteria
- **Missing problem/motivation**: Add brief explanation of why this matters
- **Missing current vs desired**: Add contrast showing before/after states
- **Vague acceptance criteria**: Add observable, testable success conditions
- **Ambiguous scope phrases**: Clarify "replacing or complementing", "etc.", "and more"

Enrich descriptions with context discovered during research:

- Relevant file paths and component names
- Technical constraints or dependencies
- Acceptance criteria (if inferable from user intent)
- Brief background on why this change matters

#### 3.4.3 Preservation Principles

- Preserve all user-provided details, requirements, and constraints
- Maintain user intent — the clarified version must request the same outcome
- Correct factual errors in main text; append footnote: `*Corrections: Changed X to Y (reason)*`
- Do not expand scope beyond user intent
- When adding acceptance criteria, derive from stated intent — do not introduce new requirements

**Leave unchanged when:** Only minor phrasing or style preferences would change.

```
PATCH /issues/[ISSUE_ID]
{
  "title": "[CLARIFIED_TITLE]",
  "description": "[CLARIFIED_DESCRIPTION]"
}
```

Omit `title` and `description` fields if no changes are needed. Document any changes in the plan's scope section.

### 3.5 Draft Plan

Include:
- Objective and scope
- Proposed approach with steps
- Files to be modified
- Testing strategy
- Risks and mitigations
- Questions or decision points

For revisions: Add a "## Changes from Previous Version" section listing each modification.

### 3.6 Store and Assess

First, store the drafted plan:
```
PATCH /issues/[ISSUE_ID]
{
  "planContent": "[drafted plan markdown]"
}
```

Then launch both assessments in parallel (one message):
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

### 3.7 Address Findings

Review both assessment reports.

#### 3.7.1 Priority Levels

- **CRITICAL/RECONSIDER**: Must be addressed before implementation
- **HIGH/CONCERNS**: Should be addressed or explicitly accepted
- **MEDIUM**: Implementation clarity, risk coverage
- **LOW**: Style suggestions — do not revise for these

#### 3.7.2 Interpreting Combined Results

Determine path using the first matching condition:

- **Ready: No (any Plan Refactor result)**: Address structural issues first
- **Any result + RECONSIDER**: Address strategic issues before proceeding
- **Ready: Yes + RECONSIDER**: Treat as "Not Ready" — address strategic issues
- **Ready: Yes + DISCUSS**: Proceed to step 3.8, but document accepted concerns (section 3.7.4)
- **Ready: Yes (with suggestions) + READY/DISCUSS**: Proceed to step 3.8 with awareness of suggestions
- **Ready: Yes + READY**: Proceed to step 3.8

#### 3.7.3 After Both Assessments Complete

1. **Resolve questions through research** following section 3.2
2. **Conduct spikes for unvalidated assumptions**: If assessors flag technical claims lacking evidence, invoke `claude-code-cli:spike`
3. **Surface considerations visibly** as you work through them
4. **Track subjective decisions**: Collect design choices and judgment calls for the plan's decision log
5. **Make decisions** for non-blocking issues and document in the plan revision
6. **Only ask the user** for blocking issues or intent clarity
7. **Determine next action** based on combined results table above

#### 3.7.4 If Plan Refactor Returned DISCUSS

Document accepted concerns before proceeding:

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Accepted Concerns\n\nThe following strategic concerns were noted but accepted:\n- [Concern]: [Rationale for accepting]",
  "author": "agent"
}
```

#### 3.7.5 Update Title or Description

**Update title when assessor findings reveal:**

- Title describes symptom but investigation found root cause
- Title names wrong component or approach
- Title scope doesn't match planned work (e.g., title mentions one change but plan covers multiple)

**Update description when assessor findings reveal:**

- Incorrect assumptions or factual errors (wrong root cause, incorrect component, invalid constraints)
- Ambiguous requirements that led to assessor confusion
- Missing context that assessors needed to ask about

```
PATCH /issues/[ISSUE_ID]
{
  "title": "[CORRECTED_TITLE]",
  "description": "[corrected description]\n\n---\n*Corrections based on evaluation: [what changed and why]*"
}
```

Do not update for stylistic preferences or minor clarifications — only when evidence directly contradicts stated facts or when ambiguity caused assessor confusion.

#### 3.7.6 Determine Next Action

Based on combined results (section 3.7.2) and priority levels (section 3.7.1):

- **Unvalidated technical assumptions flagged**: Invoke `claude-code-cli:spike`, then revise plan with findings
- **CRITICAL/RECONSIDER or HIGH/CONCERNS**: Revise the plan, re-store via PATCH, re-run step 3.6. Iterate until both assessments pass.
- **MEDIUM or LOW only**: Proceed to step 3.8. Do not revise for style suggestions.
- **DISCUSS with no blocking issues**: Document accepted concerns (section 3.7.4), then proceed to step 3.8.

### 3.8 Submit for Approval

Update the issue with the final plan:

```
PATCH /issues/[ISSUE_ID]
{
  "planContent": "[detailed plan markdown]",
  "codeReferences": ["/path/to/reviewed/file.ts"]
}
```

### 3.9 Wait

**STOP** — Plan submitted for review. Awaiting your approval or feedback.

The orchestration layer will re-invoke when user responds:
- Approval (`planApproved` set to true) → routes to `claude-code-cli:issue-implementation-with-plan`
- Revision request → re-invokes this skill; Entry Check routes to step 2 or 3

</instructions>
