---
name: interview-maintenance
description: Enrich maintenance request cards with codebase context. Does not implement.
---

Review ./maintenance.md

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user about debt or refactoring, research the codebase to enrich the card — not to perform the maintenance. Use Glob, Grep, Read, and Bash directly; do not delegate research to subagents.

1. Correlate complexity with churn — use git log and file size to find high-value targets
2. Check for *missing* tests using Glob and Grep — a refactor without tests is dangerous
3. Verify dependency status from lockfiles for deprecated versions

State findings with confidence — "I see this module has 0 tests and high churn. I assume adding tests is the first requirement before any refactoring. Correct?"
- Surface gaps explicitly — identify specifically *what* is untestable or brittle.
- Only ask the user for business motivation and risk profile.
</research-before-asking>

<instructions>

## 1. Enrich the Request

Decorate and enrich the user's request — do not implement it. Research the codebase, then write the best card title and description you can.
- Modify only `CARD.meta.json` and `CARD.md` in the card repository.
- Do not refactor modules or install dependencies, even if the solution is obvious, trivial, or a single line.
- Report failing tests, broken builds, or other issues in the card. Do not fix or remediate them — the interview phase surfaces problems; implementation is separate.
- Make decisions about scope, characterization, and priority as the card author.
- Do not include code snippets, fix suggestions, or step-by-step implementation instructions.
- Ask questions only when research leaves genuine ambiguity about the user's intent.

## 2. Update Card

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.

Write `CARD.md.meta.json` with `title` set to `"Description"`.

## 3. Commit

```bash
cd $CARD_REPO_PATH
git add CARD.meta.json CARD.md CARD.md.meta.json
git commit -m "[single sentence summarizing the maintenance approach and key decisions from the interview]"  # <card-repo-commit-style>
```

**STOP** — Interview complete; card has been updated and committed. Do not proceed to implementation.

</instructions>
