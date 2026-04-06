---
name: interview-operations
description: Enrich operations request cards with codebase context. Does not implement.
---

Review ./operations.md

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user about operational procedures, research the codebase to enrich the card — not to perform the operation. Use Glob, Grep, Read, and Bash directly; do not delegate research to subagents.

1. Analyze safety and recovery — use Glob and Grep to look for rollback scripts, backup procedures
2. Check for *missing* automation (e.g., `deploy` script exists but no `rollback`)
3. Map the config surface — identify what can be changed via environment variables

State findings with confidence — "I see a `deploy` script but no `rollback`. I assume this is a one-way migration and we need to snapshot the DB first. Correct?"
- Surface gaps explicitly — flag missing safety tools in the card description.
- Only ask the user about urgency, approvals, and external constraints.
</research-before-asking>

<instructions>

## 1. Enrich the Request

### 1.1 Load Notes Skill

Load the `cards:notes` skill before beginning research.

### 1.2 Research and Enrich

Decorate and enrich the user's request — do not implement it. Research the codebase, then write the best card title and description you can.
- Modify only `CARD.meta.json` and `CARD.md` in the card repository.
- Do not run scripts or modify infrastructure, even if the fix is obvious, trivial, or a single line.
- Report failing tests, broken builds, or other issues in the card. Do not fix or remediate them — the interview phase surfaces problems; implementation is separate.
- Make decisions about scope, characterization, and priority as the card author.
- Do not include code snippets, fix suggestions, or step-by-step implementation instructions.
- Ask questions only when research leaves genuine ambiguity about the user's intent.

## 2. Update Card

### 2.1 Load Markdown Guidelines

Load the `cards:markdown` skill before writing CARD.md.

### 2.2 Write Card Content

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.


## 3. Commit

```bash
cd $CARD_REPO_PATH
git add CARD.meta.json CARD.md
git commit -m "[single sentence summarizing the operational scope, risk assessment, and key decisions from the interview]"  # <card-repo-commit-style>
```

**STOP** — Interview complete; card has been updated and committed. Do not proceed to implementation.

</instructions>
