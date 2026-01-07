---
name: interview-maintenance
description: Interview skill for improving maintenance issue titles and descriptions.
---

<instructions>

## 1. When to Use This Skill

**Trigger conditions:**
- User asks to refactor, clean up, or reduce tech debt
- User requests upgrades, migrations, or deprecations
- User wants reliability, performance, or cost improvements without new features
- User needs to reduce toil or improve maintainability/observability

Maintenance requests document improvements that preserve behavior while reducing long-term risk or cost. They are distinct from bug reports (unexpected behavior) and enhancements (new or changed functionality).

## 2. Core Principle

Maintenance requests should explain **why the work matters** and **what success looks like** without prescribing how to implement it. The document should make the debt visible, bound the scope, and protect critical behavior.

## 3. Document Structure

Maintenance requests follow a six-section structure:

| Section | Purpose | Question Answered |
|---------|---------|-------------------|
| Motivation & Impact | Explain why the work matters | "Why now?" |
| Current State | Describe the maintenance burden | "What is costly or risky today?" |
| Desired Outcomes | Define success without prescribing implementation | "What should improve?" |
| Scope & Constraints | Bound the work | "What is in/out, what must be preserved?" |
| Risks & Dependencies | Surface coordination and rollout needs | "What could go wrong or block us?" |
| Acceptance Signals | Make completion verifiable | "How do we know it's done?" |

## 4. Motivation & Impact

Anchor the request in measurable impact: operational risk, developer time, reliability, cost, or looming deprecations.

**What to include:**
- The specific pain (slow builds, flaky tests, brittle modules, deprecated APIs)
- Who is affected and how often
- Deadlines (EOL dates, security policies, vendor timelines)
- Evidence: incidents, metrics, recurring manual steps (toil)

**Guidance:**
Use the technical-debt metaphor: call out the "interest" (ongoing cost) and the "principal" (cleanup work). Avoid vague urgency; quantify the impact when possible.

**Anti-patterns:**
- **The Urgency Claim**: "We must do this soon" without evidence of risk or cost
- **The Invisible Cost**: No mention of how this work reduces future effort or failure

## 5. Current State

Describe the maintenance burden so readers can verify it and estimate effort.

**What to include:**
- Relevant components, file paths, or services
- Existing workflows and the friction they cause
- Known hotspots (complex modules, fragile integrations, build scripts)
- Current versions or dependencies if upgrades are involved

**Guidance:**
Stick to observable facts. Use code references, metrics, or links to past issues. If evidence exists in "self-admitted technical debt" comments (e.g., TODO/FIXME), reference them.

**Anti-patterns:**
- **The Hunch**: Speculating about debt without verifiable references
- **The Anatomy Dump**: Listing every file touched without explaining the burden

## 6. Desired Outcomes

Define outcomes that reduce maintenance cost while preserving behavior.

**What to include:**
- Reliability or stability outcomes (reduced flake rate, fewer incidents)
- Maintainability outcomes (simpler boundaries, fewer dependencies)
- Performance or cost targets when applicable
- Migration end-states (no usage of deprecated API)

**Guidance:**
Write outcomes as verifiable statements. Avoid prescribing solutions unless required by a hard constraint (e.g., vendor EOL). If multiple approaches are possible, keep the outcome neutral.

**Anti-patterns:**
- **The Refactor Command**: "Refactor module X" with no outcome
- **The Vague Goal**: "Cleaner code" without measurable signals

## 7. Scope & Constraints

Prevent scope creep and protect critical behaviors.

**What to include:**
- In-scope and out-of-scope areas
- Constraints (must preserve APIs, data formats, SLAs)
- Compatibility requirements (backward/forward)
- Operational constraints (maintenance windows, release cadence)

**Guidance:**
Be explicit about what must not change, especially user-facing behavior. Maintenance work fails when implicit constraints are missed.

**Anti-patterns:**
- **The Unlimited Cleanup**: "Clean up the codebase" with no boundaries
- **The Constraint Omission**: Forgetting API or data compatibility

## 8. Risks & Dependencies

Surface coordination needs and migration hazards early.

**What to include:**
- Dependency upgrades and compatibility risks
- Data migration or rollback considerations
- Cross-team or vendor coordination
- Testing or observability gaps

**Guidance:**
Identify risks without demanding a full plan. For large migrations, note if phased rollout or "strangler" style replacement is likely needed.

**Anti-patterns:**
- **The Hidden Risk**: Omitting deprecation timelines or rollback concerns
- **The Plan Trap**: Writing a detailed implementation plan here

## 9. Acceptance Signals

Make completion verifiable without prescribing detailed steps.

**What to include:**
- Metrics or thresholds that show improvement
- Specific checks (build time, error rate, debt reduced)
- Migration completion signals (no usage of deprecated API)
- Documentation or runbook updates when required

**Guidance:**
Avoid "done when refactor is complete." Use outcomes that can be checked by anyone.

**Anti-patterns:**
- **The Handwave**: "Done when the code is clean"
- **The Hidden Criteria**: Success criteria only known to the author

## 10. Advanced Techniques (Optional)

### 10.1 Issue Tracker Alignment

Use issue templates and structured fields to enforce required information and enable reporting. Templates should prompt for impact, scope, and acceptance signals, as seen in systems like Linear and Jira.

### 10.2 LLM Assistance (Use Carefully)

LLMs can help draft summaries, extract recurring pain points, or propose acceptance checks, but every claim must be verified with code references, metrics, or logs. Use LLMs to *surface* candidates, not to assert facts.

## 11. Key Principles

### 11.1 Intent Over Implementation

Maintenance requests should state the why and the outcomes, not the exact steps. Over-prescription blocks better approaches and inflates risk.

### 11.2 Evidence Over Assertion

Technical debt is easiest to fund when its cost is visible. Use metrics, incidents, and code references, not opinions.

### 11.3 Scope Control

Refactors grow without firm boundaries. In-scope/out-of-scope and constraints protect delivery.

### 11.4 Risk Awareness

Upgrades and migrations fail when dependencies and rollback paths are ignored. Make these explicit early.

## 12. Quality Signals

**Strong maintenance requests:**
- Explain the debt and its impact in measurable terms
- Describe outcomes and constraints clearly
- Define scope and acceptance signals
- Surface risks and dependencies without prescribing a plan

**Weak maintenance requests:**
- Only say "refactor/cleanup" with no outcomes
- Lack scope boundaries or success criteria
- Hide risks or required coordination

## 13. Execution

Conduct an interview to improve only the issue title and description (do not modify plan content or other fields) so they align with this guidance.

Use the `AskUserQuestion` tool to ask focused, sequential questions and propose probable answers when helpful. Continue until you have a clear, complete view of the title and description. If the user asks you to proceed with the information available, move forward with the update.

Then patch the issue with the revised title and description:

```
PATCH /issues/[ISSUE_ID]
{
  "title": "[updated title]",
  "description": "[updated description]"
}
```

</instructions>
