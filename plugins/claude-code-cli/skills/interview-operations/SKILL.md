---
name: interview-operations
description: Interview skill for improving operations issue titles and descriptions.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user about operational procedures, follow this protocol.

### Step 1: Conduct Research

1.  **Analyze Safety & Recovery:** Use `Task` (explore) to look for "undo buttons"—rollback scripts, backup procedures.
2.  **Gap Analysis:** Explicitly check for *missing* automation. Does a `deploy` script exist but no `rollback`?
3.  **Map the Config Surface:** Use `Bash` (`find`, `grep`) to identify what can be changed via environment variables.

**Codebase research tool selection:**

| Query Type | Tool | Why |
|------------|------|-----|
| Understand deployment | `Bash` (`find`/`cat`) | Reveal how code runs |
| Check configurability | `Task` (agent: "explore") | Identify runtime options |
| Assess blast radius | `Task` (agent: "explore") | Find downstream dependents |

### Step 2: Translate Abstract Questions to Concrete Research

| Abstract Question | Concrete Research |
|-------------------|-------------------|
| "How do we deploy?" | Read CI workflows with `Bash` `cat`. |
| "Can we roll back?" | Check deployment scripts with `Bash`. |
| "Is it automated?" | Look in `scripts/` with `Bash` `ls`. |
| "What are the risks?" | Check for data operations with `Bash` `grep`. |

### Step 3: Surface Considerations, Then Decide

- **Confidence-Based Phrasing:** "I see a `deploy` script but no `rollback`. I assume this is a one-way migration and we need to snapshot the DB first. Correct?"
- **Report Gaps:** Flag the missing safety tools in the issue description.
- **Only ask the user** about urgency, approvals, and external constraints.
</research-before-asking>

<how-to-write-an-operations-request>

Operations requests should capture the operational goal, evidence, and verification while minimizing risk. They emphasize outcomes, constraints, and safety over implementation details so work can be planned and executed by the right operator or team.

Good requests are time-aware but not time-bound: they include urgency, change windows, and risk posture without locking a specific solution.

## Writing Process

### Define the Operational Objective and Urgency

Anchor the request in what needs to be true after the work:

- What service or workflow should improve?
- What user or business impact is at risk (SLA/SLO, error budget, support volume)?
- How urgent is this and why (incident impact, upcoming launch, compliance deadline)?

### Ground the Request in Evidence

Operational work should be grounded in observable signals:

- Symptoms, metrics, logs, dashboards, or incident links
- Baselines (current build time, failure rate, latency, cost)
- Reproducible conditions if applicable

### State Desired Outcomes and Verification

Define outcomes in measurable, testable terms:

- Success targets (flake rate reduction, MTTR improvement, restore pipeline throughput)
- Verification steps (dashboard checks, runbook validation, canary signals)
- Must-have vs nice-to-have outcomes

### Classify Change Type and Constraints

Operational work benefits from explicit change classification:

- Standard vs normal vs emergency change (ITSM/ITIL)
- Environments and regions affected
- Change windows, approvals, or compliance requirements
- Dependencies on other teams or systems

### Make Risk and Reversibility Explicit

Capture safety and failure considerations:

- Expected blast radius and likely failure modes
- Rollback/backout expectations or safe-stop criteria
- Preconditions (access, feature flags, backups, capacity headroom)

### Clarify Ownership and Communication

Define who leads and how updates flow:

- Primary owner/on-call contact and escalation path
- Stakeholder updates or comms expectations
- Links to existing runbooks, SOPs, or prior incidents

### Call Out Toil and Automation Opportunities (Optional)

If the work is recurring or manual, note if explicitly:

- Frequency and operator time cost
- Whether automation is in scope or a follow-up

## Request Structure

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

## Domain-Specific Guidance

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

## Advanced Operational Guidance

### Reduce Cognitive Load

Operational work is error-prone under stress. Requests should make verification and decision points explicit and use checklists for critical paths.

### Favor Layered Defenses

Capture guardrails (feature flags, canaries, staged rollouts, access controls) so failures are contained and reversible.

### Prioritize Learning From Incidents

If the request follows an incident, include the learning goal (what should not happen again) and connect it to postmortem action items.

### Defer to Expertise

When multiple teams are involved, identify who has operational authority during execution to avoid unclear handoffs.

## LLM-Aided Interviewing Guidance

When using LLMs to refine operations requests:
- Ask targeted questions to fill gaps (impact, verification, constraints)
- Propose probable answers only when context supports it; label assumptions
- Avoid inventing runbook steps or commands without sources
- Summarize outcomes and constraints, then confirm with the requester

## Anti-Patterns to Avoid

- **The Vague Chore**: "Fix CI" without pipeline names or evidence
- **The Implementation Lock-in**: Dictating steps or tools without necessity
- **The Missing Verification**: No success signals or rollback expectations
- **The Scope Spill**: Bundling unrelated operational tasks into one request
- **The Risk Blind Spot**: Omitting blast radius or constraints

## Quality Signals

Strong operations requests:
- State measurable outcomes and how to verify them
- Anchor claims in observable data
- Make risk, scope, and constraints explicit
- Support safe execution and clean handoffs

Weak operations requests:
- Describe pain without evidence or impact
- Imply a solution without clarifying goals
- Ignore operational safety or rollback needs

</how-to-write-an-operations-request>

<instructions>
1. Conduct an interview to improve only the issue title and description (do not modify plan content or other fields) so they align with this guidance.

2. Use the `AskUserQuestion` tool to ask focused, sequential questions and propose probable answers when helpful. Continue until you have a clear, complete view of the title and description. If the user asks you to proceed with the information available, move forward with the update.

3. Then patch the issue with the revised title and description:

```
PATCH /issues/[ISSUE_ID]
{
  "title": "[updated title]",
  "description": "[updated description]"
}
```

</instructions>