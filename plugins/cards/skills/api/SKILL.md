---
name: api
description: Manage cards in the VSCode "Cards" extension.
---

# Cards API

Use the CLI binaries below to manage cards and send notifications. For direct
card content operations (comments, attachments, plans), use the card's
filesystem repository — see Card Repository below.

The user is notified when you create a card or add a comment.

## Card Type References

Before writing a card's `description`, load the reference that matches the user's request. References are located at `${CLAUDE_PLUGIN_ROOT}/skills/api/references/`.

Determine the card type using the first matching signal:
- **Bug, error, crash, regression, broken behavior**: `bug-report.md`
- **Feature, improvement, new capability**: `enhancement.md`
- **Research, spike, unknown root cause, feasibility**: `investigation.md`
- **Documentation, guides, runbooks, API reference**: `documentation.md`
- **Refactor, cleanup, tech debt, upgrade, migration**: `maintenance.md`
- **Infrastructure, CI/CD, deploy, monitoring, scaling**: `operations.md`
- **Otherwise**: `enhancement.md`

Read the matched reference file, then follow its guidance to compose the card's `description` field.

## CLI Binaries

### card.mjs — Card operations

#### Commands

**Get a card** — Fetch card details by ID. The response includes `repositoryPath` for filesystem access:
```
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs <card-id>
```

**Create a card** — Pipe JSON to stdin with `title` (required) and `description` (required). Optional: `tags`, `environment`, `gates`:
```
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs create <<'EOF'
{ "title": "Fix auth", "description": "Token refresh fails", "tags": ["bug"] }
EOF
```

**List cards** — List cards for the current workspace. Detects workspace path from git automatically:
```
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs list
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs list --status in_progress
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs list --tag bug --limit 10
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs list --search "auth" --status todo
```

Options: `--workspace-path <path>`, `--status <status>`, `--tag <tag>`, `--search <query>`, `--limit <n>`, `--offset <n>`

#### Workspace Path

Without `--workspace-path`, the CLI runs `git rev-parse --show-toplevel` to detect the workspace. The detected path determines the branch used for card ID generation, which sets the card's ID prefix (e.g., branch `main` → prefix `main-`).

In a worktree, `--show-toplevel` resolves to the worktree path, so the CLI sees the worktree's branch (e.g., `dev` → prefix `dev-`). This is correct when the card is scoped to that branch's work. When the card should be scoped to the main repository instead, pass `--workspace-path` explicitly:

```bash
# git-common-dir resolves to the main repo's .git dir from any worktree
REPO_ROOT="$(realpath "$(git rev-parse --git-common-dir)/..")"
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs create --workspace-path "$REPO_ROOT" <<'EOF'
{ "title": "Lorem ipsum", "description": "Set dolore" }
EOF
```

**Start a session** — Associate this Claude session with a card. Registers the workspace branch and flushes any pending commits:
```
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs start <card-id>
```
Always call `start` before your first code change on a card. This establishes commit attribution.

**Stop a session** — Disassociate this Claude session from its card:
```
node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs stop
```

### notification.mjs — Send notifications

Send a notification to the VSCode UI.

```
node ${CLAUDE_PLUGIN_ROOT}/bin/notification.mjs --type info --title "Build complete" --message "All tests pass" --source my-agent
node ${CLAUDE_PLUGIN_ROOT}/bin/notification.mjs --type warning --title "Slow query" --message "Query took 5s" --source db-monitor
node ${CLAUDE_PLUGIN_ROOT}/bin/notification.mjs --type error --title "Deploy failed" --message "Exit code 1" --source ci
```

Required: `--type` (error|warning|info), `--title`, `--message`, `--source`

### uuid7.mjs — Generate UUIDv7

Generates a UUIDv7 identifier (RFC 9562). Used for comment filenames.

```bash
COMMENT_ID=$(node ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
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

### Directory Layout

```
CARD.meta.json              # Metadata (source of truth)
CARD.md                     # Description (pure markdown, NO frontmatter)
PLAN.md                     # Optional plan document
comment/                    # Created on first comment
  {uuidv7}.md               # Pure markdown, no frontmatter
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
    "reviewRequired": true,
    "reviewApproved": false
  },
  "isPinned": false,
  "order": 1,
  "repositoryId": "github.com/org/repo"
}
```

### Adding a Comment

Comments are pure markdown files with UUIDv7 filenames. The pre-commit hook
validates filenames and fails-closed on errors.

```bash
REPO=$(node ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs <card-id> | jq -r '.repositoryPath')
COMMENT_ID=$(node ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
mkdir -p "$REPO/comment"
cat <<'COMMENT_EOF' > "$REPO/comment/$COMMENT_ID.md"
Your comment content here (plain markdown, no frontmatter).
COMMENT_EOF
cd "$REPO" && git add "comment/$COMMENT_ID.md" && git commit -m "Add comment"
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
