
<placeholder-variables>
[PLAN_REQUIRED] — Whether plan approval is needed from `planRequired` field
[USER_REQUESTED_APPROACH] — User explicitly asks to document a specific implementation approach or solution
[HAS_SPECIFIC_SOLUTION] — Card text or comments include concrete implementation steps or design choices
[HIGH_RISK_CHANGE] — Cross-cutting refactor, migration, or performance-sensitive change described in card
[MULTIPLE_APPROACHES] — Notes or discussion indicate more than one viable approach
[DEPENDENCY_COORDINATION] — Card mentions sequencing across components/teams or external dependencies
[NEEDS_ACTIONABLE_NOW] — No plan step expected AND description must be sufficient to implement
[APPROACH_DETAILS_PRESENT] — Sufficient detail exists to describe an approach without guessing
[INCLUDE_IMPLEMENTATION_APPROACH] — True when any of: [USER_REQUESTED_APPROACH], [HAS_SPECIFIC_SOLUTION], [HIGH_RISK_CHANGE], [MULTIPLE_APPROACHES], [DEPENDENCY_COORDINATION], [NEEDS_ACTIONABLE_NOW]
[ASK_FOR_APPROACH_DETAILS] — [INCLUDE_IMPLEMENTATION_APPROACH] is true AND [APPROACH_DETAILS_PRESENT] is false
</placeholder-variables>

Before evaluating any placeholder variables: (1) read `CARD.md` for the enhancement description and any embedded approach details; (2) read `CARD.meta.json` and extract the `planRequired` field to set `[PLAN_REQUIRED]`; (3) read all `comment/*.md` files to identify user-requested approaches or approach details already provided. Evaluate all `<placeholder-variables>` conditions from this content before proceeding.

<how-to-write-an-enhancement-request>

Enhancement requests bridge understanding between what exists, what should exist, and why the gap matters. The document should enable someone unfamiliar with the system's history to understand the full context.

## Document Structure

| Section | Purpose | Question Answered |
|---------|---------|-------------------|
| Historical Context | Explain how the system reached its current state | "How did we get here?" |
| Current Functionality | Document actual behavior with evidence | "What does it do now?" |
| Desired Functionality | State requirements clearly | "What should it do?" |
| Implementation Approach (Optional) | Describe the path forward | "How could we get there?" |

## Section Notes

- **Historical Context** (omit header in output): Organize chronologically or by conceptual phases. Each phase explains what changed, why, and its effect. Write for a reader with no prior context. Reference commits/PRs with explanations, not just citations.
- **Current Functionality**: Ground every claim in observable code with file paths and line numbers. Describe behavior, not implementation details. Use present tense. Distinguish intentional from incidental behavior.
- **Desired Functionality**: Write requirements as outcomes, not tasks. Where the desired behavior involves multi-step flows or state transitions, a mermaid diagram can replace verbose prose. Be specific about boundaries and out-of-scope items. State the "why" alongside the "what." Distinguish must-have from nice-to-have.
- **Implementation Approach** (Optional): See conditional logic below.

## Implementation Approach (Section 5)

Determine whether to include:
- **[INCLUDE_IMPLEMENTATION_APPROACH]**: Include this section
- **[INCLUDE_IMPLEMENTATION_APPROACH] is false and [PLAN_REQUIRED] is true**: Omit and defer to planning step

If [ASK_FOR_APPROACH_DETAILS] is true, ask targeted questions using `AskUserQuestion` to capture missing details. If the user asks to proceed, include a minimal approach based on known constraints and explicitly call out unknowns.

When included: Write in natural language without code examples. Focus on "what" and "why," leaving "how" to implementers. Explain reasoning. Address uncertainty explicitly. Connect changes to requirements.

## Key Principles

- **Progressive understanding**: Each section builds on the previous. A reader can stop at any section and have coherent understanding.
- **Evidence over assertion**: Point to code for current behavior, reference commits for history, make desired behavior specific enough to test. When referencing workspace files, use markdown fragment links — `[src/auth/provider.ts L42](./src/auth/provider.ts#L42)` — instead of backtick code spans so the card-detail webview renders them as clickable buttons. Non-workspace paths (e.g. `~/.cards/cards-api.json`) remain as backtick code spans.
- **Separation of concerns**: Current Functionality describes what is; Desired Functionality what should be; Implementation Approach how to bridge them. Do not mix.
- **Audience awareness**: Write for the implementer who lacks your context and the future reader who encounters this after implementation. Make the implicit explicit.
- **Appropriate abstraction**: Match detail level to section purpose — narrative for history, specific file references for current behavior, testable requirements for desired behavior, direction without code for approach.

</how-to-write-an-enhancement-request>
