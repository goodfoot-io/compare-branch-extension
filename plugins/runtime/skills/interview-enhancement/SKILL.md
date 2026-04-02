---
name: interview-enhancement
description: Enrich enhancement request cards with codebase context. Does not implement.
---

Review ./enhancement.md

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user how the system works now or how it *should* work, research the codebase to enrich the card — not to build the feature. Use Glob, Grep, Read, and Bash directly; do not delegate research to subagents.

1. Map data flow, schemas, and API contracts using Glob, Grep, and Read
2. Investigate *why* code is written this way (Chesterton's Fence) via git log and git blame
3. Identify what is *missing* that might block the enhancement (tests, API endpoints, etc.)

Assume established patterns — "I assume we should use gRPC for this new endpoint to match the others. Correct?"
- Surface gaps explicitly — "This feature is currently untested. Should I include writing a baseline test in the scope?"
- Only ask the user to confirm business value or trade-offs.
</research-before-asking>


<instructions>

## 1. Enrich the Request

Decorate and enrich the user's request — do not implement it. Research the codebase, then write the best card title and description you can.
- Modify only `CARD.meta.json` and `CARD.md` in the card repository.
- Do not write features or scaffold code, even if the solution is obvious, trivial, or follows an existing pattern.
- Report failing tests, broken builds, or other issues in the card. Do not fix or remediate them — the interview phase surfaces problems; implementation is separate.
- Make decisions about scope, characterization, and priority as the card author.
- Do not include code snippets, fix suggestions, or step-by-step implementation instructions.
- Ask questions only when research leaves genuine ambiguity about the user's intent.

## 2. Update Card

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.

Write `CARD.md.meta.json` with `title` set to `"Description"` and `summary` (100–300 words: the gap between current and desired state that motivates this work). Follow the `<markdown-guidelines>` for both `CARD.md` and the `summary` field.

## 3. Commit

```bash
cd $CARD_REPO_PATH
git add CARD.meta.json CARD.md CARD.md.meta.json
git commit -m "[single sentence summarizing how the enhancement was scoped and key decisions from the interview]"  # <card-repo-commit-style>
```

**STOP** — Interview complete; card has been updated and committed. Do not proceed to implementation.

</instructions>
