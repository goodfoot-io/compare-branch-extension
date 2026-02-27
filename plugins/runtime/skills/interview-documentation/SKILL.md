---
name: interview-documentation
description: Scope documentation requests through codebase research.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user about audience, location, or content, research the codebase:

1. Analyze the project's documentation culture using Glob to survey structure (`docs/` folder vs. co-located `README.md`)
2. Identify what is *missing* or outdated (check git timestamps)
3. Understand the *actual* functionality using Grep and Read — documentation should match the code
4. Identify consumers using Grep for import patterns to determine if the audience is internal or external

Propose based on findings — "This project uses `README.md` files next to code. Should I create `src/feature/README.md`?" Surface gaps explicitly — "I noticed `deploy` is documented but `rollback` is not. Should we cover both?" Only ask the user about specific intent or subjective constraints.
</research-before-asking>

<instructions>

## 1. Research and Write

Research the codebase using the protocol above. From your findings and the existing card content, write the best title and description you can. You are the author — make decisions, don't ask for confirmation. Ask questions only when research leaves genuine ambiguity about the user's intent.

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
