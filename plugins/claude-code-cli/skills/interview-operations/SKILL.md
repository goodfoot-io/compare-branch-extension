---
name: interview-operations
description: Interview skill for improving operations issue titles and descriptions.
---

<instructions>

## 1. When to Use This Skill

**Trigger conditions:**
- CI/build failures, flaky pipelines, or toolchain degradation
- Infra chores (upgrades, migrations, deprecations, capacity, cost)
- Reliability, performance, or availability maintenance work
- Operational support tasks (on-call follow-ups, incident action items)
- Runbook creation or updates for routine or emergency operations

## 2. Core Principle

Operations requests should capture the operational goal, evidence, and verification while minimizing risk. They emphasize outcomes, constraints, and safety over implementation details so work can be planned and executed by the right operator or team.

Good requests are time-aware but not time-bound: they include urgency, change windows, and risk posture without locking a specific solution.

## 3. Writing Process

### 3.1 Define the Operational Objective and Urgency

Anchor the request in what needs to be true after the work:

- What service or workflow should improve?
- What user or business impact is at risk (SLA/SLO, error budget, support volume)?
- How urgent is this and why (incident impact, upcoming launch, compliance deadline)?

### 3.2 Ground the Request in Evidence

Operational work should be grounded in observable signals:

- Symptoms, metrics, logs, dashboards, or incident links
- Baselines (current build time, failure rate, latency, cost)
- Reproducible conditions if applicable

### 3.3 State Desired Outcomes and Verification

Define outcomes in measurable, testable terms:

- Success targets (flake rate reduction, MTTR improvement, restore pipeline throughput)
- Verification steps (dashboard checks, runbook validation, canary signals)
- Must-have vs nice-to-have outcomes

### 3.4 Classify Change Type and Constraints

Operational work benefits from explicit change classification:

- Standard vs normal vs emergency change (ITSM/ITIL)
- Environments and regions affected
- Change windows, approvals, or compliance requirements
- Dependencies on other teams or systems

### 3.5 Make Risk and Reversibility Explicit

Capture safety and failure considerations:

- Expected blast radius and likely failure modes
- Rollback/backout expectations or safe-stop criteria
- Preconditions (access, feature flags, backups, capacity headroom)

### 3.6 Clarify Ownership and Communication

Define who leads and how updates flow:

- Primary owner/on-call contact and escalation path
- Stakeholder updates or comms expectations
- Links to existing runbooks, SOPs, or prior incidents

### 3.7 Call Out Toil and Automation Opportunities (Optional)

If the work is recurring or manual, note it explicitly:

- Frequency and operator time cost
- Whether automation is in scope or a follow-up

## 4. Request Structure

| Section | Content |
|---------|---------|
| Title | One sentence naming the system, operational goal, and impact |
| Context | What is failing or degrading today, with evidence |
| Desired Outcome | Measurable target state and how to verify it |
| Impact/Risk | User impact, urgency, and risk level |
| Change Type | Standard/normal/emergency and why |
| Scope | In-scope systems/environments and explicit exclusions |
| Constraints/Dependencies | Change windows, approvals, and cross-team dependencies |
| References | Dashboards, incidents, runbooks, tickets, or configs |
| Rollback/Contingency (Optional) | Expectations for reversibility or mitigation |

## 5. Domain-Specific Guidance

**CI/Build/Tooling:**
- Name the pipeline/job and failure modes
- Include baseline run time, flake rate, or failure frequency
- Note build artifacts, caches, or external dependencies

**Infra/Platform Chores:**
- Specify environment, lifecycle stage, and deadline drivers (EOL, security)
- Note capacity, cost, and performance signals
- Call out sequencing with other migrations or change windows

**Support/Runbook Work:**
- Include trigger conditions, symptoms, and decision points
- Define verification signals and escalation paths
- Keep steps outcome-focused; avoid prescribing exact commands unless required

## 6. Advanced Operational Guidance

### 6.1 Reduce Cognitive Load

Operational work is error-prone under stress. Requests should make verification and decision points explicit and use checklists for critical paths.

### 6.2 Favor Layered Defenses

Capture guardrails (feature flags, canaries, staged rollouts, access controls) so failures are contained and reversible.

### 6.3 Prioritize Learning From Incidents

If the request follows an incident, include the learning goal (what should not happen again) and connect it to postmortem action items.

### 6.4 Defer to Expertise

When multiple teams are involved, identify who has operational authority during execution to avoid unclear handoffs.

## 7. LLM-Aided Interviewing Guidance

When using LLMs to refine operations requests:
- Ask targeted questions to fill gaps (impact, verification, constraints)
- Propose probable answers only when context supports it; label assumptions
- Avoid inventing runbook steps or commands without sources
- Summarize outcomes and constraints, then confirm with the requester

## 8. Anti-Patterns to Avoid

- **The Vague Chore**: "Fix CI" without pipeline names or evidence
- **The Implementation Lock-in**: Dictating steps or tools without necessity
- **The Missing Verification**: No success signals or rollback expectations
- **The Scope Spill**: Bundling unrelated operational tasks into one request
- **The Risk Blind Spot**: Omitting blast radius or constraints

## 9. Quality Signals

Strong operations requests:
- State measurable outcomes and how to verify them
- Anchor claims in observable data
- Make risk, scope, and constraints explicit
- Support safe execution and clean handoffs

Weak operations requests:
- Describe pain without evidence or impact
- Imply a solution without clarifying goals
- Ignore operational safety or rollback needs

## 10. Execution

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
