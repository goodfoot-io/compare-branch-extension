---
name: interview-bug-report
description: Enrich bug report cards with codebase context. Does not implement fixes.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user to clarify bug details, research the codebase to enrich the card — not to fix the bug:

1. Locate the error source
2. Check recent changes for context (Chesterton's Fence)
3. Look for missing test coverage or error handling
4. Verify environment from config files

State findings with confidence — "I see commit X changed this logic; did the issue start then?" — rather than asking what you can infer. Surface gaps explicitly — "No tests exist for this feature. Should a reproduction test be part of this card?" Only ask the user for information that cannot be inferred from the codebase.
</research-before-asking>

<instructions>

## 1. Enrich the Request

Your entire purpose is to decorate and enrich the user's request — not to implement it. Research the codebase using the protocol above, then write the best card title and description you can. Do not modify source code, write fixes, or take any action beyond updating the card. You are the author of the card — make decisions about how to describe the work. Ask questions only when research leaves genuine ambiguity about the user's intent.

## 2. Update Card

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.

## 3. Commit

```bash
cd $CARD_REPO_PATH
git add CARD.meta.json CARD.md
git commit -m "[summary of title/description changes, key decisions from the interview, and rationale for how the bug was characterized]"  # <card-repo-commit-style>
```

**STOP** — Interview complete; card has been updated and committed. Do not proceed to implementation.

</instructions>
