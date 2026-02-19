---
name: card-repo
description: Card repository reference
---

## Card Repository Reference

Each card is an isolated Git repository. All untracked files are automatically
removed (`git clean -fd`) after the session ends — commit everything that must persist.

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
  {filename}
  {filename}.meta.json
{typeName}/                 # Custom typed files
  {fileName}
  {fileName}.meta.json
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
    "reviewRequired": true,
    "reviewApproved": false
  },
  "isPinned": false,
  "order": 1,
  "repositoryId": "github.com/org/repo"
}
```

Validation rules for each field are in `references/validation.md`.

## CARD.md and Comments

All markdown files (`CARD.md`, `PLAN.md`, `comment/*.md`) are **pure markdown with
no YAML frontmatter**. Never wrap content in `---` delimiters.

Comment filenames must be UUIDv7 (RFC 9562), validated by the pre-commit hook.
UUIDv7 encodes a timestamp prefix, making comments chronologically sortable by filename.

```bash
export COMMENT_ID=$($NODE `! echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
cat <<'COMMENT' > comment/$COMMENT_ID.md
[COMMENT CONTENT]
COMMENT
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

## Custom Typed Files

Typed files live in directories named by type (e.g., `contract/invoice.json`).
Type definitions come from `.cards/settings.json`.

- Type names match `/^[a-z][a-z0-9-]*$/`
- Reserved names: `attachment`, `comment`, `cards`, `api`, `internal`, `health`, `ws`, `schema`
- Each typed file gets a `.meta.json` sidecar after validation


See `references/custom-types.md` for type configuration, validator protocol, and
sidecar schema.

## Pre-commit Hook

The pre-commit hook validates all staged changes and **fails-closed** (exit 1) on
any validation error:

1. Validates `CARD.meta.json` schema and field constraints
2. Validates comment filenames are UUIDv7
3. Runs external validators for typed files and creates `.meta.json` sidecars
4. Validates attachment references in `CARD.md` against `attachment/` contents

Commits that fail validation are rejected. The `.meta.json` sidecars created during
validation are automatically staged by the hook.

## Streams

Streams are append-only JSONL files in `streams/`. Each stream has a `.meta.json`
sidecar tracking `filename`, `streamType`, `status`, `lineCount`, and optional
`title` and `sessionId`.

Stream statuses: `active`, `completed`, `error`, `interrupted`, `size_limit`, `recovered`.

## Additional Resources

### Reference Files

For detailed schemas and validation rules, consult:

- **`references/validation.md`** - Field constraints, status values, tag patterns, gate logic
- **`references/custom-types.md`** - Type configuration, validator protocol, sidecar metadata
