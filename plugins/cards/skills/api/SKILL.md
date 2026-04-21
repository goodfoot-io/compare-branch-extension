---
name: api
description: Create, read, or interact with a card.
---

# Cards API

Use the CLI binaries below to manage cards and send notifications. For direct
card content operations (comments, attachments, plans), use the card's
filesystem repository — see Card Repository below.

The user is notified when you create a card or add a comment.

## Card Type References

Before creating a card, load the `cards:markdown` skill and both references for the matched card type. Two references load together:
- An **interview** guide describing how to reach enough signal for the card.
- A **writing** guide describing the target CARD.md structure.

Determine the card type using the first matching signal:

| Card type | Interview (process) | Writing (target) |
|-----------|---------------------|------------------|
| Bug, error, crash, regression, broken behavior | `./references/interview-bug-report.md` | `./references/bug-report.md` |
| Feature, improvement, new capability | `./references/interview-enhancement.md` | `./references/enhancement.md` |
| Research, spike, unknown root cause, feasibility | `./references/interview-investigation.md` | `./references/investigation.md` |
| Documentation, guides, runbooks, API reference | `./references/interview-documentation.md` | `./references/documentation.md` |
| Refactor, cleanup, tech debt, upgrade, migration | `./references/interview-maintenance.md` | `./references/maintenance.md` |
| Infrastructure, CI/CD, deploy, monitoring, scaling | `./references/interview-operations.md` | `./references/operations.md` |
| Otherwise | `./references/interview-enhancement.md` | `./references/enhancement.md` |

Run the interview first. When enough signal has been gathered, invoke the `card create` flow below and compose CARD.md against the writing guide in the same initial commit. The interview is not optional — every card created through this skill goes through it.

## CLI Binaries

The commands below are plugin-provided executables on `PATH`. Invoke them directly as bare commands. They replace the older env-var-based CLI indirection used in Claude-oriented skills, which no longer exists.

| Command | Purpose |
|---------|---------|
| `card` | Card operations (get, create, list, attach, detach, action) |
| `cards-extension notify` | Send notifications to the VS Code UI |
| `cards-extension attribution` | Manage the attribution tree comparison mode |

### `card` — Card operations

#### Commands

**Get a card** — Fetch card details by ID. The response includes `repositoryPath` for filesystem access:
```
card <card-id>
```

The response includes:
- `isMerged: boolean | null` — `true` when all workspace commits are merged into the viewer's HEAD, `false` when commits exist but are not merged, `null` when the card has no workspace commits.
- `parentBranch` — the workspace branch the card was created from; present when the card was created in a workspace with a resolvable branch.

**Create a card** — Pipe JSON to stdin with `title` (required). Optional: `tags`, `environment`, `gates`, `relations`:
```
card create <<'EOF'
{ "title": "Fix auth", "tags": ["bug"] }
EOF
```

The response includes `repositoryPath`. After creation:

1. Load the `cards:markdown` skill before writing CARD.md.
2. Write card content and commit:

```bash
REPO=$(card create <<'EOF' | jq -r '.repositoryPath'
{ "title": "Fix auth", "tags": ["bug"] }
EOF
)
cat <<'CARD_EOF' > "$REPO/CARD.md"
Card description here (plain markdown, no frontmatter).
CARD_EOF
cd "$REPO" && git add CARD.md && git commit -m "Added description [single sentence summarizing the current and desired behavior covered]."
```

3. Load the `cards:notes` skill and record research discoveries — including any approach that emerged — as notes in the card repository. Planning happens in a later step; do not write `plan/` files at creation time.

Include `relations` at creation time when the new card has a known relationship to an existing card. Each entry has a `type` (only `"related"` is valid) and a `cardId` referencing the target card. Relations can only be set at creation time via the CLI; to modify relations after creation, edit `CARD.meta.json` directly in the card repository.

```
card create <<'EOF'
{ "title": "Unify tag layout", "relations": [{ "type": "related", "cardId": "main-67" }] }
EOF
```



**Search cards** — Search cards using a unified query syntax with `#tag`, `@relation`, and free text:
```
card search "login bug"
card search "#auth @main-5 login" --status active
card search "#planning" --limit 20
card search "@main-42"
```

The query is parsed into free text, `#tag` tokens, and `@relation` tokens. Stored tags and text (3+ chars) are sent to the server. Derived tags (`planning`, `merge-requested`, `merged`, `unmerged`) and relation filters are applied client-side.

The response uses a flattened `CardListSummary` schema (gates as top-level booleans, no commit fields) rather than the full `Card` schema returned by `list`.

Options: `--workspace-path <path>`, `--status <status>`, `--limit <n>`, `--offset <n>`

#### Workspace Path

The CLI auto-detects the workspace from `pwd`. Cards are scoped to the branch you're working on — in a worktree, the card belongs to that worktree's branch (e.g., branch `feature` -> prefix `feature-`).

Use `--workspace-path` only if the user explicitly requests creating a card in a different repository.

**Execute an action** — Execute an action on a card via the server relay:
```
card <card-id> action <action-id>
```
The action ID is the lowercase identifier from the action definition (e.g., `launch`). Requires a connected extension client.

**Watch for commits** — Block until the next unattributed commit on a card's repository:
```
card <card-id> watch
card <card-id> watch "src/auth/**"
card <card-id> watch "src/auth/**" "tests/auth/**"
```
Blocks until the first eligible commit, outputs formatted commit details, attributes the commit to the current session, then exits 0. When unattributed commits already exist at invocation time, they are output immediately without subscribing. Optional glob patterns restrict output to commits where at least one changed file matches; multiple globs are OR-combined. Requires an active card session (`card attach` must have been called). Exits non-zero on connection failure or missing session.

### `cards-extension notify` — Send notifications

Send a notification to the VSCode UI.

```
cards-extension notify --type info --title "Build complete" --message "All tests pass" --source my-agent
cards-extension notify --type warning --title "Slow query" --message "Query took 5s" --source db-monitor
cards-extension notify --type error --title "Deploy failed" --message "Exit code 1" --source ci
```

Required: `--type` (error|warning|info), `--title`, `--message`, `--source`

### `cards-extension attribution` — Compare operations

Manage the attribution tree comparison mode. One active comparison per server.

#### Commands

**Set comparison** — Pipe a JSON request to stdin. Three shapes are supported. All three accept an optional `"title"` field; when present, the title overrides the derived ref-based title in the attribution tree view sidebar.

Branch range — compare two arbitrary refs:
```
cards-extension attribution set <<'EOF'
{ "baseRef": "main", "compareRef": "feature-branch", "title": "My Comparison" }
EOF
```

Dynamic worktree — track a worktree's HEAD live:
```
cards-extension attribution set <<'EOF'
{ "baseRef": "main", "repositoryPath": "/workspace/.worktrees/cards/main-4/1", "title": "Card Changes" }
EOF
```

Fixed attribution — show pre-computed SHAs against a ref:
```
cards-extension attribution set <<'EOF'
{ "compareRef": "main", "attributionShas": ["abc123", "def456"], "title": "Squash Attribution" }
EOF
```

**Get current comparison**:
```
cards-extension attribution get
```

**Clear comparison**:
```
cards-extension attribution clear
```

## Card Repository

Each card is an isolated Git repository. The `repositoryPath` field from `card <id>`
gives the absolute path to this repository.

### Directory Layout

```
CARD.meta.json              # Metadata (source of truth)
CARD.md                     # Description (pure markdown, NO frontmatter)
plan/                       # Plan documents (continuation-based)
  [name].md                 # Semantically-named plan files
  [name].md.meta.json       # Sidecar with display title
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

### Adding a Comment

Comments are pure markdown files with descriptive slug filenames. Authorship is determined by git commit ownership.

```bash
REPO=$(card <card-id> | jq -r '.repositoryPath')
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
REPO=$(card <card-id> | jq -r '.repositoryPath')
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
