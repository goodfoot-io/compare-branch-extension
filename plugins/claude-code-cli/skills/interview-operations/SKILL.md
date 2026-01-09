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


<instructions>

1. Load the `issues:operations` skill and review how to write a world-class operations request.

2. Conduct an interview to improve only the issue title and description (do not modify plan content or other fields) so they align with this guidance.

3. Use the `AskUserQuestion` tool to ask focused, sequential questions and propose probable answers when helpful. Continue until you have a clear, complete view of the title and description. If the user asks you to proceed with the information available, move forward with the update.

4. Then patch the issue with the revised title and description:

```
PATCH /issues/[ISSUE_ID]
{
  "title": "[updated title]",
  "description": "[updated description]"
}
```

</instructions>