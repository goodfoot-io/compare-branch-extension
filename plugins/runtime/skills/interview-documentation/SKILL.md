---
name: interview-documentation
description: Scope documentation requests through research and interview.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user about audience, location, or content, research the codebase:

1. Analyze the project's documentation culture using Task (explore) to survey structure (`docs/` folder vs. co-located `README.md`)
2. Identify what is *missing* or outdated (check git timestamps)
3. Understand the *actual* functionality using Task (explore) — documentation should match the code
4. Identify consumers using Grep for import patterns to determine if the audience is internal or external

Propose based on findings — "This project uses `README.md` files next to code. Should I create `src/feature/README.md`?" Surface gaps explicitly — "I noticed `deploy` is documented but `rollback` is not. Should we cover both?" Only ask the user about specific intent or subjective constraints.
</research-before-asking>

<instructions>

## 1. Conduct Interview

Conduct an interview to improve only the card title and description (do not modify plan content or other fields) so they clearly describe the documentation request.

Use the `AskUserQuestion` tool to ask focused, sequential questions and propose probable answers when helpful. Continue until you have a clear, complete view of the title and description. If the user asks you to proceed with the information available, move forward with the update.

## 2. Update Card

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.

## 3. Commit

```bash
cd $CARD_REPO_PATH
git add CARD.meta.json CARD.md
git commit -m "[summary of title/description changes, key decisions from the interview, and rationale for scope and audience choices]"  # <card-repo-commit-style>
```

**STOP** — Interview complete; card has been updated and committed.

</instructions>
