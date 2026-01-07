---
name: interview-investigation
description: Interview skill for improving investigation issue titles and descriptions.
---

<instructions>

## 1. When to Use This Skill

**Trigger conditions:**
- User asks for research, diagnostics, or a feasibility check
- User wants a spike or exploratory investigation
- Problem space is unclear and needs discovery before committing to changes
- User needs to reduce uncertainty or validate assumptions
- The request is about deciding whether or how to proceed

**Distinction from bug reports/enhancements:**
Investigation requests are about learning and decision-making, not delivering a fix or feature. They document unknowns, the plan to reduce them, and the decision criteria.

## 2. Core Principle

An investigation request should make the intent and outcomes explicit: what needs to be learned, why it matters, and how to know when the investigation is complete. It should avoid prescribing solutions and instead focus on evidence gathering and decision readiness.

## 3. Document Structure

| Section | Purpose | Question Answered |
|---------|---------|-------------------|
| Summary | Concise statement of the unknown and why it matters | "What are we trying to learn and why now?" |
| Background | Context that frames the investigation | "What is the current situation?" |
| Key Questions / Hypotheses | The unknowns to resolve | "What do we need to validate or falsify?" |
| Scope & Constraints | Boundaries for the investigation | "What is in/out, and what limits apply?" |
| Approach & Evidence Sources | How evidence will be gathered | "Where will answers come from?" |
| Deliverables | Expected outputs | "What artifacts should exist when done?" |
| Decision Criteria | How results influence next steps | "How will we decide what to do next?" |
| Risks & Assumptions | Known uncertainties and dependencies | "What could invalidate or skew results?" |

## 4. Summary

State the investigation intent in one or two sentences. Focus on the learning objective and the decision it will inform.

**Guidance:**
Write the summary as a question or uncertainty paired with impact. Example: "Assess whether the current indexing pipeline can meet a 2x throughput target without new infrastructure; results will decide whether to pursue a rewrite or incremental tuning."

## 5. Background

Provide only the context required to understand the investigation and why it is needed now.

**What to include:**
- Current system behavior, constraints, or pain points
- Prior attempts or existing evidence
- Stakeholders affected by the outcome

**Guidance:**
Keep this concise and factual. The goal is to frame, not to argue for a solution.

## 6. Key Questions / Hypotheses

Enumerate the unknowns that must be resolved. This is the heart of an investigation request.

**What to include:**
- Specific questions that can be answered with evidence
- Hypotheses to validate or falsify (if applicable)
- Decision blockers that hinge on these answers

**Guidance:**
Phrase questions so they can be answered with data. Replace vague "Is this scalable?" with "What throughput is sustainable under current resource constraints?"

## 7. Scope & Constraints

Define the boundaries and guardrails for the investigation.

**What to include:**
- What is in scope and out of scope
- Time limits, deadlines, or effort caps
- Environments or datasets to use
- Constraints on tools, access, or data handling

**Guidance:**
Scope should be narrow enough to complete but broad enough to answer the key questions.

## 8. Approach & Evidence Sources

Describe how evidence will be gathered to answer the key questions.

**What to include:**
- Data sources (logs, metrics, code, experiments)
- Methods (benchmarks, profiling, interviews, prototypes)
- Validation steps (reproducible tests, peer review, comparisons)

**Guidance:**
Favor evidence that is repeatable and verifiable. Avoid approaches that depend on tribal knowledge without documentation.

## 9. Deliverables

List the expected outputs from the investigation.

**Examples:**
- Summary of findings with supporting evidence
- Recommendation with trade-offs
- Prototype results or benchmark data
- Decision log or go/no-go criteria

## 10. Decision Criteria

Define how the investigation results will drive next steps.

**What to include:**
- Thresholds or conditions for proceeding
- How uncertainty will be handled
- Who signs off on the decision

## 11. Risks & Assumptions

Surface what could skew the investigation or limit its conclusions.

**What to include:**
- Assumptions that need validation
- Data quality or access limitations
- External dependencies or blockers
- Risks of false positives/negatives

## 12. Execution

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
