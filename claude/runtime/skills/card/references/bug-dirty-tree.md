
<placeholder-variables>
[CARD_ID] — The current card identifier
[BASE_BRANCH] — The branch the card's worktree was created from
</placeholder-variables>

<instructions>

The worktree is dedicated to this card, so the changes are almost certainly partial work from a prior attempt that did not finish (e.g., a crashed session). Triage before blocking.

## 1. Inspect the Changes

Run `git diff` and `git diff --cached`. Compare against the card's branch baseline (`bug/$CARD_ID/baseline` if it exists, otherwise `$BASE_BRANCH`).

## 2. Classify the Dirt

Pick exactly one bucket:

- **On-card and coherent** — the changes are recognizable progress toward this card's goal (e.g., a partial fix, a reproducer test, scaffolding named in the plan). Treat as recoverable: commit it on the current branch with a message like `wip: recovered from prior attempt — <one-line summary>`, note the recovery in a card comment, and return to the caller's next step. The next steps will build on or supersede it.
- **On-card but incoherent** — touches files in the card's scope but the changes don't form a meaningful step (random edits, half-applied refactor, conflicting hunks). Stash with `git stash push -m "card/$CARD_ID/pre-bug-triage"`, write a comment recording the stash ref and a short description of what was discarded, and proceed with a clean tree.
- **Off-card** — touches files unrelated to this card. This should not happen in a card-dedicated worktree; it indicates worktree contamination. Add `blocked` to `tags` in `CARD.meta.json`, write a comment with the offending paths, commit, and **STOP**.

Only the **off-card** branch blocks. The other two recover and continue.

## 3. Tie-Breaker

If classification is genuinely ambiguous after inspection, prefer the **incoherent** path (stash + comment + proceed) over asking the user — the stash preserves the work, and the next implementation attempt is the right place to decide whether to restore it.

</instructions>
