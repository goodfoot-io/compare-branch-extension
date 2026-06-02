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


## Directory Layout

```
CARD.meta.json              # Metadata (source of truth)
CARD.md                     # Description (pure markdown, NO frontmatter)
plan/                       # Plan documents (continuation-based)
  [name].md                 # Semantically-named plan files
  [name].md.meta.json       # Sidecar with display title
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

## CARD.md and plan/

- **`CARD.md`** is the *description*: what's happening, what's needed, and why it matters.
  Content varies by card type — a bug report describes the defect, an enhancement describes
  the capability gap, an investigation describes the unknown. Written by the card creator
  (human or agent). Stable once the card is understood.
- **`plan/`** contains the *approach*: how the card's action will be performed and for what
  purpose (commander's intent). Each plan file (`plan/[name].md`) is a continuation document
  with its own sidecar (`plan/[name].md.meta.json`), appearing as a separate timeline entry.
  Adding a new plan file resets `planApproved` to false. Written by the implementing agent
  or alongside CARD.md when the approach is clear at creation time. Subject to revision and
  approval via the `planRequired`/`planApproved` gates.

Both are pure markdown with no YAML frontmatter. Never wrap content in `---` delimiters.


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


## Sessions

Session transcripts are append-only NDJSON streams in `streams/**/`.

<markdown-guidelines>

Guidance for markdown another agent or person will read and act on.

**Link code references instead of naming them.** When prose names a file, symbol, type, or config that exists in the codebase, make it a fragment link to its definition rather than a backtick span: `[validateSession()](./src/auth/session.ts#L15)`, not `validateSession`. A linked reference is navigable; a bare name makes the reader search for it. Add a line or range — `#L42`, `#L42-L58` — when the exact location matters. Paths resolve from the project root, not from the file the markdown lives in; leave non-code paths and external URLs as plain text.

**Diagram structure; narrate everything else.** Reach for a fenced `mermaid` block only when relationships are the point — multi-component flows, state transitions, decision trees. Prefer prose when the reasoning, not the shape, carries the meaning.

**Fold away digressions.** Wrap long supporting detail — error dumps, logs, optional context — in `<details><summary>…</summary>`, leaving a blank line after the summary so the body renders. The narrative stays readable and the detail stays one click away.

</markdown-guidelines>

<card-repo-commit-style>
### Card Repository Commits

A card-repository commit message is one sentence summarizing what the commit *contributes* — the substance of the comment, plan, or note it adds — so an agent scanning `git log --oneline` grasps each commit without opening it. Summarize the point, not the action ("added a comment") or a list of changed files.

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

Commits to the workspace follow the distinct `<workspace-commit-style>`.
</card-repo-commit-style>

<workspace-commit-style>
### Workspace Repository Commits

A workspace commit is the narrative layer of history — written so someone reading `git log` later understands not just *what* changed but *why* and *how*. Be rich by default: a substantive change earns a substantive message, and the body is where the reasoning lives.

**Body — 2–5 paragraphs, following this arc:**
- **Hook** — one plain sentence naming the change, then why it matters in the wider system.
- **Problem** — the deficiency or pressure that prompted it; the "before" picture.
- **Journey** (substantial changes) — alternatives weighed, why this one won, the dead ends. This is the heart of the message — what makes it worth reading.
- **Solution** — what was built, told through *design and tradeoffs*, not a file inventory.
- **Future** (large changes) — what it unlocks, what's left, guidance for whoever comes next.

**Scale to the change:** a small fix is a subject line; a feature is 2–3 paragraphs (problem → approach → solution); a milestone is the full arc above. Don't inflate a typo fix or flatten a redesign.

**Craft:** continuous prose, never hard-wrapped to a column width. Fragment-link every named file, function, and type per `<markdown-guidelines>`. Include a genuine insight when one surfaced — a surprise, an irony, a lesson you'd want at 2am debugging — and omit it rather than manufacture profundity. When synthesizing subagent reports, weave one story from what changed and what was learned, not a list of who did what.

</workspace-commit-style>