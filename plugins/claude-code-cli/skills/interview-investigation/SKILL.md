---
name: interview-investigation
description: Interview skill for improving investigation issue titles and descriptions.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user what to investigate, follow this protocol.

### Step 1: Conduct Research

1.  **Assess Observability:** Use `Bash` (`grep`) to see what is currently logged.
2.  **Gap Analysis:** Explicitly identify *missing* observability. Is there a metric that *should* be there to answer the question but isn't?
3.  **Define Boundaries:** Use `Task` (explore) to determine system boundaries (black boxes vs white boxes).

**Codebase research tool selection:**

| Query Type | Tool | Why |
|------------|------|-----|
| Check observability | `Bash` (`grep`) | See available data |
| Find prior investigations | `Task` (agent: "explore") | Avoid repeating work |
| Map system boundaries | `Task` (agent: "explore") | Define scope |

### Step 2: Translate Abstract Questions to Concrete Research

| Abstract Question | Concrete Research |
|-------------------|-------------------|
| "Can we measure X?" | Search code for instrumentation with `Bash` `grep`. |
| "Is this a known issue?" | Use `Task` (explore) to search text files. |
| "How complex is the system?" | Use `Bash` `find . -name "*.ts" | xargs wc -l`. |
| "What tools do we have?" | Check dev dependencies with `Bash` `cat package.json`. |

### Step 3: Surface Considerations, Then Decide

- **Confidence-Based Phrasing:** "I see we don't have statsD metrics configured. I assume we need to rely on logs for this investigation, correct?"
- **Report Gaps:** "We are missing visibility into the database connection pool. Should adding those metrics be the first step?"
- **Only ask the user** for strategic impact or decision criteria.
</research-before-asking>

<instructions>

1. Load the `issues:investigation` skill and review how to write a world-class investigation request.

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