---
name: interview-maintenance
description: Interview skill for improving maintenance issue titles and descriptions.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user about debt or refactoring, follow this protocol.

### Step 1: Conduct Research

1.  **Correlate Complexity with Churn:** Use `Bash` (`git log` + file size) to find high-value targets.
2.  **Gap Analysis (Stability):** Use `Task` (explore) to check for *missing* tests. A refactor without tests is dangerous.
3.  **Verify Dependency Status:** Use `Bash` to check lockfiles for deprecated versions.

**Codebase research tool selection:**

| Query Type | Tool | Why |
|------------|------|-----|
| Find explicit debt | `Bash` (`grep`) | Locate self-admitted debt |
| Check deprecations | `Bash` (`grep`) | Scope migration effort |
| Dependency check | `Bash` (`cat` lockfiles) | Identify stale dependencies |

### Step 2: Translate Abstract Questions to Concrete Research

| Abstract Question | Concrete Research |
|-------------------|-------------------|
| "Is this code messy?" | Check file size with `Bash` `ls -lh`. |
| "Is this library old?" | Check version in `package.json`. |
| "Is it safe to change?" | Use `Task` (explore) to find tests. |
| "Who owns this?" | Check `CODEOWNERS` with `Bash` `cat`. |

### Step 3: Surface Considerations, Then Decide

- **Confidence-Based Phrasing:** "I see this module has 0 tests and high churn. I assume adding tests is the first requirement before any refactoring. Correct?"
- **Report Gaps:** Identify specifically *what* is untestable or brittle.
- **Only ask the user** for business motivation and risk profile.
</research-before-asking>


<instructions>

1. Load the `cards:maintenance` skill and review how to write a world-class maintenance request.

2. Conduct an interview to improve only the issue title and description (do not modify plan content or other fields) so they align with this guidance.

3. Use the `AskUserQuestion` tool to ask focused, sequential questions and propose probable answers when helpful. Continue until you have a clear, complete view of the title and description. If the user asks you to proceed with the information available, move forward with the update.

4. Then patch the issue with the revised title and description:

```
PATCH /cards/[CARD_ID]
{
  "title": "[updated title]",
  "description": "[updated description]"
}
```

</instructions>