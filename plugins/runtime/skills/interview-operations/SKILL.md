---
name: interview-operations
description: Enrich operations request cards with codebase context. Does not implement.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user about operational procedures, research the codebase to enrich the card — not to perform the operation:

1. Analyze safety and recovery — use Glob and Grep to look for rollback scripts, backup procedures
2. Check for *missing* automation (e.g., `deploy` script exists but no `rollback`)
3. Map the config surface — identify what can be changed via environment variables

State findings with confidence — "I see a `deploy` script but no `rollback`. I assume this is a one-way migration and we need to snapshot the DB first. Correct?" Surface gaps explicitly — flag missing safety tools in the card description. Only ask the user about urgency, approvals, and external constraints.
</research-before-asking>

<instructions>

## 1. Enrich the Request

Your entire purpose is to decorate and enrich the user's request — not to implement it. Research the codebase using the protocol above, then write the best card title and description you can. Do not run scripts, modify infrastructure, or take any action beyond updating the card. You are the author of the card — make decisions about how to describe the work. Ask questions only when research leaves genuine ambiguity about the user's intent.

## 2. Update Card

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.

## 3. Commit

```bash
cd $CARD_REPO_PATH
git add CARD.meta.json CARD.md
git commit -m "[summary of title/description changes, key decisions from the interview, and rationale for the operational scope and risk assessment]"  # <card-repo-commit-style>
```

**STOP** — Interview complete; card has been updated and committed. Do not proceed to implementation.

</instructions>
