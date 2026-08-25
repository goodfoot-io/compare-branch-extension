---
name: cards
description: You must load this skill whenever the user asks to create, read, comment on, or modify a card
---

# Cards

Use the CLI binary below to manage cards. For direct card content operations
(comments, attachments, plans), use the card's filesystem repository — see
Card Repository below.

For controlling VS Code (opening files, running commands, sending notifications,
managing panels, controlling the debugger, etc.), load `./references/extension-cli.md`.

For launching individual cards to implement the work they describe, load `./references/launch-cards.md`.

To file a GitHub issue with the Cards extension developer, use `cards-extension issue`
(see `./references/extension-cli.md`).

The user is notified when you create a card or add a comment.

## Card Type References

Before creating a card, load the `$markdown` skill, `./references/commanders-intent.md`, and both references for the matched card type. Two references load together:
- An **interview** guide describing how to reach enough signal for the card.
- A **writing** guide describing the target CARD.md structure.

Route by the card's deliverable — what the user wants to exist when the work is done — not by surface wording. A feasibility or research question embedded in a request for a concrete change is yours to resolve (Glob/Grep/Read/git/web): answer it, fold the finding into scoping, and route by the change. When the deliverable is ambiguous, confirm in plain language what the card will do before creating it — never name the card type to the user.

Match the first applicable row:

| Card type | Interview (process) | Writing (target) |
|-----------|---------------------|------------------|
| Bug, error, crash, regression, broken behavior | `./references/interview-bug-report.md` | `./references/bug-report.md` |
| Feature, improvement, new capability | `./references/interview-enhancement.md` | `./references/enhancement.md` |
| Research the user explicitly asks to capture as a card, or too large to resolve in one session | `./references/interview-investigation.md` | `./references/investigation.md` |
| Documentation, guides, runbooks, API reference | `./references/interview-documentation.md` | `./references/documentation.md` |
| Refactor, cleanup, tech debt, upgrade, migration | `./references/interview-maintenance.md` | `./references/maintenance.md` |
| Infrastructure, CI/CD, deploy, monitoring, scaling | `./references/interview-operations.md` | `./references/operations.md` |
| Otherwise | `./references/interview-enhancement.md` | `./references/enhancement.md` |

Run the interview when creating a card interactively with a user: gather enough signal, then invoke the `cards create` flow below and compose CARD.md against the writing guide in the same initial commit. Skip the interview when the user asks to capture something quickly, or when another workflow dispatches here to record an issue it hit — create the card directly from what you already know, still composing CARD.md against the matching writing guide.

## `cards` CLI

`cards` is a plugin-provided executable on `PATH` covering get, create, list, search, bind, action, and watch. Invoke it directly as a bare command.

**Get a card** — Fetch card details by ID. The response includes `repositoryPath` for filesystem access:
```
cards <card-id>
```

Also included:
- `isMerged: boolean | null` — `true` when all workspace commits are merged into the viewer's HEAD, `false` when commits exist but are not merged, `null` when the card has no workspace commits.
- `parentBranch` — the workspace branch the card was created from; present when the card was created in a workspace with a resolvable branch.

**Create a card** — Pipe JSON to stdin with `title` (required). Optional: `tags`, `environment`, `gates`, `relations`. Capture `repositoryPath`; every step below writes into it:

```bash
REPO=$(cards create --jsonpath '$.repositoryPath' <<'EOF'
{ "title": "Fix auth", "tags": ["bug"] }
EOF
)
```

Then, in order:

1. Load the `$markdown` skill before writing CARD.md.
2. When the card has something worth rendering — a mockup, diagram, data model, flow, or comparison of options — author an HTML page and commit its `.html`/`.meta.json` pair in a commit of its own; load `$html-files` for mechanics and `$design` for styling. Timeline position follows commit order: commit before CARD.md to open the card with a hero the reader takes in first, after CARD.md to elaborate what the description lays out.

```bash
cards html check "$REPO/proposed-panel.html"
cd "$REPO" && git add proposed-panel.html proposed-panel.meta.json && git commit -m "Added HTML page [single sentence describing what the page shows]."
```

3. Write CARD.md and commit:

```bash
cat <<'CARD_EOF' > "$REPO/CARD.md"
Card description here (plain markdown, no frontmatter).
CARD_EOF
cd "$REPO" && git add CARD.md && git commit -m "Added description [single sentence summarizing the current and desired behavior covered]."
```

4. Load the `$notes` skill and record research discoveries — including any approach that emerged — as notes in the card repository. Planning happens in a later step; do not write `plans/` files at creation time.

Include `relations` when the new card relates to an existing one. Each entry has a `type` (only `"related"` is valid) and a `cardId`. The CLI sets relations only at creation; edit `CARD.meta.json` afterward.

```
cards create <<'EOF'
{ "title": "Unify tag layout", "relations": [{ "type": "related", "cardId": "main-67" }] }
EOF
```

**Bind a card to a worktree** — Attach an existing card to the current linked worktree:
```
cards <card-id> bind
cards <card-id> bind --parent-branch <ref>
```

Binding installs hooks, registers the worktree branch with the card, and enables session streaming. The command succeeds only if:
- You are in a linked worktree (not the main repository)
- The worktree has no existing card bound to it
- The card exists and is accessible
- A parent branch can be resolved (checked in order: `branch.<name>.cardsParent` git config, reflog decoration, `--parent-branch` flag, then refuses)

Outputs card-repo-log and workspace-repo-log context blocks to stdout (no env block). If the transcript path cannot be resolved, binding succeeds with a stderr streaming-disabled warning.

**Search cards** — Search cards using a unified query syntax with `#tag`, `@relation`, and free text:
```
cards search "login bug"
cards search "#auth @main-5 login" --status active
cards search "#planning" --limit 20
cards search "@main-42"
```

Free text matches at 3+ chars. Beyond stored tags, four derived tags are filterable: `planning`, `merge-requested`, `merged`, `unmerged`.

Search responses are flattened — gates are top-level booleans and commit fields are absent.

Options: `--workspace-path <path>`, `--status <status>`, `--limit <n>`, `--offset <n>`

**Execute an action** — Execute an action on a card via the server relay:
```
cards <card-id> action <action-id>
cards <card-id> action <action-id> --background
cards <card-id> action <action-id> --background --exit-when-done
```
The action ID is the lowercase identifier from the action definition (e.g., `launch`). Requires a connected extension client.

Actions run interactively by default. `--background` is rejected with a 400 error for an action that does not support background mode. `--exit-when-done` signals the agent to exit cleanly once the action completes rather than leaving the session open.

**Signal shutdown** — From inside a running action, tell Cards the agent reached a terminal state (after a merge, after recording a blocker, after all tasks complete). Check `EXIT_WHEN_DONE` first; if true, finish or roll back in-progress commits, then:
```
cards "$CARD_ID" shutdown --outcome success|blocked|error [--message "..."]
```
Outcome defaults to `success`. Exit 0 confirms delivery; the handler terminates the session gracefully and the card still settles on `needs_review`. Without `SOCKET_PATH` the command exits non-zero — it only works inside an action.

**Watch for commits** — Block until the next unattributed commit on a card's repository:
```
cards <card-id> watch
cards <card-id> watch "src/auth/**"
cards <card-id> watch "src/auth/**" "tests/auth/**"
```
Blocks until the first eligible commit, outputs formatted commit details, attributes the commit to the current session, then exits 0. When unattributed commits already exist at invocation time, they are output immediately without subscribing. Optional glob patterns restrict output to commits where at least one changed file matches; multiple globs are OR-combined. Requires an active card session. Exits non-zero on connection failure or missing session.

### Workspace Path

The CLI auto-detects the workspace from `pwd`. Cards are scoped to the branch you're working on — in a worktree, the card belongs to that worktree's branch (e.g., branch `feature` -> prefix `feature-`).

Use `--workspace-path` only if the user explicitly requests creating a card in a different repository.

## Card Repository

Each card is an isolated Git repository. The `repositoryPath` field from `cards <id>`
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

### Commits and Branches

The `commits/` and `branches/` directories are written by Cards infrastructure, not by hand. Produce a correctly-formatted entry only when a task explicitly requires it — otherwise leave these alone.

- **`commits/`** — one file per attributed commit. The filename is the full 40-character lowercase-hex SHA (`/^[0-9a-f]{40}$/`); the content is that SHA plus a single newline (`<sha>\n`). No `.patch`, CSV, or short-SHA forms — the pre-commit hook rejects them fail-closed with `commits/: invalid commit entry filename: <name>`.
- **`branches/`** — one file per tracked branch, named `<encodeURIComponent(name)>.json`. The authoritative branch `name` lives inside the file content, never decoded from the filename. The content is the persisted `WorkspaceBranch`: `parentBranch` and `addedAt` (ISO 8601), plus optional `worktree`. Never persist the read-time `BranchInfo` fields (`exists`, `isMerged`, `commits`).

Source of truth: `COMMITS_DIR`, `BRANCHES_DIR`, and `WorkspaceBranch` in `public/packages/sdk/src/protocol/types/branch.ts`.

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

`relations` is optional — omitted when the card has no outgoing relations.

### Adding a Comment

Comments are pure markdown files with descriptive slug filenames.

```bash
REPO=$(cards <card-id> --jsonpath '$.repositoryPath')
mkdir -p "$REPO/comments"
cat <<'COMMENT_EOF' > "$REPO/comments/my-slug-name.md"
Your comment content here (plain markdown, no frontmatter).
COMMENT_EOF
cd "$REPO" && git add "comments/my-slug-name.md" && git commit -m "Added comment [single sentence summarizing the comment's substance]."
```

### Adding an Attachment

Add relevant miscellaneous files (screenshots, logs, exports) as attachments whenever the user provides or references one during card creation or comments — don't just describe it in text. If only part of a screenshot is relevant, crop it to that portion before attaching.

```bash
REPO=$(cards <card-id> --jsonpath '$.repositoryPath')
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

## Worktree Path Policy

Worktree creation makes one authoritative path decision for every git-ignored path before provisioning:

- **Share (default)** — symlinked into the worktree; unmatched by both policy files.
- **Omit** — never provisioned; matched by `.worktreeignore` at the repo root.
- **Copy** — copied as a real file the agent can edit without touching the source; matched by `.worktreeinclude` at the repo root.

Use `.worktreeignore` for generated outputs that should not appear in the worktree (build artifacts, caches); use `.worktreeinclude` for git-ignored files the agent needs as editable copies (local env files, tool-managed lockfiles).

Rules:
- **Omit wins over copy** — a path matching both files is omitted.
- **Whole-dir omission** — a file-level `.worktreeignore` pattern under a fully-ignored directory removes the whole directory from the worktree (a symlinked directory cannot be partially omitted); use a copy rule for the file if the rest of the directory must remain.
- **Package-interior omit rules** — in a workspaces repo, a rule targeting a path inside a `node_modules` package keeps the package usable: the package becomes a real directory with the ruled path absent and its other files symlinked, so writes at the ruled path cannot reach the source.
- **Gitignore-style patterns** — comments (`#`), negation (`!`), directory patterns (`dir/`); directory patterns cover descendants.
- **Copy prevents ancestor symlinks** — a copy rule for `dist/bundle.js` under an ignored `dist/` prevents the `dist` symlink and copies only the selected files into a real directory; unmatched siblings stay absent.
- **Regenerated per creation** — the policy is re-evaluated on every worktree creation; config edits take effect on the next materialization.
- **Fail closed** — an unreadable or invalid `.worktreeignore`/`.worktreeinclude` stops creation before any matching path is linked (`create-worktree` exits 3).
- **Enumeration is deadline-bounded** — the policy's git scans and filesystem walks fail closed after `CARDS_WORKTREE_POLICY_TIMEOUT_MS` (default 30000); raise it for huge trees or slow filesystems when the error names the variable.

<card-status>
- **todo**: This card is ready for implementation.
- **active**: The agent is actively working on this card. Set automatically when an action handler starts; do not set directly.
- **needs_review**: This card is awaiting feedback from the user (includes plan approval and implementation review). Set automatically when an action handler exits; do not set directly.
- **done**: The card is complete and needs no additional review.
- **archived**: This card has been archived and is no longer in the active workflow.
</card-status>
