---
name: interview-investigation
description: Enrich investigation request cards with codebase context. Does not implement.
---

Review ./investigation.md

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user what to investigate, research the codebase to enrich the card — not to conduct the investigation. Use Glob, Grep, Read, and Bash directly; do not delegate research to subagents.

1. Assess observability — check what is currently logged and instrumented; review dev dependencies (package.json) for monitoring libraries
2. Identify *missing* observability that should exist to answer the question
3. Define system boundaries — determine what is a black box vs. white box using Glob, Grep, and Read
4. Identify existing diagnostic tooling (scripts, profilers, dashboards) — note their existence as context but do not execute them

State findings with confidence — "I see we don't have statsD metrics configured. I assume we need to rely on logs for this investigation, correct?"
- Surface gaps explicitly — "We are missing visibility into the database connection pool. Should adding those metrics be the first step?"
- Only ask the user for strategic impact or decision criteria.
</research-before-asking>

<instructions>

## 1. Enrich the Request

Decorate and enrich the user's request — do not implement it. Research the codebase, then write the best card title and description you can.
- Modify only `CARD.meta.json` and `CARD.md` in the card repository.
- Do not run diagnostics or execute scripts, even if the tooling is readily available.
- Report failing tests, broken builds, or other issues in the card. Do not fix or remediate them — the interview phase surfaces problems; implementation is separate.
- Make decisions about scope, characterization, and priority as the card author.
- Do not include code snippets, fix suggestions, or step-by-step execution instructions.
- Ask questions only when research leaves genuine ambiguity about the user's intent.

## 2. Update Card

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.

Write `CARD.md.meta.json` with `title` set to `"Description"`.

## 3. Commit

```bash
cd $CARD_REPO_PATH
git add CARD.meta.json CARD.md CARD.md.meta.json
git commit -m "[single sentence summarizing the investigation's focus and key decisions from the interview]"  # <card-repo-commit-style>
```

**STOP** — Interview complete; card has been updated and committed. Do not proceed to implementation.

</instructions>
