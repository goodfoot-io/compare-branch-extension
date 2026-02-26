---
name: card-repo
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
| `$WORKSPACE_PATH` | Absolute path to the VS Code workspace root directory. |
| `$BASE_BRANCH` | Git branch that the card's workspace branch will merge into. |
| `$WORKSPACE_BRANCH` | Git branch name for the card's workspace implementation. |

## Directory Layout

```
CARD.meta.json              # Metadata (source of truth)
CARD.md                     # Description (pure markdown, NO frontmatter)
PLAN.md                     # Optional plan document
comment/                    # Created on first comment
  {uuidv7}.md               # Pure markdown, no frontmatter
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
    "reviewRequired": true,
    "reviewApproved": false
  },
  "isPinned": false,
  "order": 1,
  "repositoryId": "github.com/org/repo"
}
```

### Status and Gates

`status` and `gates` track different things:

- **`status`** is the card's lifecycle state: `todo` → `in_progress` → `needs_review` → `done`. It represents where the card sits on the board.
- **`gates`** are boolean prerequisites. `planRequired`/`planApproved` control whether a plan must exist and be approved. `reviewRequired`/`reviewApproved` control whether a review must exist and be approved.

Gates do not automatically advance status. A card can have all gates satisfied (`reviewApproved=true`) while still in `needs_review` status — this means the review passed but the card has not yet been moved to `done`. Conversely, a card in `in_progress` with `reviewRequired=true` and `reviewApproved=false` means work is underway but no review has been requested or approved yet.

Validation rules for each field are in `references/validation.md`.

## CARD.md and Comments

`CARD.md`, `PLAN.md`, and `comment/*.md` are **pure markdown with no YAML frontmatter**.
Never wrap content in `---` delimiters. Note files (`note/*.md`) are the exception —
they require YAML frontmatter (see Notes below).

Comment filenames must be UUIDv7 (RFC 9562), validated by the pre-commit hook.
UUIDv7 encodes a timestamp prefix, making comments chronologically sortable by filename.

```bash
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
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

Adaptive Cards are interactive UI components using the Adaptive Card schema.

```json
{
  "id": "card-001",
  "summary": "Request for review approval",
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

Status is not stored in the file — it is derived from adaptive-card-submission existence.

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

Notes are markdown files with structured YAML frontmatter metadata.

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
2. Validates comment filenames are UUIDv7
3. Validates adaptive-card, adaptive-card-submission, and note files; creates `.meta.json` sidecars
4. Validates attachment references in `CARD.md` against `attachment/` contents

Commits that fail validation are rejected. The `.meta.json` sidecars created during
validation are automatically staged by the hook.

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
| `status` | string | Required; one of `active`, `completed`, `error`, `interrupted`, `size_limit`, `recovered` |
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

Card repository commit messages are the coordination surface for agents working together on a card. An agent scanning `git log --oneline` should be able to reconstruct the project timeline and decide what to do next without reading every comment file.

**Every commit message should answer:**

1. **What phase?** What stage did we just complete or enter? (planning, implementing task N of M, blocked, awaiting review, merging)
2. **What workspace change?** Which subtask, feature area, or files does this correspond to? Correlates card-repo history with workspace-repo history.
3. **Outcome?** Did it succeed or fail? (completed, blocked, needs revision) — the status signal that determines next action.
4. **If blocked, what unblocks it?** What's needed so the next agent doesn't repeat the same attempt.

**Format:** One or two lines. The comment content carries detail; the commit message carries signal.

**Examples:**

| Category | Example |
|----------|---------|
| Progress | `progress: auth middleware complete (task 2/4)` |
| Completion | `implementation complete` |
| Blocked | `blocked: type error in package X — outside plan scope` |
| Clarification | `clarify title and enrich description from exploration` |
| Plan | `plan: initial approach — migration strategy with 3 tasks` |
| Plan feedback | `plan revised: incorporated feedback on error handling` |
| Accepted concerns | `accepted strategic concerns re: coupling tradeoff` |
| Awaiting review | `implementation complete, awaiting review` |
| Question/answer | `answered: how auth tokens are validated` |
| Reopen | `reopened: user requested additional error handling` |
| Error recovery | `blocked: unexpected error during merge — manual fix needed` |
| No-action | `acknowledged: user provided context, no action needed` |
</card-repo-commit-style>

<workspace-commit-style>
### Workspace Repository Commits

Workspace commits are the narrative layer of code history. Future developers will read these to understand not just *what* changed, but *why* and *how*.

#### Structure (2-5 paragraphs, scaled to change scope)

**Paragraph 1 — The Hook**: Conventional commit prefix + concise subject. Follow with why this change matters in broader system context.

**Paragraph 2 — The Problem**: What challenge or deficiency prompted this work? Paint the "before" picture.

**Paragraph 3 — The Journey** (for substantial changes): Alternatives considered, what made this approach win, pivots or dead ends. This is the heart of the narrative — what makes the message memorable and educational.

**Paragraph 4 — The Solution**: What was built, focusing on *design* over file lists. Patterns established, tradeoffs accepted.

**Paragraph 5 — The Future** (optional, for large changes): What this enables, remaining work, guidance for maintainers.

#### Scaling

| Commit Type | Length |
|-------------|--------|
| Subtask / intermediate | 1-2 lines: what changed, card reference |
| Feature / bug fix | 2-3 paragraphs: problem, approach, solution |
| Final squash | 2-5 paragraphs: the full story per the structure above |

#### Voice

Active voice, present tense. Match energy to change scope — a small fix deserves small prose. Write for two readers: one debugging at 2am who needs speed, one on a calm Tuesday who needs context.

#### Truth Over Profundity

Every commit teaches something. Say what. When genuine insight emerges — a surprise, an irony, a lesson that only became clear after the work — include it. When it does not, move on. Manufactured insight is worse than none.

The test: would this help someone debugging at 2am? If you would mutter "just tell me what you did" while reading it, rewrite it.

#### Synthesizing from Subagent Reports

When crafting final commits from agent reports: collect Decision Narratives, extract what changed and what was learned, discard performative struggle, keep genuine insight. Weave a unified story, not a list.
</workspace-commit-style>

## Workspace Repo Log

The session-start hook injects `<workspace-repo-log>` blocks into the system context.
Each block shows workspace commits grouped by the branch they are reachable from,
with cross-branch deduplication.

```xml
<workspace-repo-log branch="cards/main-0001/1" parentBranch="main" count="3">
abc123d feat(auth): implement OAuth2 provider
 src/auth/provider.ts | 45 ++++++++++++

def456e fix: handle token refresh edge case
 src/auth/refresh.ts  | 12 +++++---

9a8b7c6 test: add auth integration tests
 src/auth/auth.test.ts | 38 +++++++++++
</workspace-repo-log>

<workspace-repo-log branch="cards/main-0001/2" parentBranch="main" count="2">
789abcd refactor: extract auth middleware
 src/middleware.ts    | 23 ++++----

def456e
</workspace-repo-log>
```

| Attribute | Meaning |
|-----------|---------|
| `branch` | Git branch the commits are reachable from |
| `parentBranch` | The branch this feature branch was created from |
| `count` | Total workspace commits reachable from this branch |
| `orphaned` | `"true"` when commits are not reachable from any tracked or base branch |

Commits that already appeared with full detail in an earlier block are shown as bare
7-character short hashes (e.g. `def456e` above). This deduplication keeps the context
compact when multiple branches share common ancestry.

Branches are ordered by `addedAt` (oldest first), so the foundational branch receives
full commit output and later branches deduplicate against it.

## Additional Resources

### Reference Files

For detailed schemas and validation rules, consult:

- **`references/validation.md`** - Field constraints, status values, tag patterns, gate logic
