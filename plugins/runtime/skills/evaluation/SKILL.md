---
name: evaluation
description: Write evaluation rubrics for verifying card implementations
---

# Evaluation Skill

Write `EVALUATION.md` — the verification rubric for a card's implementation. It sits alongside `CARD.md` (the requirement) and `PLAN.md` (the approach) as the third document in the card's authorship triad.

## Purpose and Role

| Document | Role | Author |
|----------|------|--------|
| `CARD.md` | The *requirement* — what needs to be done | Card creator |
| `PLAN.md` | The *approach* — how it will be implemented | Implementing agent |
| `EVALUATION.md` | The *verification rubric* — how to confirm it works | Implementing agent |

`EVALUATION.md` is written for **human testers**. Its job is to tell a tester — who may not have read the implementation — what to do, what to look for, and what constitutes success. It is optional: cards function identically without it. Write it when the implementation is non-trivial enough that correct verification is not obvious from the card description alone.

## Structure

An evaluation document has two parts: a short narrative introduction followed by a sequence of checkpoints.

```
## Overview

[1-3 sentence narrative framing what this feature does and how to approach verification. Written in plain language, no jargon.]

<checkpoint>
[Description of one distinct verification step. Written as an instruction or observation. One outcome per checkpoint.]
</checkpoint>

<checkpoint>
[Next step.]
</checkpoint>
```

### Checkpoint Semantics

Each `<checkpoint>` tag wraps a single, independently verifiable step. The tester works through checkpoints in order; each one should pass before proceeding to the next.

A checkpoint is **one outcome**, not a list. If verification requires two distinct actions, use two checkpoints.

Write each checkpoint as a complete, self-contained instruction:

- What to do (navigate to, click, submit, observe)
- What to expect as the success condition

## Writing Principles

**Test user experience, not implementation.** Checkpoints describe what a user observes — visible output, UI state, error messages, file contents — not which function was called or which variable was set. A tester who cannot read code must be able to complete every checkpoint.

**Observable outcomes only.** "The feature works" is not a checkpoint. "The sidebar shows a new entry labelled 'Evaluation' after clicking Refresh" is a checkpoint.

**Codebase-agnostic language.** Avoid file paths, function names, class names, or module names unless the tester will literally see them (e.g., in a terminal output). Prefer describing the interface: button labels, menu items, visible text, status indicators.

**One step per checkpoint.** Compound checkpoints ("do X and verify Y, then do Z") are harder to fail-fast on. Split them.

**Ordered for progression.** Start with setup and basic presence checks, move to behavior under normal conditions, then edge cases and error conditions. A tester who fails checkpoint 2 should not need to attempt checkpoint 7.

## Checkpoint Granularity

Use one checkpoint per distinct verification step — not per click, not per feature area.

Too coarse: one checkpoint for "verify the entire evaluation flow end to end." A failure gives no useful signal.

Too fine: one checkpoint per mouse click. Checkpoints become noise.

Right-sized: one checkpoint per observable outcome. If the tester reaches a distinct state the system must be in for subsequent steps to make sense, that is a checkpoint boundary.

## Annotated Example

```markdown
## Overview

The evaluation document verifies a card's implementation from a tester's
perspective. Verify that it can be written to the card repository, read
back via the filesystem endpoint, and that missing files are handled
correctly.

<checkpoint>
Open a card that has no EVALUATION.md file. Send a GET request to
/cards/{id}/fs/EVALUATION.md. Confirm the response is 404 with a JSON
body containing an "error" field.
</checkpoint>

<checkpoint>
Write evaluation content directly to the card repository:
  cat <<'EOF' > "$REPO/EVALUATION.md"
  ## Overview

  Test content.
  EOF
  cd "$REPO" && git add EVALUATION.md && git commit -m "Add evaluation"
Confirm the commit succeeds.
</checkpoint>

<checkpoint>
Send GET /cards/{id}/fs/EVALUATION.md again. Confirm the response is
200 with the written content.
</checkpoint>

<checkpoint>
Send GET /cards/nonexistent-card-id/fs/EVALUATION.md. Confirm the
response is 404. This verifies that missing cards are distinguished
from missing evaluation files.
</checkpoint>
```

The first checkpoint establishes baseline (no file → 404). The second writes the file directly to the card repository. The third confirms the round-trip via the filesystem endpoint. The fourth tests a distinct error path (bad card ID vs. missing file). Each is independently observable without reading code.
