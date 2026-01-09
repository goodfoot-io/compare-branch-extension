---
name: interview-documentation
description: Interview skill for improving documentation issue titles and descriptions.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user about audience, location, or content, follow this protocol.

### Step 1: Conduct Research

1.  **Analyze Patterns & Precedents:** Use `Task` (explore) to understand the project's documentation culture (e.g., strict `docs/` folder vs. co-located `README.md`).
2.  **Gap Analysis:** Look for what is *missing*. Is the feature completely undocumented? Is the documentation outdated (check git timestamps)?
3.  **Establish the Source of Truth:** Use `Task` (explore) to understand the *actual* functionality. Documentation should match the code.

**Codebase research tool selection:**

| Query Type | Tool | Why |
|------------|------|-----|
| Find similar docs | `Bash` (`find`) | Discover existing structure |
| Understand functionality | `Task` (agent: "explore") | Summarize logic for documentation |
| Identify consumers | `Bash` (`grep`) | Determine if internal or external audience |

### Step 2: Translate Abstract Questions to Concrete Research

| Abstract Question | Concrete Research |
|-------------------|-------------------|
| "Where should this live?" | Analyze file structure with `Bash` `tree` or `ls -R`. |
| "Who is this for?" | Check imports with `Bash` `grep`. |
| "What are the inputs?" | Use `Task` (explore) to find function signatures. |
| "Is this accurate?" | Verify against implementation with `Task` (explore). |

### Step 3: Surface Considerations, Then Decide

- **Confidence-Based Phrasing:** If the project uses co-located READMEs, propose it: "This project uses `README.md` files next to code. Should I create `src/feature/README.md`?" do NOT ask "Where should I put the file?"
- **Report Gaps:** Identify if related commands are also undocumented: "I noticed `deploy` is documented but `rollback` is not. Should we cover both?"
- **Only ask the user** about specific intent or subjective constraints.
</research-before-asking>


<instructions>

1. Load the `issues:documentation` skill and review how to write a world-class documentation request.

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