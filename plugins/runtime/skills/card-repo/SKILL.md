---
name: card-repo
description: Card repository reference
---

# Card Repository Reference

Each card is an isolated Git repository. All untracked files are automatically
removed (`git clean -fd`) after the session ends — commit everything that must persist.

## Directory Layout

```
CARD.meta.json              # Metadata (source of truth)
CARD.md                     # Description (pure markdown, NO frontmatter)
PLAN.md                     # Optional plan document
workspace-commit-shas.csv   # Attributed workspace commit SHAs (one per line)
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

Comment filenames must be UUIDv7 (RFC 9562), validated by the pre-commit hook:

```
Pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/
Example: 019371a2-d5c0-7b3a-8f1e-4a5b6c7d8e9f.md
```

UUIDv7 encodes a timestamp prefix, making comments chronologically sortable by filename.

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

```!
eval "$(${CLAUDE_PLUGIN_ROOT}/bin/discover-api.sh)" 2>/dev/null

if [ -n "$API_BASE" ] && [ -n "$ACCESS_TOKEN" ]; then
  # Find first available card to query type schemas
  CARD_ID=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$API_BASE/cards?workspacePath=$(pwd)&limit=1" | jq -r '.[0].id // empty' 2>/dev/null)
  if [ -n "$CARD_ID" ]; then
    echo "### Registered Type Schemas"
    echo ""
    curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$API_BASE/cards/$CARD_ID/schema" | jq -r '.types | to_entries[] | "**\(.key)** (v\(.value.version))\n- Schema: \(.value.schema // "not defined")\n- Description: \(.value.description // "not defined")\n"' 2>/dev/null
  else
    echo "No cards found in current workspace. Create a card to see registered type schemas."
  fi
else
  echo "API not available. Type schemas can be queried via \`GET /cards/{cardId}/schema\`."
fi
```

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
