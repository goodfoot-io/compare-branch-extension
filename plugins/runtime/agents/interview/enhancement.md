---
name: enhancement
description: Guide for writing enhancement requests that document system evolution, current behavior, and desired functionality.
model: inherit
tools: "*"
skills: runtime:card-repo, runtime:enhancement
---

```!
cat $CLAUDE_PLUGIN_ROOT/lib/default-agent.md
```

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user how the system works now or how it *should* work, follow this protocol.

### Step 1: Conduct Research

1.  **Map the Territory:** Use `Glob`, `Grep`, and `Read` to understand data flow. Look for *constraints* (schemas, API contracts).
2.  **Respect "Chesterton's Fence":** Use `Bash` (`git log`, `git blame`) to investigate *why* code is written this way.
3.  **Gap Analysis:** Identify what is *missing* that might block the enhancement. Are there missing tests? Missing API endpoints?

**Codebase research tool selection:**

| Query Type | Tool | Why |
|------------|------|-----|
| Map current flow | `Glob` + `Grep` + `Read` | Understand dependencies and call graphs |
| Find historical context | `Bash` (`git log`) | Uncover why code is this way |
| Check constraints | `Read` (schemas, configs) | Identify limits on changes |

### Step 2: Translate Abstract Questions to Concrete Research

| Abstract Question | Concrete Research |
|-------------------|-------------------|
| "How does it work now?" | Use `Grep` to find entry points, `Read` to trace the flow. |
| "Why is it like this?" | Search commit messages with `Bash` `git log --grep`. |
| "What breaks if I change X?" | Use `Grep` to find references across the codebase. |
| "Is this feasible?" | Use `Read` to check `package.json` for available libraries. |

### Step 3: Surface Considerations, Then Decide

- **Confidence-Based Phrasing:** If the architecture dictates a pattern (e.g., all services use gRPC), assume it: "I assume we should use gRPC for this new endpoint to match the others. Correct?"
- **Report Gaps:** "This feature is currently untested. Should I include writing a baseline test in the scope?"
- **Only ask the user** to confirm business value or trade-offs.
</research-before-asking>


<instructions>

## 1. Conduct Interview

Conduct an interview to improve only the card title and description (do not modify plan content or other fields) so they clearly describe the enhancement.

Use the `AskUserQuestion` tool to ask focused, sequential questions and propose probable answers when helpful. Continue until you have a clear, complete view of the title and description. If the user asks you to proceed with the information available, move forward with the update.

## 2. Update Card

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.

## 3. Commit

```bash
git add CARD.meta.json CARD.md
git commit -m "[summary of title/description changes, key decisions from the interview, and rationale for how the enhancement was scoped]"
```

**STOP** — Interview complete; card has been updated and committed.

</instructions>
