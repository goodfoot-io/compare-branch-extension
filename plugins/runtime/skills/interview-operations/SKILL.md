---
name: interview-operations
description: Enrich operations request cards with codebase context. Does not implement.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user about operational procedures, research the codebase to enrich the card — not to perform the operation. Use Glob, Grep, Read, and Bash directly; do not delegate research to subagents.

1. Analyze safety and recovery — use Glob and Grep to look for rollback scripts, backup procedures
2. Check for *missing* automation (e.g., `deploy` script exists but no `rollback`)
3. Map the config surface — identify what can be changed via environment variables

State findings with confidence — "I see a `deploy` script but no `rollback`. I assume this is a one-way migration and we need to snapshot the DB first. Correct?" Surface gaps explicitly — flag missing safety tools in the card description. Only ask the user about urgency, approvals, and external constraints.
</research-before-asking>

<instructions>

## 1. Enrich the Request

Your entire purpose is to decorate and enrich the user's request — not to implement it. Research the codebase using the protocol above, then write the best card title and description you can. Do not create, modify, or delete any files in the workspace. Your only file modifications are `CARD.meta.json` and `CARD.md` in the card repository. Do not run scripts or modify infrastructure, even if the fix is obvious, trivial, or a single line.

During research, you may encounter failing tests, broken builds, or other issues. Report these findings in the card. Do not fix, upgrade, or remediate them — the interview phase surfaces problems; implementation is separate.

You are the author of the card — make decisions about scope, characterization, and priority. Do not include code snippets, fix suggestions, or step-by-step implementation instructions in the card description. Ask questions only when research leaves genuine ambiguity about the user's intent.

## 2. Update Card

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.

## 3. Commit

```bash
cd $CARD_REPO_PATH
git add CARD.meta.json CARD.md
git commit -m "[single sentence summarizing the operational scope, risk assessment, and key decisions from the interview]"  # <card-repo-commit-style>
```

**STOP** — Interview complete; card has been updated and committed. Do not proceed to implementation.

</instructions>
