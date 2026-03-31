---
name: runtime
description: Card repository reference
---

## Card Repository Reference

Each card is an isolated Git repository. All untracked files are automatically
removed (`git clean -fd`) after the session ends — commit everything that must persist.

## Environment Variables

The following environment variables are available in all bash statements:

| Variable | Value |
|---|---|
| `$CARD_ID` | Card ID. |
| `$NODE` | Path to the Node.js interpreter. |
| `$CARD_REPO_PATH` | Absolute path to this card's Git repository directory. |
| `$REPO_ROOT` | Absolute path to the main git repository root (not a worktree). Use for git operations that must target the main repo. |
| `$WORKSPACE_PATH` | Absolute path to the VS Code workspace root directory (may be a worktree). |
| `$BASE_BRANCH` | Git branch that the card's workspace branch will merge into. |
| `$WORKSPACE_BRANCH` | Git branch name for the card's workspace implementation. |

## Directory Layout

```
CARD.meta.json              # Metadata (source of truth)
CARD.md                     # Description (pure markdown, NO frontmatter)
PLAN.md                     # Optional plan document
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
adaptive-card/              # Adaptive Card definitions (JSON)
  {name}.json
  {name}.json.meta.json
adaptive-card-submission/   # Responses to Adaptive Cards (JSON)
  {name}.json
  {name}.json.meta.json
note/                       # Structured notes (Markdown + YAML frontmatter)
  {name}.md
  {name}.md.meta.json
```

`comment/`, `attachment/`, `adaptive-card/`, `adaptive-card-submission/`, and `note/` directories do not exist until first use (lazy creation).

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

### repositoryId

`repositoryId` identifies the workspace repository this card's code changes target
(e.g. `github.com/org/repo`). Each card targets exactly one repository. Cards for
different repositories use different board prefixes (e.g. `main-` vs `api-`).

## CARD.md, PLAN.md, and EVALUATION.md

- **`CARD.md`** is the *requirement*: what needs to be done, acceptance criteria, and
  context. Written by the card creator (human or agent). Stable once the card is understood.
- **`PLAN.md`** is the *approach*: how the requirement will be implemented, broken into
  tasks, with technical decisions. Written by the implementing agent. Subject to revision
  and approval via the
  `planRequired`/`planApproved` gates.
- **`EVALUATION.md`** is the *verification rubric*: how to confirm the implementation
  works from an end-user perspective. Written by the implementing agent following the
  `runtime:evaluation` skill structure. Optional — cards function identically without it.

All three are pure markdown with no YAML frontmatter. Never wrap content in `---` delimiters. Fenced ` ```mermaid ` blocks render as diagrams in the detail view — use when relationships or flows are hard to convey in prose alone.

## Comments

`comment/*.md` files are **pure markdown with no YAML frontmatter**.
Note files (`note/*.md`) are the exception —
they require YAML frontmatter (see Notes below).

Comment filenames are free-form — any valid filename is accepted. Callers are encouraged to use descriptive semantic slugs (e.g., `plan-approved.md`, `blocked-status.md`) that convey the comment's purpose at a glance.
Authorship is determined by git commit ownership.

**Listing** — List chronologically with author and commit message:
```bash
git log --reverse --diff-filter=A --format='%an: %s' --name-only -- comment/ \
  | awk 'NF{if(/^comment\//){print $0"  "prev}else{prev=$0}}'
```

Replace both occurrences of `comment/` with the target directory
(e.g., `attachment/`, `note/`, `adaptive-card/`) to list other file types.

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

## Adaptive Cards

Adaptive Cards are interactive UI components for **structured decisions that need a
recorded response**. Use them when:

- Requesting plan approval (action: approve/reject with feedback)
- Presenting implementation options that the user must choose between
- Requesting review sign-off

Do **not** use Adaptive Cards for simple questions — use a comment instead.
The Adaptive Card + Submission pair creates a durable, queryable decision record.

```json
{
  "id": "card-001",
  "summary": "Request for merge request approval",
  "author": "agent",
  "payload": {
    "type": "AdaptiveCard",
    "body": [],
    "actions": []
  }
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | string | Required |
| `summary` | string | Required, max 200 characters |
| `author` | string | Required |
| `payload` | object | Required, must have `type: "AdaptiveCard"`; optional `body[]` and `actions[]` |

## Adaptive Card Submissions

Adaptive Card Submissions are captured when users respond to an Adaptive Card.

```json
{
  "cardId": "card-001",
  "actionId": "approve",
  "data": {}
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `cardId` | string | Required, references an adaptive card's `id` |
| `actionId` | string | Required |
| `data` | object | Required |

## Notes

Notes are **structured records** intended to outlive the current session. Use notes for:

- Architecture Decision Records (ADRs)
- Investigation findings that future agents should reference
- Session summaries capturing key decisions and rationale

Unlike comments (chronological conversation), notes are **named and titled** for
direct retrieval. Unlike Adaptive Cards (interactive decisions), notes are
**authored artifacts** with no response mechanism.

```markdown
---
id: note-001
author: agent
title: Architecture decision record
---

Optional body content in markdown.
```

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | string | Required |
| `author` | string | Required |
| `title` | string | Required |

Body after the frontmatter closing `---` is optional.

## Content Sidecars

All three types (adaptive-card, adaptive-card-submission, note) receive a `.meta.json`
sidecar auto-generated by the pre-commit hook. Do not create or edit these files
manually — they are automatically staged. Each sidecar contains `contentType`, `sha256`,
`type`, `typeVersion`, and optional `metadata`.

## Pre-commit Hook

The pre-commit hook validates all staged changes and **fails-closed** (exit 1) on
any validation error:

1. Validates `CARD.meta.json` schema and field constraints
2. Validates adaptive-card, adaptive-card-submission, and note files; creates `.meta.json` sidecars
3. Validates attachment references in `CARD.md` against `attachment/` contents

Commits that fail validation are rejected. The `.meta.json` sidecars created during
validation are automatically staged by the hook.

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
| Subtask / intermediate | Subject sentence + optional card reference line |
| Feature / bug fix | 2-3 paragraphs: problem, approach, solution |
| Final squash | 2-5 paragraphs: the full story per the structure above |

#### Voice

Active voice, present tense. Write paragraphs as continuous prose — do not break lines for length. Use markdown to add structure, richness, and clarity in the body. Match energy to change scope — a small fix deserves small prose. Write for two readers: one debugging at 2am who needs speed, one on a calm Tuesday who needs context.

#### File References

When referencing files or concepts in the commit body, use markdown inline links with paths relative to the workspace root. In the cards-detail webview, these links open the parent-to-commit diff for the referenced file — the reader sees the change the commit introduced, not the current file state. Two styles:

- **Soft link** — anchor natural prose to a relevant file, as you would on the web: `the [token refresh logic](./src/auth/refresh.ts) now handles network timeouts`. Opens the diff without line selection.
- **Precise link** — point to a specific line or range with GitHub-style anchors: `[src/auth/provider.ts L42](./src/auth/provider.ts#L42)` or `[src/auth/provider.ts L42–L58](./src/auth/provider.ts#L42-L58)`. Scrolls the diff to the referenced line.

#### Truth Over Profundity

Every commit teaches something. Say what. When genuine insight emerges — a surprise, an irony, a lesson that only became clear after the work — include it. When it does not, move on. Manufactured insight is worse than none.

The test: would this help someone debugging at 2am? If you would mutter "just tell me what you did" while reading it, rewrite it.

#### Synthesizing from Subagent Reports

When crafting final commits from agent reports: collect Decision Narratives, extract what changed and what was learned, discard performative struggle, keep genuine insight. Weave a unified story, not a list.
</workspace-commit-style>

## Additional Resources

Load only the reference that matches the artifact you are writing:

- `references/bug-report.md`: Load when writing a `CARD.md` for a defect, regression, broken behavior, or reproducible failure.
- `references/documentation.md`: Load when writing a `CARD.md` that requests docs, guides, runbooks, references, or other documentation work.
- `references/enhancement.md`: Load when writing a `CARD.md` for a feature, product change, or behavior improvement.
- `references/investigation.md`: Load when writing a `CARD.md` whose main goal is research, diagnosis, validation, or decision support.
- `references/maintenance.md`: Load when writing a `CARD.md` for cleanup, upgrades, refactors, debt reduction, or reliability hardening without new product behavior.
- `references/operations.md`: Load when writing a `CARD.md` for operational work such as incidents, deployments, environment changes, observability, or runbook-driven tasks.
