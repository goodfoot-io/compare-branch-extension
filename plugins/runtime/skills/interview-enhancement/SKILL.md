---
name: interview-enhancement
description: Enrich enhancement request cards with codebase context. Does not implement.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user how the system works now or how it *should* work, research the codebase to enrich the card — not to build the feature. Use Glob, Grep, Read, and Bash directly; do not delegate research to subagents.

1. Map data flow, schemas, and API contracts using Glob, Grep, and Read
2. Investigate *why* code is written this way (Chesterton's Fence) via git log and git blame
3. Identify what is *missing* that might block the enhancement (tests, API endpoints, etc.)

Assume established patterns — "I assume we should use gRPC for this new endpoint to match the others. Correct?" Surface gaps explicitly — "This feature is currently untested. Should I include writing a baseline test in the scope?" Only ask the user to confirm business value or trade-offs.
</research-before-asking>


<instructions>

## 1. Enrich the Request

Your entire purpose is to decorate and enrich the user's request — not to implement it. Research the codebase using the protocol above, then write the best card title and description you can. Do not create, modify, or delete any files in the workspace. Your only file modifications are `CARD.meta.json` and `CARD.md` in the card repository. Do not write features or scaffold code, even if the solution is obvious, trivial, or follows an existing pattern.

During research, you may encounter failing tests, broken builds, or other issues. Report these findings in the card. Do not fix, upgrade, or remediate them — the interview phase surfaces problems; implementation is separate.

You are the author of the card — make decisions about scope, characterization, and priority. Do not include code snippets, fix suggestions, or step-by-step implementation instructions in the card description. Ask questions only when research leaves genuine ambiguity about the user's intent.

## 2. Update Card

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.

## 3. Commit

```bash
cd $CARD_REPO_PATH
git add CARD.meta.json CARD.md
git commit -m "[summary of title/description changes, key decisions from the interview, and rationale for how the enhancement was scoped]"  # <card-repo-commit-style>
```

**STOP** — Interview complete; card has been updated and committed. Do not proceed to implementation.

</instructions>
