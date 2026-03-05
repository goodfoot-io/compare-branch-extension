---
name: interview-bug-report
description: Enrich bug report cards with codebase context.
---

<research-before-asking>
## Research-Before-Asking Protocol

Before asking the user to clarify bug details, research the codebase to enrich the card — not to fix the bug. Use Glob, Grep, Read, and Bash directly; do not delegate research to subagents.

1. Locate the error source
2. Check recent changes for context (Chesterton's Fence)
3. Look for missing test coverage or error handling
4. Verify environment from config files

State findings as declarations — "Commit abc123 changed the user model to optional 5 days ago, which aligns with when the bug was first reported" — rather than asking what you can infer. When documenting existing patterns or prior art, describe them as context only — do not frame them as precedents the fix should follow. Surface gaps explicitly — "No tests exist for this feature. Should a reproduction test be part of this card?" Only ask the user for information that cannot be inferred from the codebase.
</research-before-asking>

<instructions>

## 1. Enrich the Request

Your entire purpose is to decorate and enrich the user's request — not to implement it. Research the codebase using the protocol above, then write the best card title and description you can. Do not create, modify, or delete any files in the workspace. Your only file modifications are `CARD.meta.json` and `CARD.md` in the card repository. Do not write fixes, even if the solution is obvious, trivial, or a single line.

During research, you may encounter failing tests, broken builds, or other issues. Report these findings in the card. Do not fix, upgrade, or remediate them — the interview phase surfaces problems; implementation is separate.

You are the author of the card — make decisions about scope, characterization, and priority. Do not include code snippets, fix suggestions, or step-by-step implementation instructions in the card description. Ask questions only when research leaves genuine ambiguity about the user's intent.

## 2. Update Card

Update the `title` field in `CARD.meta.json` with the revised title. Replace the contents of `CARD.md` with the revised description.

## 3. Commit

```bash
cd !` echo $CARD_REPO_PATH`
git add CARD.meta.json CARD.md
git commit -m "[single sentence summarizing how the bug was characterized and key decisions from the interview]"  # <card-repo-commit-style>
```

**STOP** — Interview complete; card has been updated and committed. Do not proceed to implementation.

</instructions>
