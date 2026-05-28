
<how-to-write-an-enhancement-request>

Bridge understanding between what exists, what should exist, and why the gap matters. Enable a reader unfamiliar with the system's history to understand the full context. CARD.md describes the capability gap and desired outcome — approach observations that emerge during research belong in notes (`<take-notes>` instructions from `$notes` skill).

## Document Structure

| Section | Purpose | Question Answered |
|---------|---------|-------------------|
| Commander's Intent (no header in CARD.md) | Opening paragraph(s) | "What does success look like from the user's seat?" |
| Historical Context | Explain how the system reached its current state | "How did we get here?" |
| Current Functionality | Document actual behavior with evidence | "What does it do now?" |
| Desired Functionality | State requirements clearly | "What should it do?" |

## Section Notes

- **Commander's Intent** (no heading in CARD.md — the card opens with this paragraph). Every downstream section serves the intent; anything that does not moves to `notes/` or the intent is wrong.
- **Historical Context** (omit header in output): Organize chronologically or by conceptual phases.
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
  - State the "why" alongside the "what."
  - Distinguish must-have from nice-to-have.

## Key Principles

- **Progressive understanding**: Each section builds on the previous. A reader can stop at any section and have coherent understanding.
- **Evidence over assertion**: Point to code for current behavior, reference commits for history, make desired behavior specific enough to test. Fragment-link every named file, function, and type per `<markdown-guidelines>`.
- **Separation of concerns**: Current Functionality describes what is; Desired Functionality what should be.
- **Audience awareness**: Write for the implementer who lacks your context and the future reader who encounters this after implementation.
- **Appropriate abstraction**: Match detail level to section purpose — narrative for history, specific file references for current behavior, testable requirements for desired behavior.

</how-to-write-an-enhancement-request>
