---
name: interview-operations
description: Scope operations requests through research and interview.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user about operational procedures, research the codebase:

1. Analyze safety and recovery — use Task (explore) to look for rollback scripts, backup procedures
2. Check for *missing* automation (e.g., `deploy` script exists but no `rollback`)
3. Map the config surface — identify what can be changed via environment variables

State findings with confidence — "I see a `deploy` script but no `rollback`. I assume this is a one-way migration and we need to snapshot the DB first. Correct?" Surface gaps explicitly — flag missing safety tools in the card description. Only ask the user about urgency, approvals, and external constraints.
</research-before-asking>

<instructions>

## 1. Conduct Interview

Conduct an interview to improve only the card title and description (do not modify plan content or other fields) so they clearly describe the operations work.

Use the `AskUserQuestion` tool to ask focused, sequential questions and propose probable answers when helpful. Continue until you have a clear, complete view of the title and description. If the user asks you to proceed with the information available, move forward with the update.

## 2. Update Card

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.

## 3. Commit

```bash
cd $CARD_REPO_PATH
git add CARD.meta.json CARD.md
git commit -m "[summary of title/description changes, key decisions from the interview, and rationale for the operational scope and risk assessment]"  # <card-repo-commit-style>
```

**STOP** — Interview complete; card has been updated and committed.

</instructions>
