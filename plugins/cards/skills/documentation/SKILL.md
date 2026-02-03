---
name: documentation
description: How to write a documentation request issue
---


<how-to-write-a-documentation-request>

Documentation requests should capture intent, audience, and outcomes without prescribing the solution. The goal is to make the work discoverable, verifiable, and useful to the people who need it while leaving room for the planner or implementer to choose the best format and placement.

Good requests are scannable and timeless: they front-load the most important information and avoid time-bound language that will age the docs quickly.

## Writing Process

### Clarify the User Need and Context

Anchor the request in the real task or decision the reader needs to make:

- Who is the primary audience (new user, operator, support, developer)?
- What job are they trying to get done?
- What is the current pain (missing info, confusing flow, outdated steps)?
- How urgent or high-impact is this gap (e.g., on-call incidents)?

If helpful, express the need in a user story format to make the audience and value explicit:
- "As a [persona], I want [goal], so that [value]."

### Classify the Documentation Type

Different doc types serve different needs. If the user knows the type, record it; if not, infer it from the task:

- **Tutorial**: Learning-oriented, step-by-step onboarding
- **How-to**: Task-focused instructions for a specific goal
- **Reference**: Comprehensive, factual, lookup material
- **Explanation**: Conceptual background or rationale (Diataxis)
- **Runbook/Playbook**: Operational response procedures
- **Knowledge-base Article**: Support-facing diagnosis and resolution
- **Examples**: Concrete, runnable or copyable usage patterns

### Define the Desired Outcome (Success Criteria)

Describe what the reader should be able to do or understand after reading:

- Tasks they can complete, decisions they can make, or incidents they can resolve
- How to verify success (observable results, expected output, or confirmation signals)
- Any must-have vs nice-to-have outcomes

### Record Source of Truth and Constraints

Docs must align with reality. Capture:

- Where the authoritative information lives today (code, config, SMEs)
- Required accuracy boundaries (version, environment, role-based access)
- Compliance, security, or privacy constraints on what can be documented
- Update cadence expectations (one-off, per release, after incidents)
- Time sensitivity (avoid "new" or "currently"; use versions or dates if needed)

### Separate Intent from Implementation

State outcomes, not the exact file or format unless required:

- Good: "Operators can resolve alert X within 10 minutes"
- Avoid: "Write a Markdown file at path Y with steps A, B, C"

If a location or template is required by policy, include it as a constraint, not a solution.

### Make the Request Scannable

Readers often scan, so front-load the essentials:

- Put the audience, task, and outcome at the top
- Use short sections with clear headings
- Prefer concise, direct language over narrative

### Decide How Prescriptive the Docs Should Be

Some docs should recommend a specific path (prescriptive), while others should enumerate options (reference). If prescriptive guidance is needed:

- Call out required vs optional actions explicitly
- Avoid ambiguous "should" language unless policy mandates it

## Request Structure

| Section | Content |
|---------|---------|
| Title | One sentence describing the documentation need, audience, and task |
| Problem | What is missing or confusing today and who it affects |
| Desired Outcome | What the reader should be able to do or understand |
| Scope | In-scope topics and explicit exclusions |
| Sources | Systems, people, or artifacts that define the truth |
| Constraints | Versioning, compliance, tooling, or placement requirements |
| Success Criteria (Optional) | Observable signals that the docs work |

## Runbook-Specific Additions

If the request is for a runbook or operational guide, include:

- Triggers (alerts, symptoms, thresholds)
- Preconditions and required access
- Step-by-step actions with decision points
- Verification steps and expected signals
- Rollback or escalation paths
- Ownership and on-call contacts
- Known failure modes, error messages, or decision trees if available
- Whether procedures are routine, emergency-only, or both

## Procedure Format Signals

If the documentation is primarily procedural (how-to or runbook), note formatting expectations that improve usability:

- Use numbered steps for multi-step procedures
- Use imperative verbs to make actions explicit
- Keep step sequences short; split long procedures into sub-tasks
- Maintain consistent structure across steps

## Examples and Knowledge-Base Guidance

For examples:
- Provide representative inputs, outputs, and edge cases
- Note environment or dependencies required to run the example
- Highlight common mistakes the example should prevent

For knowledge-base articles:
- Symptoms and quick diagnosis checklist
- Environment or configuration factors that change the solution
- Resolution steps and expected confirmation
- Related issues, tags, or search terms to improve findability

## Anti-Patterns to Avoid

- **The Vague Ask**: "Add more docs" without audience or task
- **The Implementation Lock-in**: Prescribing file locations or formats without necessity
- **The Scope Dump**: Bundling unrelated doc needs into one request
- **The Timeless Doc**: Missing version or environment context
- **The Unowned Artifact**: No source of truth or update responsibility

## Quality Signals

Strong documentation requests:
- Make the user task and audience explicit
- Define outcomes that can be validated
- Identify authoritative sources
- Set clear scope boundaries
- Avoid premature implementation details

Weak documentation requests:
- Describe only "missing docs" without intent
- Assume a format without rationale
- Provide no context for accuracy or ownership
- Mix multiple audiences and goals in one request

</how-to-write-a-documentation-request>