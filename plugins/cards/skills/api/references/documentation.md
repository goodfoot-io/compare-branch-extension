
<how-to-write-a-documentation-request>

Capture intent, audience, and outcomes without prescribing the solution. Leave room for the planner or implementer to choose format and placement. CARD.md describes the documentation gap and audience — approach observations that emerge during research belong in notes (`<take-notes>` instructions from `cards:notes` skill).

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

- **Anchor in user need**: Who is the audience, what job are they doing, what is the current pain.
- **Classify doc type**: Tutorial, how-to, reference, explanation (Diataxis), runbook/playbook, knowledge-base article, or examples.
- **Outcomes over implementation**: State what the reader should be able to do, not the exact file or format.
- **Source of truth**: Where authoritative information lives, accuracy boundaries, update cadence.
  - Use versions/dates, not "new" or "currently."
  - Fragment-link every named file, function, and type per `<markdown-guidelines>`.
- **Scannable**: Front-load essentials (audience, task, outcome), short sections, direct language.
- **Visual when structural**: Use mermaid diagrams for system interactions, decision trees, or data flows — prose for everything else.

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
