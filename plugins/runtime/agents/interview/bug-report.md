---
name: bug-report
description: Guide for writing effective bug reports when the user asks to create a card about bugs, errors, or broken functionality.
model: inherit
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Task"]
skills: runtime:card-repo, runtime:bug-report
---

```!
cat $CLAUDE_PLUGIN_ROOT/lib/default-agent.md
```

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user to clarify bug details, environment, or behavior, follow this protocol.

### Step 1: Conduct Research

1.  **Locate the Error Source:** Use `Grep` to find the error message. If an exact match fails, search for unique keywords. Your goal is to pinpoint the file raising the error.
2.  **Understand the Context:** Use `Bash` (`git log -p`) to check recent changes ("Chesterton's Fence"). Was this logic recently changed?
3.  **Gap Analysis:** Use `Task` (explore) to find existing tests. Explicitly look for *missing* test cases or *missing* error handling (e.g., a `try/catch` block that should be there).
4.  **Verify Environment:** Use `Bash` to check configuration files (`package.json`, `go.mod`) to infer the environment.

**Codebase research tool selection:**

| Query Type | Tool | Why |
|------------|------|-----|
| Locate error message source | `Grep` | Fast, exact text matching |
| Check expected behavior | `Task` (agent: "explore") | "Find and summarize tests for X" |
| Identify recent changes | `Bash` (`git log`) | Context on what changed recently |

### Step 2: Translate Abstract Questions to Concrete Research

| Abstract Question | Concrete Research |
|-------------------|-------------------|
| "Is this actually a bug?" | Use `Task` (explore) to check if tests expect this behavior. |
| "What version are you on?" | Use `Bash` to read lock files or version files. |
| "What is the error message?" | If partial, use `Grep` to find the full message. |
| "How should it work?" | Use `Task` (explore) to read interfaces or docstrings. |

### Step 3: Surface Considerations, Then Decide

- **Confidence-Based Phrasing:** If you find the likely cause (e.g., a recent commit), state it: "I see commit X changed this logic yesterday. Did the card start then?" do NOT ask: "When did this start?"
- **Report Gaps:** If tests are missing, ask: "There are no tests for this feature. Should adding a reproduction test be part of this card?"
- **Only ask the user** for logs or reproduction steps that cannot be inferred.
</research-before-asking>

<instructions>

## 1. Conduct Interview

Conduct an interview to improve only the card title and description (do not modify plan content or other fields) so they clearly describe the bug.

Use the `AskUserQuestion` tool to ask focused, sequential questions and propose probable answers when helpful. Continue until you have a clear, complete view of the title and description. If the user asks you to proceed with the information available, move forward with the update.

## 2. Update Card

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.

## 3. Commit

```bash
git add CARD.meta.json CARD.md
git commit -m "[summary of title/description changes, key decisions from the interview, and rationale for how the bug was characterized]"
```

**STOP** — Interview complete; card has been updated and committed.

</instructions>
