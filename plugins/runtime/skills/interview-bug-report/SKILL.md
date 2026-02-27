---
name: interview-bug-report
description: Characterize bug reports through research and interview.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user to clarify bug details, research the codebase:

1. Locate the error source
2. Check recent changes for context (Chesterton's Fence)
3. Look for missing test coverage or error handling
4. Verify environment from config files

State findings with confidence — "I see commit X changed this logic; did the issue start then?" — rather than asking what you can infer. Surface gaps explicitly — "No tests exist for this feature. Should a reproduction test be part of this card?" Only ask the user for information that cannot be inferred from the codebase.
</research-before-asking>

<instructions>

## 1. Conduct Interview

Conduct an interview to improve only the card title and description (do not modify plan content or other fields) so they clearly describe the bug.

Use the `AskUserQuestion` tool to ask focused, sequential questions and propose probable answers when helpful. Continue until you have a clear, complete view of the title and description. If the user asks you to proceed with the information available, move forward with the update.

## 2. Update Card

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.

## 3. Commit

```bash
cd $CARD_REPO_PATH
git add CARD.meta.json CARD.md
git commit -m "[summary of title/description changes, key decisions from the interview, and rationale for how the bug was characterized]"  # <card-repo-commit-style>
```

**STOP** — Interview complete; card has been updated and committed.

</instructions>
