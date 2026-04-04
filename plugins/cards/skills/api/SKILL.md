---
name: api
description: You must use this skill to "create a card" or "create a new card", "read card [CARD ID]", or interact with a "card". Card IDs are in the format "[slug]-[N]", for example "main-23". 
---

# Cards API

Use the CLI binaries below to manage cards and send notifications. For direct
card content operations (comments, attachments, plans), use the card's
filesystem repository — see Card Repository below.

The user is notified when you create a card or add a comment.

## Card Type References

Before writing a card's description (CARD.md), load the `cards:markdown` skill and the reference that matches the user's request.

Determine the card type using the first matching signal:
- **Bug, error, crash, regression, broken behavior**: `./references/bug-report.md`
- **Feature, improvement, new capability**: `./references/enhancement.md`
- **Research, spike, unknown root cause, feasibility**: `./references/investigation.md`
- **Documentation, guides, runbooks, API reference**: `./references/documentation.md`
- **Refactor, cleanup, tech debt, upgrade, migration**: `./references/maintenance.md`
- **Infrastructure, CI/CD, deploy, monitoring, scaling**: `./references/operations.md`
- **Otherwise**: `./references/enhancement.md`

Read the matched reference file, then follow its guidance to compose the card's CARD.md content.

### Optional PLAN.md at Creation Time

If research during CARD.md writing reveals a clear approach, write PLAN.md alongside CARD.md rather than forcing a separate planning pass that duplicates the research. PLAN.md describes how the card's action will be performed and for what purpose (commander's intent). Write PLAN.md only when the approach is clear — if it isn't, write only CARD.md and let the planning step handle it.

## CLI Binaries

Like `$EDITOR` or `$SHELL`, the CLI variables below hold absolute paths to executables and can be used directly as commands. They are set automatically at session start.

| Variable | CLI |
|----------|-----|
| `$CARD_CLI` | Card operations (get, create, list, attach, detach, action) |
| `$NOTIFICATION_CLI` | Send notifications to the VS Code UI |
| `$COMPARE_CLI` | Manage the attribution tree comparison mode |

### $CARD_CLI — Card operations

#### Commands

**Get a card** — Fetch card details by ID. The response includes `repositoryPath` for filesystem access:
```
$CARD_CLI <card-id>
```

The response includes:
- `isMerged: boolean | null` — `true` when all workspace commits are merged into the viewer's HEAD, `false` when commits exist but are not merged, `null` when the card has no workspace commits.
- `parentBranch` — the workspace branch the card was created from; present when the card was created in a workspace with a resolvable branch.

**Create a card** — Pipe JSON to stdin with `title` (required). Optional: `tags`, `environment`, `gates`, `relations`:
```
$CARD_CLI create <<'EOF'
{ "title": "Fix auth", "tags": ["bug"] }
EOF
```

The response includes `repositoryPath`. After creation, write card content and document sidecars directly to the card repository and commit:

```bash
REPO=$($CARD_CLI create <<'EOF' | jq -r '.repositoryPath'
{ "title": "Fix auth", "tags": ["bug"] }
EOF
)
cat <<'CARD_EOF' > "$REPO/CARD.md"
Card description here (plain markdown, no frontmatter).
CARD_EOF
cat <<'META_EOF' > "$REPO/CARD.md.meta.json"
{ "title": "Description" }
META_EOF
cd "$REPO" && git add CARD.md CARD.md.meta.json && git commit -m "Added description [single sentence summarizing the current and desired behavior covered]."
```

If the approach is clear, write PLAN.md in the same flow:

```bash
cat <<'PLAN_EOF' > "$REPO/PLAN.md"
Plan content here (plain markdown, no frontmatter).
PLAN_EOF
cat <<'META_EOF' > "$REPO/PLAN.md.meta.json"
{ "title": "Plan: [approach title]" }
META_EOF
cd "$REPO" && git add PLAN.md PLAN.md.meta.json && git commit -m "Added plan [single sentence summarizing the approach and key components]."
```

Include `relations` at creation time when the new card has a known relationship to an existing card. Each entry has a `type` (only `"related"` is valid) and a `cardId` referencing the target card. Relations can only be set at creation time via the CLI; to modify relations after creation, edit `CARD.meta.json` directly in the card repository.

```
$CARD_CLI create <<'EOF'
{ "title": "Unify tag layout", "relations": [{ "type": "related", "cardId": "main-67" }] }
EOF
```

**List cards** — List cards for the current workspace. Detects workspace path from git automatically:
```
$CARD_CLI list
$CARD_CLI list --status in_progress
$CARD_CLI list --tag bug --tag feature
$CARD_CLI list --search "auth" --status todo
```

Each card in the response includes `parentBranch` when the card was created in a workspace with a resolvable branch.

Options: `--workspace-path <path>`, `--status <status>`, `--tag <tag> (repeatable; tags are OR-combined)`, `--search <query>`, `--limit <n>`, `--offset <n>`

#### Workspace Path

The CLI auto-detects the workspace from `pwd`. Cards are scoped to the branch you're working on — in a worktree, the card belongs to that worktree's branch (e.g., branch `feature` -> prefix `feature-`).

Use `--workspace-path` only if the user explicitly requests creating a card in a different repository.

**Execute an action** — Execute an action on a card via the server relay:
```
$CARD_CLI <card-id> action <action-id>
```
The action ID is the lowercase identifier from the action definition (e.g., `launch`). Requires a connected extension client.

### $NOTIFICATION_CLI — Send notifications

Send a notification to the VSCode UI.

```
$NOTIFICATION_CLI --type info --title "Build complete" --message "All tests pass" --source my-agent
$NOTIFICATION_CLI --type warning --title "Slow query" --message "Query took 5s" --source db-monitor
$NOTIFICATION_CLI --type error --title "Deploy failed" --message "Exit code 1" --source ci
```

Required: `--type` (error|warning|info), `--title`, `--message`, `--source`

### $COMPARE_CLI — Compare operations

Manage the attribution tree comparison mode. One active comparison per server.

#### Commands

**Set comparison** — Pipe a JSON request to stdin. Three shapes are supported. All three accept an optional `"title"` field; when present, the title overrides the derived ref-based title in the attribution tree view sidebar.

Branch range — compare two arbitrary refs:
```
$COMPARE_CLI set <<'EOF'
{ "baseRef": "main", "compareRef": "feature-branch", "title": "My Comparison" }
EOF
```

Dynamic worktree — track a worktree's HEAD live:
```
$COMPARE_CLI set <<'EOF'
{ "baseRef": "main", "repositoryPath": "/workspace/.worktrees/cards/main-4/1", "title": "Card Changes" }
EOF
```

Fixed attribution — show pre-computed SHAs against a ref:
```
$COMPARE_CLI set <<'EOF'
{ "compareRef": "main", "attributionShas": ["abc123", "def456"], "title": "Squash Attribution" }
EOF
```

**Get current comparison**:
```
$COMPARE_CLI get
```

**Clear comparison**:
```
$COMPARE_CLI clear
```

## Card Repository

Each card is an isolated Git repository. The `repositoryPath` field from `$CARD_CLI <id>`
gives the absolute path to this repository.

### Commit History API

`GET /cards/:id/git/log` returns an array of commit objects representing the card repository's full commit history. `GET /cards/:id/snapshot` returns the same commit array alongside current file contents.

Each commit's `diff.files` array contains `CardCommitFile` records:

| Field | Type | Description |
|-------|------|-------------|
| `file` | `string` | Relative path within the card repository |
| `status` | `string` | Git status: `A` (added), `M` (modified), `D` (deleted), `R` (renamed), `C` (copied) |
| `from` | `string?` | Source path for renames (present when status starts with `R`) |
| `binary` | `boolean` | `true` for binary files (no text diff available) |

### File Read/Write Endpoints

`GET /cards/:id/fs/:path` returns the raw content of any file in the card repository, addressed by its relative path (e.g., `GET /cards/:id/fs/PLAN.md`). Supports an optional `?sha=<commitSha>` query parameter to read a specific version.

`PUT /cards/:id/fs/:path` writes content to a file in the card repository. Only `.md` and `.md.meta.json` paths are accepted; path traversal (`..`) is rejected. The body is a JSON-encoded string. The server stages and commits the change automatically.

### Workspace-Scoped Endpoints

When the server manages multiple workspace folders, several endpoints accept an optional `workspacePath` query parameter to resolve per-workspace settings (environments). If `workspacePath` is provided but the workspace is not registered, the endpoint returns `400` (fail-closed).

| Endpoint | Resolution |
|----------|------------|
| `GET /environments` | Settings loader (environment definitions) |
| `GET /cards/:id/schema` | Settings loader (environment schema) |
| `POST /cards/:cardId/streams/:streamType/:filename` | Settings loader (stream transforms) |

Usage: append `?workspacePath=/absolute/path/to/workspace` to any of the above.

### Internal Endpoints

`POST /internal/register-workspace` registers an additional workspace folder for per-workspace settings resolution. Called by the extension lifecycle when VS Code opens multiple workspace folders.

Request body:
```json
{ "workspacePath": "/absolute/path/to/workspace" }
```

Returns `{ "success": true, "workspacePath": "..." }` on success. Returns `400` if `workspacePath` is missing, empty, or not an absolute path.

`POST /internal/validate-markdown` validates embedded content (e.g., mermaid diagrams) in markdown text. Returns structured validation errors for invalid syntax.

Request body:
```json
{ "content": "# Title\n\n```mermaid\nflowchart TD\n  A --> B\n```" }
```

Success response:
```json
{ "valid": true, "errors": [] }
```

Error response (400):
```json
{
  "error": "Markdown contains invalid embedded syntax",
  "code": "VALIDATION_ERROR",
  "requestId": "...",
  "fields": [{ "field": "mermaid:L3", "message": "mermaid syntax error: ..." }]
}
```

### Directory Layout

```
CARD.meta.json              # Metadata (source of truth)
CARD.md                     # Description (pure markdown, NO frontmatter)
CARD.md.meta.json           # Document sidecar (title)
PLAN.md                     # Optional plan document
PLAN.md.meta.json           # Document sidecar (title)
EVALUATION.md               # Optional evaluation rubric
comment/                    # Created on first comment
  {slug}.md                 # Descriptive semantic slug, pure markdown
attachment/                 # Created on first attachment
  att-{uuid4}_{name}        # Binary content
  att-{uuid4}_{name}.meta.json
```

`comment/` and `attachment/` directories do not exist until first use (lazy creation).

### CARD.meta.json

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

### Listing Repository Files

Authorship is determined by git commit ownership. List files in any card
repository directory chronologically with author and commit message:

```bash
REPO=$($CARD_CLI <card-id> | jq -r '.repositoryPath')
git -C "$REPO" log --reverse --diff-filter=A --format='%an: %s' --name-only -- comment/ \
  | awk 'NF{if(/^comment\//){print $0"  "prev}else{prev=$0}}'
```

Replace both occurrences of `comment/` with the target directory
(e.g., `attachment/`).

### Adding a Comment

Comments are pure markdown files with descriptive slug filenames.

```bash
REPO=$($CARD_CLI <card-id> | jq -r '.repositoryPath')
mkdir -p "$REPO/comment"
cat <<'COMMENT_EOF' > "$REPO/comment/my-slug-name.md"
Your comment content here (plain markdown, no frontmatter).
COMMENT_EOF
cd "$REPO" && git add "comment/my-slug-name.md" && git commit -m "Added comment [single sentence summarizing the comment's substance]."
```

### Adding an Attachment

Attachments use UUID4 identifiers with a sanitized original filename, plus a
`.meta.json` sidecar describing the file.

```bash
REPO=$($CARD_CLI <card-id> | jq -r '.repositoryPath')
ATT_UUID=$(cat /proc/sys/kernel/random/uuid)  # UUID4
ATT_NAME="att-${ATT_UUID}_screenshot.png"
mkdir -p "$REPO/attachment"
cp /path/to/file.png "$REPO/attachment/$ATT_NAME"
cat <<METAEOF > "$REPO/attachment/${ATT_NAME}.meta.json"
{
  "id": "$ATT_UUID",
  "name": "$ATT_NAME",
  "originalName": "screenshot.png",
  "size": $(stat -c%s "$REPO/attachment/$ATT_NAME"),
  "mimeType": "image/png"
}
METAEOF
cd "$REPO" && git add "attachment/$ATT_NAME" "attachment/${ATT_NAME}.meta.json" && git commit -m "Added attachment [single sentence describing what was attached and why]."
```

<card-status>
- **in_progress**: The agent is actively working on this card.
- **todo**: This card is ready for implementation.
- **needs_review**: This card is awaiting feedback from the user (includes plan approval and implementation review).
- **done**: The card is complete and needs no additional review.
- **backlog**: The card is still under consideration. Do not modify or work on cards in the backlog.
- **archived**: This card has been archived and is no longer in the active workflow.
</card-status>
