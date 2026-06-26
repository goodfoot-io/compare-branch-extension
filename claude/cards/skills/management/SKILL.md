---
name: management
description: You must load this skill whenever the user asks to create, read, comment on, or modify a card
---

# Cards

Use the CLI binary below to manage cards. For direct card content operations
(comments, attachments, plans), use the card's filesystem repository — see
Card Repository below.

For controlling VS Code (opening files, running commands, sending notifications,
managing panels, controlling the debugger, etc.), load `./references/extension-cli.md`.

The user is notified when you create a card or add a comment.

## Card Type References

Before creating a card, load the `cards:markdown` skill, `./references/commanders-intent.md`, and both references for the matched card type. Two references load together:
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
| `card` | Card operations (get, create, list, search, bind, action, watch) |

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
REPO=$(card create --jsonpath '$.repositoryPath' <<'EOF'
{ "title": "Fix auth", "tags": ["bug"] }
EOF
)
cat <<'CARD_EOF' > "$REPO/CARD.md"
Card description here (plain markdown, no frontmatter).
CARD_EOF
cd "$REPO" && git add CARD.md && git commit -m "Added description [single sentence summarizing the current and desired behavior covered]."
```

3. Load the `cards:notes` skill and record research discoveries — including any approach that emerged — as notes in the card repository. Planning happens in a later step; do not write `plans/` files at creation time.

Include `relations` at creation time when the new card has a known relationship to an existing card. Each entry has a `type` (only `"related"` is valid) and a `cardId` referencing the target card. Relations can only be set at creation time via the CLI; to modify relations after creation, edit `CARD.meta.json` directly in the card repository.

```
card create <<'EOF'
{ "title": "Unify tag layout", "relations": [{ "type": "related", "cardId": "main-67" }] }
EOF
```

**Bind a card to a worktree** — Attach an existing card to the current linked worktree:
```
card <card-id> bind
card <card-id> bind --parent-branch <ref>
```

Binding installs hooks, registers the worktree branch with the card, and enables session streaming. The command succeeds only if:
- You are in a linked worktree (not the main repository)
- The worktree has no existing card bound to it
- The card exists and is accessible
- A parent branch can be resolved (checked in order: `branch.<name>.cardsParent` git config, reflog decoration, `--parent-branch` flag, then refuses)

The command outputs card-repo-log and workspace-repo-log context blocks to stdout (without the env block), so the calling agent immediately receives current card context. If transcript streaming is disabled (transcript path cannot be resolved), binding succeeds with a stderr warning and streaming-disabled notice.

Example:
```
$ cd my-worktree && card main-42 bind
card bind: warning: transcript path could not be resolved — session streaming is disabled for this bind.
$ git log --oneline -3
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
card <card-id> action <action-id> --background
card <card-id> action <action-id> --background --exit-when-done
```
The action ID is the lowercase identifier from the action definition (e.g., `launch`). Requires a connected extension client.

Actions run interactively by default. `--background` runs the action in the background instead; it is rejected with a 400 error for an action that does not support background mode. `--exit-when-done` signals the agent to exit cleanly once the action completes rather than leaving the session open.

**Watch for commits** — Block until the next unattributed commit on a card's repository:
```
card <card-id> watch
card <card-id> watch "src/auth/**"
card <card-id> watch "src/auth/**" "tests/auth/**"
```
Blocks until the first eligible commit, outputs formatted commit details, attributes the commit to the current session, then exits 0. When unattributed commits already exist at invocation time, they are output immediately without subscribing. Optional glob patterns restrict output to commits where at least one changed file matches; multiple globs are OR-combined. Requires an active card session. Exits non-zero on connection failure or missing session.

## Card Repository

Each card is an isolated Git repository. The `repositoryPath` field from `card <id>`
gives the absolute path to this repository.

### Directory Layout

```
CARD.meta.json              # Metadata (source of truth)
CARD.md                     # Description (pure markdown, NO frontmatter)
plans/                      # Plan documents (continuation-based)
  [name].md                 # Semantically-named plan files
  [name].md.meta.json       # Sidecar with display title
comments/                   # Created on first comment
  {slug}.md                 # Descriptive semantic slug, pure markdown
attachments/                # Created on first attachment
  att-{uuid4}_{name}        # Binary content
  att-{uuid4}_{name}.meta.json
commits/                    # One file per attributed commit (infra-managed)
  {sha}                     # Filename is the full 40-hex SHA; content is `<sha>\n`
branches/                   # One file per tracked branch (infra-managed)
  {encodeURIComponent(name)}.json
```

`comments/` and `attachments/` directories do not exist until first use (lazy creation).

### Commits and Branches

The `commits/` and `branches/` directories are written by Cards infrastructure, not by hand. Produce a correctly-formatted entry only when a task explicitly requires it — otherwise leave these alone.

- **`commits/`** — one file per attributed commit. The filename is the full 40-character lowercase-hex commit SHA (`/^[0-9a-f]{40}$/`); the content is that SHA followed by a single newline (`<sha>\n`). The card-repo pre-commit hook validates entries fail-closed and rejects any other filename with `commits/: invalid commit entry filename: <name>` (so no `.patch`, CSV, or short-SHA forms). Defined by `COMMITS_DIR` in `public/packages/sdk/src/protocol/types/branch.ts`.
- **`branches/`** — one file per tracked branch, named `<encodeURIComponent(name)>.json`. The authoritative branch `name` lives inside the file content, never decoded from the filename. The content is the persisted `WorkspaceBranch`: `parentBranch` and `addedAt` (ISO 8601), plus optional `worktree`. The computed `BranchInfo` fields (`exists`, `isMerged`, `commits`) are derived at read time and never persisted. Defined by `BRANCHES_DIR` and `WorkspaceBranch` in `public/packages/sdk/src/protocol/types/branch.ts`.

### CARD.meta.json

```json
{
  "id": "main-0001",
  "title": "Implement authentication",
  "status": "active",
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
REPO=$(card <card-id> --jsonpath '$.repositoryPath')
mkdir -p "$REPO/comments"
cat <<'COMMENT_EOF' > "$REPO/comments/my-slug-name.md"
Your comment content here (plain markdown, no frontmatter).
COMMENT_EOF
cd "$REPO" && git add "comments/my-slug-name.md" && git commit -m "Added comment [single sentence summarizing the comment's substance]."
```

### Adding an Attachment

Attachments use UUID4 identifiers with a sanitized original filename, plus a
`.meta.json` sidecar describing the file.

```bash
REPO=$(card <card-id> --jsonpath '$.repositoryPath')
ATT_UUID=$(cat /proc/sys/kernel/random/uuid)  # UUID4
ATT_NAME="att-${ATT_UUID}_screenshot.png"
mkdir -p "$REPO/attachments"
cp /path/to/file.png "$REPO/attachments/$ATT_NAME"
cat <<METAEOF > "$REPO/attachments/${ATT_NAME}.meta.json"
{
  "id": "$ATT_UUID",
  "name": "$ATT_NAME",
  "originalName": "screenshot.png",
  "size": $(stat -c%s "$REPO/attachments/$ATT_NAME"),
  "mimeType": "image/png"
}
METAEOF
cd "$REPO" && git add "attachments/$ATT_NAME" "attachments/${ATT_NAME}.meta.json" && git commit -m "Added attachment [single sentence describing what was attached and why]."
```

<card-status>
- **todo**: This card is ready for implementation.
- **active**: The agent is actively working on this card. Set automatically when an action handler starts; do not set directly.
- **needs_review**: This card is awaiting feedback from the user (includes plan approval and implementation review). Set automatically when an action handler exits; do not set directly.
- **done**: The card is complete and needs no additional review.
- **archived**: This card has been archived and is no longer in the active workflow.
</card-status>
