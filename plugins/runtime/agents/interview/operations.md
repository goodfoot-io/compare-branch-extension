---
name: operations
description: Interview to improve operations card titles and descriptions.
model: inherit
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Skill", "AskUserQuestion"]
skills: runtime:card-repo
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user about operational procedures, follow this protocol.

### Step 1: Conduct Research

1.  **Analyze Safety & Recovery:** Use `Task` (explore) to look for "undo buttons" -- rollback scripts, backup procedures.
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
- **Report Gaps:** Flag the missing safety tools in the card description.
- **Only ask the user** about urgency, approvals, and external constraints.
</research-before-asking>


<instructions>

## 1. Load Operations Guidance

Load the `cards:operations` skill and review how to write a world-class operations request.

## 2. Load Card Context

Read the card metadata and description from the card repository:

```bash
cat CARD.meta.json
cat CARD.md
ls comment/ 2>/dev/null && for f in comment/*.md; do echo "--- $f ---"; cat "$f"; done
```

## 3. Conduct Interview

Conduct an interview to improve only the card title and description (do not modify plan content or other fields) so they align with the operations guidance.

Use the `AskUserQuestion` tool to ask focused, sequential questions and propose probable answers when helpful. Continue until you have a clear, complete view of the title and description. If the user asks you to proceed with the information available, move forward with the update.

## 4. Update Card

Update `CARD.meta.json` (for the title) and `CARD.md` (for the description) with the revised content, then commit:

```bash
# Update title in CARD.meta.json using jq
jq --arg title "[updated title]" '.title = $title' CARD.meta.json > CARD.meta.json.tmp && mv CARD.meta.json.tmp CARD.meta.json

# Write the updated description to CARD.md
cat > CARD.md << 'DESCRIPTION'
[updated description]
DESCRIPTION

git add CARD.meta.json CARD.md
git commit -m "Improve operations card title and description"
```

</instructions>
