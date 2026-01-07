---
name: interview-enhancement
description: Guide for writing enhancement requests that document system evolution, current behavior, and desired functionality.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user how the system works now or how it *should* work, follow this protocol.

### Step 1: Conduct Research

1. **Trace Current Behavior:** Use `Task` with the `explore` agent to "Map the data flow of feature X".
2. **Historical Archaeology:** Use `Bash` `git log -p [file]` or `git blame` to understand history.
3. **Constraint Analysis:** Use `Task` (explore) to "Identify hard constraints or interfaces for X".

**Codebase research tool selection:**

| Query Type | Tool | Why |
|------------|------|-----|
| Map current flow | `Task` (agent: "explore") | Understand dependencies and call graphs |
| Find historical context | `Bash` (`git log`) | Uncover why code is this way |
| Check constraints | `Task` (agent: "explore") | Identify limits on changes |

### Step 2: Translate Abstract Questions to Concrete Research

| Abstract Question | Concrete Research |
|-------------------|-------------------|
| "How does it work now?" | Use `Task` (explore) to explain the flow. |
| "Why is it like this?" | Search commit messages with `Bash` `git log --grep`. |
| "What breaks if I change X?" | Find references with `Bash` `grep` or `Task` (explore). |
| "Is this feasible?" | Check available libraries with `Bash` `cat package.json`. |

### Step 3: Surface Considerations, Then Decide

- Pre-populate "Historical Context" and "Current Functionality".
- Propose "Desired Functionality" aligned with architecture.
- **Only ask the user** to confirm business value or trade-offs.
</research-before-asking>

<placeholder-variables>
[PLAN_REQUIRED] — Whether plan approval is needed from `planRequired` field
[USER_REQUESTED_APPROACH] — User explicitly asks to document a specific implementation approach or solution
[HAS_SPECIFIC_SOLUTION] — Issue text or comments include concrete implementation steps or design choices
[HIGH_RISK_CHANGE] — Cross-cutting refactor, migration, or performance-sensitive change described in issue
[MULTIPLE_APPROACHES] — Notes or discussion indicate more than one viable approach
[DEPENDENCY_COORDINATION] — Issue mentions sequencing across components/teams or external dependencies
[NEEDS_ACTIONABLE_NOW] — No plan step expected AND description must be sufficient to implement
[APPROACH_DETAILS_PRESENT] — Sufficient detail exists to describe an approach without guessing
[INCLUDE_IMPLEMENTATION_APPROACH] — True when any of: [USER_REQUESTED_APPROACH], [HAS_SPECIFIC_SOLUTION], [HIGH_RISK_CHANGE], [MULTIPLE_APPROACHES], [DEPENDENCY_COORDINATION], [NEEDS_ACTIONABLE_NOW]
[ASK_FOR_APPROACH_DETAILS] — [INCLUDE_IMPLEMENTATION_APPROACH] is true AND [APPROACH_DETAILS_PRESENT] is false
</placeholder-variables>

<how-to-write-an-enhancement-request>

Enhancement requests bridge understanding between what exists, what should exist, and why the gap matters. They preserve institutional knowledge about how systems evolved while providing clear direction for future work.

The document should enable someone unfamiliar with the system's history to understand the full context: what decisions led to the current state, what the current state actually does, what it should do instead, and how to get there.

## Document Structure

Enhancement requests follow a four-section structure that builds understanding progressively:

| Section | Purpose | Question Answered |
|---------|---------|-------------------|
| Historical Context | Explain how the system reached its current state | "How did we get here?" |
| Current Functionality | Document actual behavior with evidence | "What does it do now?" |
| Desired Functionality | State requirements clearly | "What should it do?" |
| Implementation Approach (Optional) | Describe the path forward | "How could we get there?" |

## Historical Context

**Purpose:**
Establish the narrative of how the system evolved to its current state. This section preserves decision history that would otherwise be lost and helps readers understand why things are the way they are.

**What to include:**
- Key decisions that shaped the current implementation
- Refactoring efforts and their motivations
- Trade-offs that were made and why
- Unintended consequences of past changes
- References to relevant commits, PRs, or discussions

**Structure:**
Organize chronologically or by conceptual phases. Each phase should explain:
1. What changed
2. Why it changed
3. What effect the change had

Use subsections to separate distinct evolutionary phases.

**Guidance:**
Write for the reader who will encounter this system in six months with no prior context. Assume they have access to the code but not to the conversations, decisions, or tribal knowledge that shaped it.

Avoid blame or judgment about past decisions. Decisions made sense in their context; your job is to explain that context, not to evaluate it.

When referencing commits or PRs, explain what they did rather than just citing them. The reference provides verification; the explanation provides understanding.

**Anti-patterns:**
- **The Amnesia Document**: Skipping history and jumping straight to "what we want." This loses the context that explains why change is needed.
- **The Blame Game**: Framing past decisions as mistakes rather than trade-offs made with different information or priorities.
- **The Archaeology Report**: Exhaustive commit-by-commit history without synthesis. Readers need narrative, not a changelog.

## Current Functionality

**Purpose:**
Document what the system actually does today, with sufficient detail that readers can verify claims against the codebase. This section establishes shared understanding of the starting point.

**What to include:**
- How key operations work, step by step
- What data flows through the system and how it transforms
- Which components are involved and how they interact
- Specific file paths and line numbers for critical code
- Edge cases and their current handling

**Structure:**
Organize by functional area or by operation flow. Use subsections for distinct capabilities. Include file references inline with descriptions.

When describing code behavior, explain both what happens and why it matters. A function that "resolves references to commit hashes" is more useful described as "resolves references to commit hashes, which means branch names are converted to static identifiers that won't track future changes."

**Guidance:**
Ground every claim in observable code. When you say the system does something, point to where it does it. File paths and line numbers create verifiable assertions.

Describe behavior, not implementation details. Readers need to understand what the system does, not how every function is structured. Include implementation details only when they explain behavior.

Use present tense for current behavior. This section describes what exists now, not what existed or will exist.

Distinguish between intentional behavior and incidental behavior. Some behavior is by design; some is a side effect of implementation choices. When possible, note which is which.

**Anti-patterns:**
- **The Assumption**: Describing what you think the code does without verifying. Every claim should be traceable to source.
- **The Implementation Dump**: Explaining every function and class without synthesizing into coherent behavior descriptions.
- **The Vague Gesture**: "The system handles this somehow" without specifics. If you don't know, investigate or note the gap.
- **The Stale Reference**: File paths or line numbers that don't match the current codebase. Verify before including.

## Desired Functionality

**Purpose:**
State clearly what the system should do. This section defines the target state against which implementation will be measured.

**What to include:**
- Specific behaviors that should exist
- How the system should respond to various inputs
- What users should experience
- Constraints and boundaries on the desired behavior
- How the desired behavior differs from current behavior

**Structure:**
Organize by capability or user need. Each desired behavior should be:
1. Specific enough to verify
2. Focused on outcomes, not implementation
3. Connected to user value or system need

Use subsections for distinct capabilities. Consider including a comparison table showing current vs desired behavior for complex changes.

**Guidance:**
Write requirements as outcomes, not tasks. "Users see branch names in labels" is a requirement. "Update the label generation function" is a task.

Be specific about boundaries. What is explicitly out of scope? What edge cases should be handled, and which can be deferred? Ambiguity in requirements leads to ambiguity in implementation.

State the "why" alongside the "what" when it's not obvious. If a requirement exists because of a specific user need or system constraint, say so. Requirements without rationale are harder to evaluate and easier to misinterpret.

Distinguish between must-have and nice-to-have. If some requirements are negotiable, say so explicitly. This helps prioritization during implementation.

**Anti-patterns:**
- **The Wishlist**: Listing every possible improvement without prioritization or boundaries. Enhancement requests need scope.
- **The Implementation Prescription**: Stating requirements as specific code changes. Requirements should be implementation-agnostic.
- **The Moving Target**: Requirements so vague they can't be verified. "Better performance" is not a requirement; "Response time under 200ms" is.
- **The Scope Creep Invitation**: Failing to state what's out of scope, inviting unbounded expansion.

## Implementation Approach (Optional)

Determine whether to include this section:
- **[INCLUDE_IMPLEMENTATION_APPROACH]**: Include this section
- **[INCLUDE_IMPLEMENTATION_APPROACH] is false and [PLAN_REQUIRED] is true**: Omit this section and defer approach details to the planning step

If [ASK_FOR_APPROACH_DETAILS] is true, ask targeted questions using `AskUserQuestion` to capture the missing approach details. If the user asks you to proceed with the information available, include a minimal approach based on known constraints and explicitly call out unknowns; do not invent details.

**Purpose:**
Describe how the desired functionality could be achieved. This section provides direction without constraining implementation choices.

**What to include:**
- Key changes needed to reach the desired state
- Which components or systems are affected
- Ordering or dependencies between changes
- Why this approach makes sense given the current architecture
- Trade-offs and alternatives considered

**Structure:**
Organize by logical component or by change phase. Use prose paragraphs, not code. Describe what needs to change and why, not how to change it.

When multiple approaches exist, briefly note alternatives and why the proposed approach is preferred. This demonstrates that options were considered and provides context for future reconsideration.

**Guidance:**
Write in natural language without code examples. The goal is to communicate intent and direction, not to prescribe implementation. Code examples constrain without adding clarity; prose explanations guide without constraining.

Focus on "what" and "why," leaving "how" to implementers. Describe what the system should do differently, not the specific functions or data structures to use.

Explain the reasoning behind the approach. Why does this approach make sense? What properties of the current system does it leverage? What constraints does it respect? An approach without rationale is just an assertion.

Address uncertainty explicitly. If parts of the approach depend on unknowns, say so. If investigation is needed before proceeding, identify what needs to be learned.

Connect changes to requirements. Each significant change should trace back to a desired behavior from the previous section. Changes without clear purpose invite scope creep.

**Anti-patterns:**
- **The Pseudocode Plan**: Writing implementation approach as code or pseudocode. This constrains more than it guides.
- **The Handwave**: "Just update the system to do X" without explaining what that entails. Vague approaches create vague implementations.
- **The Tunnel Vision**: Proposing an approach without considering alternatives or trade-offs. Single-option proposals suggest insufficient analysis.
- **The Disconnected Solution**: An approach that doesn't clearly address the stated requirements. Every significant change should map to a desired behavior.

## Key Principles

### Progressive Understanding

Each section builds on the previous. Historical context explains why current functionality exists. Current functionality establishes the baseline for desired functionality. Desired functionality motivates the implementation approach.

A reader should be able to stop at any section and have coherent, useful understanding. Someone who only reads Historical Context understands the evolution. Someone who reads through Current Functionality understands what exists. And so on.

### Evidence Over Assertion

Claims about the system should be verifiable. When describing current behavior, point to code. When describing history, reference commits or decisions. When describing desired behavior, be specific enough that compliance is testable.

Assertions without evidence require trust. Evidence creates shared understanding.

### Separation of Concerns

Keep description separate from prescription. Current Functionality describes what is; Desired Functionality describes what should be; Implementation Approach (optional) describes how to bridge them. Mixing these creates confusion.

A common failure mode is embedding requirements in the description of current behavior ("The system does X, but it should do Y"). Keep these separate.

### Audience Awareness

Write for the reader who will implement the change, not for yourself. They may not have your context, your assumptions, or your mental model. Make the implicit explicit.

Also write for the future reader who will encounter this document after implementation. They need to understand what was intended, not just what was built.

### Appropriate Abstraction

Match the level of detail to the section's purpose. Historical Context needs narrative, not commit hashes. Current Functionality needs specific file references, not vague descriptions. Desired Functionality needs verifiable requirements, not implementation details. Implementation Approach (optional) needs direction, not code.

Too much detail obscures; too little detail fails to communicate. Find the level that serves understanding.

## Quick Reference

### Section Checklist

**Historical Context**
- [ ] Explains key decisions that shaped current state
- [ ] Describes evolution chronologically or by phase
- [ ] References relevant commits or discussions
- [ ] Explains unintended consequences if applicable

**Current Functionality**
- [ ] Describes actual behavior with specifics
- [ ] Includes file paths and line numbers
- [ ] Explains what happens and why it matters
- [ ] Distinguishes intentional from incidental behavior

**Desired Functionality**
- [ ] States requirements as verifiable outcomes
- [ ] Defines scope boundaries (in and out)
- [ ] Explains rationale for non-obvious requirements
- [ ] Prioritizes must-have vs nice-to-have

**Implementation Approach (Optional)**
- [ ] Describes changes in natural language
- [ ] Explains reasoning behind the approach
- [ ] Addresses trade-offs and alternatives
- [ ] Connects changes to requirements

### Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| Skipping history | Loses context for why change is needed | Explain how the system evolved |
| Vague current behavior | Can't verify claims | Add file paths and specifics |
| Implementation as requirement | Constrains without benefit | State outcomes, not tasks |
| Code in approach | Prescribes rather than guides | Use prose, explain intent |
| Missing scope boundaries | Invites scope creep | Explicitly state what's excluded |
| Disconnected sections | Sections don't build on each other | Ensure logical flow |

### Quality Signals

**Strong enhancement requests:**
- Each section serves its purpose without overlap
- Claims about current behavior can be verified in code
- Requirements are specific enough to test
- Approach explains reasoning, not just changes
- A newcomer could understand and act on it

**Weak enhancement requests:**
- Sections blur together or contradict
- Behavior descriptions are vague or unverifiable
- Requirements are wish lists without boundaries
- Approach is code or pseudocode
- Requires tribal knowledge to interpret
</how-to-write-an-enhancement-request>

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