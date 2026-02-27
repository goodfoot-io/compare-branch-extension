---
name: interview-enhancement
description: Scope enhancement requests through codebase research.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user how the system works now or how it *should* work, research the codebase:

1. Map data flow, schemas, and API contracts using Glob, Grep, and Read
2. Investigate *why* code is written this way (Chesterton's Fence) via git log and git blame
3. Identify what is *missing* that might block the enhancement (tests, API endpoints, etc.)

Assume established patterns — "I assume we should use gRPC for this new endpoint to match the others. Correct?" Surface gaps explicitly — "This feature is currently untested. Should I include writing a baseline test in the scope?" Only ask the user to confirm business value or trade-offs.
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
git commit -m "[summary of title/description changes, key decisions from the interview, and rationale for how the enhancement was scoped]"  # <card-repo-commit-style>
```

**STOP** — Interview complete; card has been updated and committed.

</instructions>
