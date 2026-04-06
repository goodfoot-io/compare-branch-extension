## Card Repository Reference

Each card is an isolated Git repository. Untracked files are removed (`git clean -fd`) after the session ends — commit everything that must persist.

## Environment Variables

The following environment variables are available in all bash statements:

| Variable | Value |
|---|---|
| `$CARD_ID` | Card ID. |
| `$NODE` | Path to the Node.js interpreter. |
| `$CARD_REPO_PATH` | Absolute path to this card's Git repository directory. |
| `$REPO_ROOT` | Absolute path to the main git repository root (not a worktree). Use for git operations that must target the main repo. |
| `$WORKSPACE_PATH` | Absolute path to the VS Code workspace root directory (may be a worktree). Equivalent to `$(pwd)`. |
| `$BASE_BRANCH` | Git branch that the card's workspace branch will merge into. |
| `$WORKSPACE_BRANCH` | Git branch name for the card's workspace implementation. |

## Execution Mode

The session runs in one of two modes, surfaced as the `mode` attribute on the `<card>` block:

| Mode | Meaning |
|------|---------|
| `interactive` | User is present; UI is visible. Prompts and clarifying questions are appropriate. |
| `background` | Action runs without user attention. Minimize prompts; prefer autonomous decisions and comments over blocking questions. |

## Directory Layout

```
CARD.meta.json              # Metadata (source of truth)
CARD.md                     # Description (pure markdown, NO frontmatter)
PLAN.md                     # Optional plan document
EVALUATION.md               # Optional evaluation rubric
branches.json               # Branches associated with the card
commits.csv                 # Git commit SHAs associated with the card
comment/                    # Created on first comment
  {slug}.md                 # Descriptive semantic slug, pure markdown
attachment/                 # Created on first attachment
  att-{uuid4}_{name}        # Binary content
  att-{uuid4}_{name}.meta.json
streams/                    # Append-only JSONL
  {streamType}/
    {filename}
    {filename}.meta.json
```

`commits.csv` and `branches.json` are automatically updated by Cards infrastructure. Do not modify them directly.

## CARD.meta.json

```json
{
  "id": "main-0001",
  "title": "Implement authentication",
  "status": "in_progress",
  "tags": ["feature", "security"],
  "gates": {
    "planRequired": true,
    "planApproved": true,
    "mergeRequestRequired": true,
    "mergeApproved": false
  },
  "isPinned": false,
  "order": 1,
  "repositoryId": "github.com/org/repo",
  "relations": [
    { "type": "related", "cardId": "main-0002" }
  ]
}
```

`relations` is optional — omitted when the card has no outgoing relations. Each entry has a `type` (only `"related"` is valid) and a `cardId` referencing the target card.

### Gates

**`gates`** are boolean prerequisites. `planRequired`/`planApproved` control whether a plan must exist and be approved. `mergeRequestRequired`/`mergeApproved` control whether a review must exist and be approved.

Validation rules for each field are in `references/validation.md`.

### Gate Enforcement

Gates are **informational constraints**, not hard blocks. The pre-commit hook does not
enforce gate satisfaction. Instead:

- Gates signal intent to other agents and the UI. The board may visually flag unsatisfied gates.
- Cross-field constraints are enforced: `planApproved: true` requires `planRequired: true`
  (see `references/validation.md`).
- Agents should treat unsatisfied gates as blockers: do not request review
  when `planRequired=true` and `planApproved=false` — write and get the plan approved first.

**Gates are user-controlled.** Agents must never modify gate fields (`planRequired`,
`planApproved`, `mergeRequestRequired`, `mergeApproved`).

### repositoryId

`repositoryId` identifies the workspace repository this card's code changes target
(e.g. `github.com/org/repo`). Each card targets exactly one repository. Cards for
different repositories use different board prefixes (e.g. `main-` vs `api-`).

## CARD.md, PLAN.md, and EVALUATION.md

- **`CARD.md`** is the *description*: what's happening, what's needed, and why it matters.
  Content varies by card type — a bug report describes the defect, an enhancement describes
  the capability gap, an investigation describes the unknown. Written by the card creator
  (human or agent). Stable once the card is understood.
- **`PLAN.md`** is the *approach*: how the card's action will be performed and for what
  purpose (commander's intent). Includes technical decisions and steps, but starts with the
  end state. Written by the implementing agent or alongside CARD.md when the approach is
  clear at creation time. Subject to revision and approval via the `planRequired`/`planApproved`
  gates.
- **`EVALUATION.md`** is the *verification rubric*: how to confirm the implementation
  works from an end-user perspective. Written by the implementing agent following the
  `runtime:evaluation` skill structure. Optional — cards function identically without it.

All three are pure markdown with no YAML frontmatter. Never wrap content in `---` delimiters.


## Comments

`comment/*.md` files are **pure markdown with no YAML frontmatter**.

Comment filenames are free-form — use descriptive semantic slugs (e.g., `plan-approved.md`, `blocked-status.md`). Authorship is determined by git commit ownership, order is determined by git creation time.

**Adding:**
```bash
cat <<'EOF' > comment/my-slug-name.md
[COMMENT CONTENT]
EOF
```

## Attachments

Attachment files use UUID4 identifiers with a sanitized original filename:

```
Pattern: att-{uuid4}_{sanitized-name}
Example: att-a1b2c3d4-e5f6-4789-a012-b3c4d5e6f7g8_screenshot.png
```

Each attachment has a `.meta.json` sidecar:

```json
{
  "id": "a1b2c3d4-e5f6-4789-a012-b3c4d5e6f7g8",
  "name": "att-a1b2c3d4-e5f6-4789-a012-b3c4d5e6f7g8_screenshot.png",
  "originalName": "Screenshot 2024-01-15.png",
  "size": 1024000,
  "mimeType": "image/png"
}
```

Markdown references to attachments use the pattern `att-[a-f0-9-]{36}_[\w.-]+`,
recognized both with and without an `attachment/` prefix.

## Pre-commit Hook

The pre-commit hook validates all staged changes and **fails-closed** (exit 1) on any validation error:

1. Validates `CARD.meta.json` schema and field constraints
2. Validates attachment references in `CARD.md` against `attachment/` contents

Commits that fail validation are rejected.

## Claude Code Sessions

Claude Code session transcripts are append-only NDJSON streams in `streams/claude-code-session/`.
Each session produces a `.jsonl` transcript and a `.meta.json` sidecar.


