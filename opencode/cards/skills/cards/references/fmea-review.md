<!-- @goodfoot/agent-skills source: skills-src/cards/cards/references/fmea-review.md.eta sha256:41b8a53a8313b8f2ef479da2e0f02785ffbe483f2e5a47aed3e4cd8cef381ffd -->
# FMEA Review Loop

Iteratively review a card's design corpus with a dedicated reviewer worker until it reports no remaining failure modes. The card is the unit under review — the loop hardens the card's specification, not the code.

## 1. Launch the reviewer

Spawn one worker on the strongest available model with `spawn_agent` (re-task it via `send_message`/`resume_agent` across rounds). Its prompt must direct it to:

- Read the entire card corpus at `[CARD_REPO_PATH]` (CARD.md and every tier; for a deep card: `explanation/`, `how-to/`, `reference/`, `notes/`, HTML pages), with a summary of the designed system.
- Cross-check every file/line anchor the card cites against the workspace code; flag wrong anchors and any claim the code contradicts.
- Perform a failure mode and effects analysis on the **designed system as specified**, enumerating failure modes by domain tailored to the card (storage, concurrency/races, lifecycle, security exposure paths, entry points, …).
- For each failure mode the card handles, verify the stated control is real and specified precisely enough to implement with no other context; report the rest as findings: failure mode, effect, severity (H/M/L), and a concrete recommendation naming the card file(s) to change.
- Deliver a verdict — SATISFIED or NOT SATISFIED — with findings ordered by severity. Be strict, but never report the absence of explicitly out-of-scope items.
- Keep the analysis organized by finding number for follow-up rounds via `send_message`.

## 2. Collect the full report

- **Only a headline summary arrives**: `send_message` the reviewer for the complete numbered findings list (failure mode, effect, severity, recommendation each). It may span several messages — wait for all parts before editing anything.

## 3. Fix pass

- Verify every **new** anchor or code claim the reviewer introduced against the codebase before writing it into the card — reviewers err too.
- Adopt recommendations, but preserve decisions the user already approved (e.g., approved UI); where a recommendation conflicts with one, design a variant honoring both and record the reasoning in the card.
- **Renumbering steps in a file**: sweep every `step N` cross-reference to it in other files.
- **Deep card**: regenerate the `.md.meta.json` sidecar of every substantively changed file (stale sidecars get reported as findings), then re-verify intra-card path integrity (every backtick tier path resolves to an existing file).
- **Commit before requesting re-review** — the reviewer reads the tree; uncommitted edits get reported as "not landed".

## 4. Request re-review

`send_message`/`resume_agent` (whichever applies) a finding-by-finding resolution map: for each finding number, the file/step changed and how, plus the commit SHA(s). Ask for SATISFIED or a numbered list of residuals.

## 5. Handle crossed messages

- **Idle notification without a verdict**: nudge the reviewer for the verdict.
- **A verdict lists findings already fixed**: check `git log`/`git status` first — if the fixes are committed, reply naming the commit and ask for re-verification at that commit; do not re-fix.

## 6. Close the loop

Repeat Steps 3–5 until SATISFIED. Apply any non-blocking corrections in the final verdict, commit, and confirm closure to the reviewer. Report to the user: verdict, rounds, finding tally, and the highest-impact design changes.
