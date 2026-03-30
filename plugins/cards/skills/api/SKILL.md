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

Before writing a card's description (CARD.md), load the reference that matches the user's request. References are located at `${CLAUDE_PLUGIN_ROOT}/skills/api/references/`.

Determine the card type using the first matching signal:
- **Bug, error, crash, regression, broken behavior**: `bug-report.md`
- **Feature, improvement, new capability**: `enhancement.md`
- **Research, spike, unknown root cause, feasibility**: `investigation.md`
- **Documentation, guides, runbooks, API reference**: `documentation.md`
- **Refactor, cleanup, tech debt, upgrade, migration**: `maintenance.md`
- **Infrastructure, CI/CD, deploy, monitoring, scaling**: `operations.md`
- **Otherwise**: `enhancement.md`

Read the matched reference file, then follow its guidance to compose the card's CARD.md content.

## CLI Binaries

### card.mjs — Card operations

#### Commands

**Get a card** — Fetch card details by ID. The response includes `repositoryPath` for filesystem access:
```
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs <card-id>
```

The response includes `isMerged: boolean | null` — `true` when all workspace commits are merged into the viewer's HEAD, `false` when commits exist but are not merged, `null` when the card has no workspace commits.

**Create a card** — Pipe JSON to stdin with `title` (required). Optional: `description` (written as CARD.md), `plan` (written as PLAN.md), `evaluation` (written as EVALUATION.md), `tags`, `environment`, `gates`, `relations`:
```
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs create <<'EOF'
{ "title": "Fix auth", "description": "Token refresh fails", "tags": ["bug"] }
EOF
```

When `description`, `plan`, or `evaluation` are provided, the CLI writes them to the card repository as separate files (CARD.md, PLAN.md, EVALUATION.md) after creation via the generic file write endpoint.

Include `relations` at creation time when the new card has a known relationship to an existing card. Each entry has a `type` (only `"related"` is valid) and a `cardId` referencing the target card. Relations can only be set at creation time via the CLI; to modify relations after creation, edit `CARD.meta.json` directly in the card repository.

```
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs create <<'EOF'
{ "title": "Unify tag layout", "description": "...", "relations": [{ "type": "related", "cardId": "main-67" }] }
EOF
```

**List cards** — List cards for the current workspace. Detects workspace path from git automatically:
```
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs list
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs list --status in_progress
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs list --tag bug --tag feature
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs list --search "auth" --status todo
```

Options: `--workspace-path <path>`, `--status <status>`, `--tag <tag> (repeatable; tags are OR-combined)`, `--search <query>`, `--limit <n>`, `--offset <n>`

#### Workspace Path

The CLI auto-detects the workspace from `pwd`. Cards are scoped to the branch you're working on — in a worktree, the card belongs to that worktree's branch (e.g., branch `feature` → prefix `feature-`). This is the default and usually what you want.

Only use `--workspace-path` if the user explicitly requests creating a card in a different repository.

**Attach a session** — Associate this Claude session with a card. Registers the workspace branch and flushes any pending commits:
```
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs attach <card-id>
```
Always call `attach` before your first code change on a card. This establishes commit attribution.

**Detach a session** — Disassociate this Claude session from its card:
```
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs detach
```

**Execute an action** — Execute an action on a card via the server relay:
```
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs <card-id> action <action-id>
```
The action ID is the lowercase identifier from the action definition (e.g., `launch`). Requires a connected extension client.

### notification.mjs — Send notifications

Send a notification to the VSCode UI.

```
node ${CLAUDE_PLUGIN_ROOT}/bin/notification.mjs --type info --title "Build complete" --message "All tests pass" --source my-agent
node ${CLAUDE_PLUGIN_ROOT}/bin/notification.mjs --type warning --title "Slow query" --message "Query took 5s" --source db-monitor
node ${CLAUDE_PLUGIN_ROOT}/bin/notification.mjs --type error --title "Deploy failed" --message "Exit code 1" --source ci
```

Required: `--type` (error|warning|info), `--title`, `--message`, `--source`

### uuid7.mjs — Generate UUIDv7

Generates a UUIDv7 identifier (RFC 9562).

```bash
UUID=$(node ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
```

### compare.mjs — Compare operations

Manage the attribution tree comparison mode. One active comparison per server.

#### Commands

**Set comparison** — Pipe a JSON request to stdin. Three shapes are supported. All three accept an optional `"title"` field; when present, the title overrides the derived ref-based title in the attribution tree view sidebar.

Branch range — compare two arbitrary refs:
```
node ${CLAUDE_PLUGIN_ROOT}/bin/compare.mjs set <<'EOF'
{ "baseRef": "main", "compareRef": "feature-branch", "title": "My Comparison" }
EOF
```

Dynamic worktree — track a worktree's HEAD live:
```
node ${CLAUDE_PLUGIN_ROOT}/bin/compare.mjs set <<'EOF'
{ "baseRef": "main", "repositoryPath": "/workspace/.worktrees/cards/main-4/1", "title": "Card Changes" }
EOF
```

Fixed attribution — show pre-computed SHAs against a ref:
```
node ${CLAUDE_PLUGIN_ROOT}/bin/compare.mjs set <<'EOF'
{ "compareRef": "main", "attributionShas": ["abc123", "def456"], "title": "Squash Attribution" }
EOF
```

**Get current comparison**:
```
node ${CLAUDE_PLUGIN_ROOT}/bin/compare.mjs get
```

**Clear comparison**:
```
node ${CLAUDE_PLUGIN_ROOT}/bin/compare.mjs clear
```

## Card Repository

Each card is an isolated Git repository. The `repositoryPath` field from `card.mjs <id>`
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

When the server manages multiple workspace folders, several endpoints accept an optional `workspacePath` query parameter to resolve per-workspace settings (environments, typed file schemas). If `workspacePath` is provided but the workspace is not registered, the endpoint returns `400` (fail-closed).

| Endpoint | Resolution |
|----------|------------|
| `GET /environments` | Settings loader (environment definitions) |
| `GET /cards/:id/schema` | Settings loader (environment schema) |
| `GET /cards/:id/:typeName` | Types config (typed file validators) |
| `GET /cards/:id/:typeName/:fileName` | Types config (typed file validators) |
| `POST /cards/:cardId/streams/:streamType/:filename` | Settings loader (stream transforms) |

Usage: append `?workspacePath=/absolute/path/to/workspace` to any of the above.

### Internal Endpoints

`POST /internal/register-workspace` registers an additional workspace folder for per-workspace settings resolution. Called by the extension lifecycle when VS Code opens multiple workspace folders.

Request body:
```json
{ "workspacePath": "/absolute/path/to/workspace" }
```

Returns `{ "success": true, "workspacePath": "..." }` on success. Returns `400` if `workspacePath` is missing, empty, or not an absolute path.

### Directory Layout

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
REPO=$(node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs <card-id> | jq -r '.repositoryPath')
git -C "$REPO" log --reverse --diff-filter=A --format='%an: %s' --name-only -- comment/ \
  | awk 'NF{if(/^comment\//){print $0"  "prev}else{prev=$0}}'
```

Replace both occurrences of `comment/` with the target directory
(e.g., `attachment/`, `note/`, `adaptive-card/`).

### Adding a Comment

Comments are pure markdown files with descriptive slug filenames.

```bash
REPO=$(node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs <card-id> | jq -r '.repositoryPath')
mkdir -p "$REPO/comment"
cat <<'COMMENT_EOF' > "$REPO/comment/my-slug-name.md"
Your comment content here (plain markdown, no frontmatter).
COMMENT_EOF
cd "$REPO" && git add "comment/my-slug-name.md" && git commit -m "Add comment"
```

### Adding an Attachment

Attachments use UUID4 identifiers with a sanitized original filename, plus a
`.meta.json` sidecar describing the file.

```bash
REPO=$(node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs <card-id> | jq -r '.repositoryPath')
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
cd "$REPO" && git add "attachment/$ATT_NAME" "attachment/${ATT_NAME}.meta.json" && git commit -m "Add attachment"
```

<card-status>
- **in_progress**: The agent is actively working on this card.
- **todo**: This card is ready for implementation.
- **needs_review**: This card is awaiting feedback from the user (includes plan approval and implementation review).
- **done**: The card is complete and needs no additional review.
- **backlog**: The card is still under consideration. Do not modify or work on cards in the backlog.
- **archived**: This card has been archived and is no longer in the active workflow.
</card-status>
