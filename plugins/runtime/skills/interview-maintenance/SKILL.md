---
name: interview-maintenance
description: Scope maintenance requests through research and interview.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user about debt or refactoring, research the codebase:

1. Correlate complexity with churn — use git log and file size to find high-value targets
2. Check for *missing* tests using Task (explore) — a refactor without tests is dangerous
3. Verify dependency status from lockfiles for deprecated versions

State findings with confidence — "I see this module has 0 tests and high churn. I assume adding tests is the first requirement before any refactoring. Correct?" Surface gaps explicitly — identify specifically *what* is untestable or brittle. Only ask the user for business motivation and risk profile.
</research-before-asking>

<instructions>

## 1. Conduct Interview

Conduct an interview to improve only the card title and description (do not modify plan content or other fields) so they clearly describe the maintenance work.

Use the `AskUserQuestion` tool to ask focused, sequential questions and propose probable answers when helpful. Continue until you have a clear, complete view of the title and description. If the user asks you to proceed with the information available, move forward with the update.

## 2. Update Card

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.

## 3. Commit

```bash
cd $CARD_REPO_PATH
git add CARD.meta.json CARD.md
git commit -m "[summary of title/description changes, key decisions from the interview, and rationale for the maintenance approach]"  # <card-repo-commit-style>
```

**STOP** — Interview complete; card has been updated and committed.

</instructions>
