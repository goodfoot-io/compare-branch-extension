---
name: interview-enhancement
description: Guide for writing enhancement requests that document system evolution, current behavior, and desired functionality.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user how the system works now or how it *should* work, follow this protocol.

### Step 1: Conduct Research

1.  **Map the Territory:** Use `Task` (explore) to understand data flow. Look for *constraints* (schemas, API contracts).
2.  **Respect "Chesterton's Fence":** Use `Bash` (`git log`, `git blame`) to investigate *why* code is written this way.
3.  **Gap Analysis:** Identify what is *missing* that might block the enhancement. Are there missing tests? Missing API endpoints?

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

- **Confidence-Based Phrasing:** If the architecture dictates a pattern (e.g., all services use gRPC), assume it: "I assume we should use gRPC for this new endpoint to match the others. Correct?"
- **Report Gaps:** "This feature is currently untested. Should I include writing a baseline test in the scope?"
- **Only ask the user** to confirm business value or trade-offs.
</research-before-asking>


<instructions>

1. Load the `cards:enhancement` skill and review how to write a world-class enhancement request.

2. Conduct an interview to improve only the issue title and description (do not modify plan content or other fields) so they align with this guidance.

3. Use the `AskUserQuestion` tool to ask focused, sequential questions and propose probable answers when helpful. Continue until you have a clear, complete view of the title and description. If the user asks you to proceed with the information available, move forward with the update.

43. Then patch the issue with the revised title and description:

```
PATCH /cards/[CARD_ID]
{
  "title": "[updated title]",
  "description": "[updated description]"
}
```

</instructions>