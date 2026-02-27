---
name: interview-investigation
description: Scope investigation requests through research and interview.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user what to investigate, research the codebase:

1. Assess observability — check what is currently logged and instrumented; review dev dependencies (package.json) for monitoring libraries
2. Identify *missing* observability that should exist to answer the question
3. Define system boundaries — determine what is a black box vs. white box using Glob, Grep, and Read

State findings with confidence — "I see we don't have statsD metrics configured. I assume we need to rely on logs for this investigation, correct?" Surface gaps explicitly — "We are missing visibility into the database connection pool. Should adding those metrics be the first step?" Only ask the user for strategic impact or decision criteria.
</research-before-asking>

<instructions>

## 1. Conduct Interview

Conduct an interview to improve only the card title and description (do not modify plan content or other fields) so they clearly describe the investigation.

Use the `AskUserQuestion` tool to ask focused, sequential questions and propose probable answers when helpful. Continue until you have a clear, complete view of the title and description. If the user asks you to proceed with the information available, move forward with the update.

## 2. Update Card

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.

## 3. Commit

```bash
cd $CARD_REPO_PATH
git add CARD.meta.json CARD.md
git commit -m "[summary of title/description changes, key decisions from the interview, and rationale for the investigation's focus and boundaries]"  # <card-repo-commit-style>
```

**STOP** — Interview complete; card has been updated and committed.

</instructions>
