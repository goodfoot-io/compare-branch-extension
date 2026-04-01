---
name: interview-documentation
description: Enrich documentation request cards with codebase context. Does not implement.
---

@${CLAUDE_SKILL_DIR}/documentation.md

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user about audience, location, or content, research the codebase to enrich the card — not to write the documentation. Use Glob, Grep, Read, and Bash directly; do not delegate research to subagents.

1. Analyze the project's documentation culture using Glob to survey structure (`docs/` folder vs. co-located `README.md`)
2. Identify what is *missing* or outdated (check git timestamps)
3. Understand the *actual* functionality using Grep and Read — documentation should match the code
4. Identify consumers using Grep for import patterns to determine if the audience is internal or external

Propose based on findings — "This project uses `README.md` files next to code. Should I create `src/feature/README.md`?"
- Surface gaps explicitly — "I noticed `deploy` is documented but `rollback` is not. Should we cover both?"
- Only ask the user about specific intent or subjective constraints.
</research-before-asking>

<instructions>

## 1. Enrich the Request

Decorate and enrich the user's request — do not implement it. Research the codebase, then write the best card title and description you can.
- Modify only `CARD.meta.json` and `CARD.md` in the card repository.
- Do not create documentation files, even if the solution is obvious, trivial, or a single line.
- Report failing tests, broken builds, or other issues in the card. Do not fix or remediate them — the interview phase surfaces problems; implementation is separate.
- Make decisions about scope, characterization, and priority as the card author.
- Do not include code snippets, fix suggestions, or step-by-step implementation instructions.
- Ask questions only when research leaves genuine ambiguity about the user's intent.

## 2. Update Card

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.

Write `CARD.md.meta.json` with `title` set to `"Description"` and `summary` (100–300 words: what is missing or outdated and who is affected by the gap).

## 3. Commit

```bash
cd !` echo $CARD_REPO_PATH`
git add CARD.meta.json CARD.md CARD.md.meta.json
git commit -m "[single sentence summarizing the documentation scope, audience, and key decisions from the interview]"  # <card-repo-commit-style>
```

**STOP** — Interview complete; card has been updated and committed. Do not proceed to implementation.

</instructions>
