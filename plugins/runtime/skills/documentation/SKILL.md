---
name: documentation
description: How to write a documentation request card
---

<how-to-write-a-documentation-request>

Documentation requests should capture intent, audience, and outcomes without prescribing the solution. The goal is to make the work discoverable, verifiable, and useful to the people who need it while leaving room for the planner or implementer to choose the best format and placement.

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

## Writing Principles

- **Anchor in user need**: Who is the audience, what job are they doing, what is the current pain
- **Classify doc type**: Tutorial, how-to, reference, explanation (Diataxis), runbook/playbook, knowledge-base article, or examples
- **Outcomes over implementation**: State what the reader should be able to do, not the exact file or format. "Operators can resolve alert X within 10 minutes" not "Write a Markdown file at path Y"
- **Source of truth**: Where authoritative information lives, accuracy boundaries, update cadence, time sensitivity (use versions/dates, not "new" or "currently")
- **Scannable**: Front-load essentials (audience, task, outcome), short sections, direct language

## Runbook-Specific Additions

If the request is for a runbook or operational guide, include:

- Triggers (alerts, symptoms, thresholds)
- Preconditions and required access
- Step-by-step actions with decision points
- Verification steps and expected signals
- Rollback or escalation paths
- Ownership and on-call contacts
- Known failure modes, error messages, or decision trees
- Whether procedures are routine, emergency-only, or both

## Examples and Knowledge-Base Guidance

For examples: representative inputs/outputs/edge cases, environment requirements, common mistakes to prevent.

For knowledge-base articles: symptoms and diagnosis checklist, environment factors, resolution steps with confirmation, related cards/tags for findability.

</how-to-write-a-documentation-request>
