
<how-to-write-an-enhancement-request>

Bridge understanding between what exists, what should exist, and why the gap matters. Enable a reader unfamiliar with the system's history to understand the full context. CARD.md describes the capability gap and desired outcome.

## Document Structure

| Section | Purpose | Question Answered |
|---------|---------|-------------------|
| Commander's Intent (no header in CARD.md) | Opening paragraph(s) | "What does success look like from the user's seat?" |
| Historical Context (no header in CARD.md) | Explain how the system reached its current state | "How did we get here?" |
| Current Functionality | Document actual behavior with evidence | "What does it do now?" |
| Desired Functionality | State requirements clearly | "What should it do?" |

## Section Notes

- **Historical Context**: Organize chronologically or by conceptual phases.
  - Each phase explains what changed, why, and its effect.
  - Write for a reader with no prior context.
  - Reference commits/PRs with explanations, not just citations.
- **Current Functionality**: Ground every claim in observable code with file paths and line numbers.
  - Describe behavior, not implementation details.
  - Use present tense.
  - Distinguish intentional from incidental behavior.
- **Desired Functionality**: Write requirements as outcomes, not tasks.
  - Use mermaid diagrams for multi-step flows or state transitions.
  - Be specific about boundaries and out-of-scope items.
  - Name what the new behavior commits to as contract — every new capability is a new compatibility surface.
  - Include the observability the behavior ships with — a requirement, not a follow-up.
  - State the "why" alongside the "what."
  - Distinguish must-have from nice-to-have.

## Key Principles

- **Progressive understanding**: Each section builds on the previous. A reader can stop at any section and have coherent understanding.
- **Evidence over assertion**: Point to code for current behavior, reference commits for history, make desired behavior specific enough to test. Fragment-link code references per `<markdown-guidelines>`.
- **Audience awareness**: Write for the implementer who lacks your context and the future reader who encounters this after implementation.

</how-to-write-an-enhancement-request>
