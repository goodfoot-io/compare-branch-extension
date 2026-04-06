---
name: evaluation
description: Write evaluation rubrics for verifying card implementations
---

`EVALUATION.md` is the verification rubric for a card's implementation, written for human testers who may not have read the implementation. Write it when correct verification is not obvious from the card description alone.

| Document | Role | Author |
|----------|------|--------|
| `CARD.md` | The *description* — what's happening, what's needed, and why | Card creator |
| `plan/` | The *approach* — how the card's action will be performed and why | Implementing agent |
| `EVALUATION.md` | The *verification rubric* — how to confirm it works | Implementing agent |

## Structure

Two parts: a short narrative introduction followed by a sequence of checkpoints.

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

Each `<checkpoint>` tag wraps a single, independently verifiable step. Work through checkpoints in order; each one should pass before proceeding.

- One outcome per checkpoint — two distinct actions means two checkpoints
- Include what to do (navigate to, click, submit, observe) and the expected success condition

## Writing Principles

- **Test user experience, not implementation.** Describe what a user observes — visible output, UI state, error messages, file contents — not internal function calls or variables.
- **Observable outcomes only.** "The feature works" is not a checkpoint. "The sidebar shows a new entry labelled 'Evaluation' after clicking Refresh" is.
- **Codebase-agnostic language.** Avoid file paths, function names, or class names unless the tester will literally see them (e.g., in terminal output).
- **One step per checkpoint.** Split compound checkpoints ("do X and verify Y, then do Z").
- **Ordered for progression.** Start with setup and basic presence checks, then normal conditions, then edge cases and error conditions.

## Checkpoint Granularity

One checkpoint per distinct verification step — not per click, not per feature area.

- **Too coarse**: "Verify the entire evaluation flow end to end" — failure gives no useful signal
- **Too fine**: One checkpoint per mouse click — checkpoints become noise
- **Right-sized**: One checkpoint per observable outcome — if the tester reaches a distinct state the system must be in for subsequent steps, that is a checkpoint boundary

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
  cd "$REPO" && git add EVALUATION.md && git commit -m "Added evaluation [single sentence summarizing what the rubric verifies]."
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

First checkpoint establishes baseline (no file -> 404). Second writes the file. Third confirms the round-trip. Fourth tests a distinct error path (bad card ID vs. missing file).
