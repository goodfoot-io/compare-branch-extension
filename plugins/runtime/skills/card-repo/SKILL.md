---
name: card-repo
description: Card repository reference
---

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
CARD.md.meta.json           # Document sidecar (title, summary)
PLAN.md                     # Optional plan document
PLAN.md.meta.json           # Document sidecar (title, summary)
EVALUATION.md               # Optional evaluation rubric
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

`comment/` and `attachment/` directories do not exist until first use (lazy creation).

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

### Document Sidecars

Any `.md` file at the card repository root may have a `.md.meta.json` sidecar (e.g., `CARD.md` → `CARD.md.meta.json`). Write or update the sidecar whenever writing or updating the document. Commit the sidecar alongside its document.

```json
{
  "title": "4–10 word display title",
  "summary": "[100–300 word preview shown when the section is collapsed."]
}
```

The UI renders `title` as the section header (falling back to the filename when absent) and `summary` as markdown in the collapsed preview.

## Comments

`comment/*.md` files are **pure markdown with no YAML frontmatter**.

Comment filenames are free-form — use descriptive semantic slugs (e.g., `plan-approved.md`, `blocked-status.md`). Authorship is determined by git commit ownership.

**Listing** — List chronologically with author and commit message:
```bash
git log --reverse --diff-filter=A --format='%an: %s' --name-only -- comment/ \
  | awk 'NF{if(/^comment\//){print $0"  "prev}else{prev=$0}}'
```

Replace both occurrences of `comment/` with the target directory
(e.g., `attachment/`) to list other file types.

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

```json
{
  "filename": "{sessionId}.jsonl",
  "streamType": "claude-code-session",
  "status": "completed",
  "lineCount": 42,
  "title": "Claude session for {cardId}",
  "sessionId": "{sessionId}"
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `filename` | string | Required |
| `streamType` | string | Required, value: `"claude-code-session"` |
| `lineCount` | number | Required |
| `title` | string | Optional |
| `sessionId` | string | Optional |

Each line in the `.jsonl` file is a JSON object from the Claude Code SDK (`--output-format stream-json`):

| `type`             | `subtype`  | Content                              |
|--------------------|------------|--------------------------------------|
| `system`           | `init`     | Model, tools, cwd                    |
| `assistant`        |            | Response content blocks (text, tool_use, thinking) |
| `tool_use_summary` |            | Tool output summary                  |
| `tool_progress`    |            | Long-running tool status             |
| `result`           | `success`  | Turns, duration, cost                |
| `result`           | `error`    | Error details with stats             |

## Commit Message Styles

Two repositories receive commits during card work. Each has a distinct commit style.

<card-repo-commit-style>
### Card Repository Commits

Card repository commit messages summarize the content of the commit itself. An agent scanning `git log --oneline` should understand what information each commit contributes without opening the files.

**The commit message is a single sentence summarizing the commit's substance** — not a status label or inventory of files changed. If the commit adds a comment, the message summarizes the comment. If it adds a plan, the message summarizes the approach.

**Format:** One sentence. The comment content carries detail; the commit message carries a summary of that detail.

**Examples:**

| Category | Example |
|----------|---------|
| Progress | `Auth middleware validates tokens and attaches user context to requests` |
| Completion | `All four migration tasks pass type checking and integration tests` |
| Blocked | `Package X exports an incompatible type that prevents the adapter from compiling` |
| Clarification | `Title narrowed to auth middleware; added exploration notes on token flow` |
| Plan | `Three-task migration strategy starting with schema, then adapters, then callers` |
| Plan feedback | `Revised to add explicit error handling for expired tokens per feedback` |
| Accepted concerns | `Coupling tradeoff between auth and session modules accepted as pragmatic` |
| Awaiting review | `Middleware, tests, and integration wiring are complete and ready for review` |
| Question/answer | `Tokens are validated by comparing HMAC signatures against the rotated secret` |
| Reopen | `Additional error handling needed for network timeouts during token refresh` |
| Error recovery | `Merge failed due to conflicting changes in session.ts — needs manual resolution` |
| No-action | `User provided context on deployment constraints, no code changes needed` |
</card-repo-commit-style>

<workspace-commit-style>
### Workspace Repository Commits

Workspace commits are the narrative layer of code history. Future developers will read these to understand not just *what* changed, but *why* and *how*.

#### Structure (2-5 paragraphs, scaled to change scope)

**Paragraph 1 — The Hook**: One full sentence summarizing the substance of the commit (plain text, no markdown). Follow with why this change matters in broader system context.

**Paragraph 2 — The Problem**: What challenge or deficiency prompted this work? Paint the "before" picture.

**Paragraph 3 — The Journey** (for substantial changes): Alternatives considered, what made this approach win, pivots or dead ends. This is the heart of the narrative — what makes the message memorable and educational.

**Paragraph 4 — The Solution**: What was built, focusing on *design* over file lists. Patterns established, tradeoffs accepted.

**Paragraph 5 — The Future** (optional, for large changes): What this enables, remaining work, guidance for maintainers.

#### Scaling

| Commit Type | Length |
|-------------|--------|
| Small fix / refactor | Subject sentence + optional card reference line |
| Feature / bug fix | 2-3 paragraphs: problem, approach, solution |
| Major milestone | 2-5 paragraphs: the full story per the structure above |

#### Voice

Active voice, present tense. Write paragraphs as continuous prose — do not break lines for length. Use markdown for structure and clarity in the body. Match energy to change scope — a small fix deserves small prose.

#### File References

Follow the `<markdown-guidelines>` in the `cards:markdown` skill for all file references in commit bodies.

#### Truth Over Profundity

Include genuine insight when it emerges — a surprise, an irony, a lesson that only became clear after the work. When it does not, move on. The test: would this help someone debugging at 2am?

#### Synthesizing from Subagent Reports

Collect Decision Narratives from agent reports, extract what changed and what was learned, discard performative struggle. Weave a unified story, not a list.
</workspace-commit-style>
