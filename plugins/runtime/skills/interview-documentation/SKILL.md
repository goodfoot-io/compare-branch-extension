---
name: interview-documentation
description: Enrich documentation request cards with codebase context. Does not implement.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user about audience, location, or content, research the codebase to enrich the card — not to write the documentation. Use Glob, Grep, Read, and Bash directly; do not delegate research to subagents.

1. Analyze the project's documentation culture using Glob to survey structure (`docs/` folder vs. co-located `README.md`)
2. Identify what is *missing* or outdated (check git timestamps)
3. Understand the *actual* functionality using Grep and Read — documentation should match the code
4. Identify consumers using Grep for import patterns to determine if the audience is internal or external

Propose based on findings — "This project uses `README.md` files next to code. Should I create `src/feature/README.md`?" Surface gaps explicitly — "I noticed `deploy` is documented but `rollback` is not. Should we cover both?" Only ask the user about specific intent or subjective constraints.
</research-before-asking>

<instructions>

## 1. Enrich the Request

Your entire purpose is to decorate and enrich the user's request — not to implement it. Research the codebase using the protocol above, then write the best card title and description you can. Do not create, modify, or delete any files in the workspace. Your only file modifications are `CARD.meta.json` and `CARD.md` in the card repository. Do not create documentation files, even if the solution is obvious, trivial, or a single line.

During research, you may encounter failing tests, broken builds, or other issues. Report these findings in the card. Do not fix, upgrade, or remediate them — the interview phase surfaces problems; implementation is separate.

You are the author of the card — make decisions about scope, characterization, and priority. Do not include code snippets, fix suggestions, or step-by-step implementation instructions in the card description. Ask questions only when research leaves genuine ambiguity about the user's intent.

## 2. Update Card

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.

## 3. Commit

```bash
cd !` echo $CARD_REPO_PATH`
git add CARD.meta.json CARD.md
git commit -m "[single sentence summarizing the documentation scope, audience, and key decisions from the interview]"  # <card-repo-commit-style>
```

**STOP** — Interview complete; card has been updated and committed. Do not proceed to implementation.

</instructions>
