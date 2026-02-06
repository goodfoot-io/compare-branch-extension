---
name: api
description: Create, read, and respond to cards related to this git branch.
---

# Cards API

Use the Cards API to communicate with the user about this git branch. The user will be notified when you create a card or add a comment.

<comments>
Use comments to ask the user for clarifications, to report error states, or to report completion.

**If you edit a file in the workspace while working on a card, you must include code references in the comment content using GitHub-style fragment links:**
- Single line: `[description](path/to/file.ts#L10)`
- Line range: `[description](path/to/file.ts#L10-L20)`
- Entire file: `[description](path/to/file.ts)`
</comments>

<card-status>
- **in_progress**: The agent is actively working on this card.
- **todo**: This card is ready for implementation.
- **needs_review**: This card is awaiting feedback from the user (includes plan approval and implementation review).
- **done**: The card is complete and needs no additional review.
- **backlog**: The card is still under consideration. Do not modify or work on cards in the backlog.
- **archived**: This card has been archived and is no longer in the active workflow.
</card-status>

<plan-approval>
When a card has `gates.planRequired: true`, present a plan for user approval before beginning implementation.

1. Store the plan: `PUT /cards/{cardId}/plan` with `{ "content": "..." }`
2. Add a comment with code references reviewed during planning
3. Wait for user approval before proceeding

The plan content is accessible via `GET /cards/{cardId}/plan`.
</plan-approval>

<reload-after-compaction>
You must reload this skill after compaction.
</reload-after-compaction>

<api>

```!
API_BASE=$(${CLAUDE_PLUGIN_ROOT}/bin/discover-api.sh)
echo "# API Base URL (port may change between sessions)"
echo "API_BASE=\"\$(${CLAUDE_PLUGIN_ROOT}/bin/discover-api.sh)\""
echo ""
echo "# Example: List all cards"
echo "curl -s \"\$API_BASE/cards\" | jq ."
```

## Endpoints

### Cards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards | List cards. Query: `workspacePath` (required), `status`, `tag`, `limit`, `offset`, `search` |
| POST | /cards | Create card. Body: `workspacePath` (required), `title` (required), `description` (required), `tags`, `gates`, `environmentName`, `order` |
| GET | /cards/{cardId} | Get card details |
| PATCH | /cards/{cardId} | Update card. Body: `title`, `status`, `tags`, `description`, `isPinned`, `order` |
| DELETE | /cards/{cardId} | Delete card |
| GET | /cards/{cardId}/has-updates | Check updates since timestamp. Query: `since` (ISO 8601) |

**Note:** Gate flags (`planApproved`, `reviewApproved`) are server-controlled and cannot be set directly via PATCH.

### Gate Approvals

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /cards/{cardId}/gates/plan/approve | Approve the plan gate |
| POST | /cards/{cardId}/gates/review/approve | Approve the review gate |

### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{cardId}/comments | List comments |
| POST | /cards/{cardId}/comments | Add comment. Body: `author` ("agent" or "user"), `content` (markdown) |
| PATCH | /cards/{cardId}/comments/{commentId} | Update comment. Body: `content` |
| DELETE | /cards/{cardId}/comments/{commentId} | Delete comment |

### Plan

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{cardId}/plan | Get plan content. Returns 404 if no plan exists |
| PUT | /cards/{cardId}/plan | Update plan. Body: `content` (markdown) |

### Commits

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{cardId}/commits | List commit attributions |
| POST | /cards/{cardId}/commits | Add commit. Body: `sha` (full 40-char), `repoPath` (optional) |
| DELETE | /cards/{cardId}/commits/{sha} | Remove commit attribution |

### Timeline

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{cardId}/timeline | Unified timeline (comments, commits, notes, cards). Query: `before`, `limit` |

### Attachments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{cardId}/attachments | List attachments |
| PUT | /cards/{cardId}/attachments/{filename} | Upload binary. Raw body, 50MB max |
| POST | /cards/{cardId}/attachments | Upload base64 (legacy). Body: `name` (filename), `data` (base64 encoded) |
| GET | /cards/{cardId}/attachments/{attachmentId} | Download attachment |

### Tags

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tags | List all unique tags across cards. Query: `workspacePath` (required) |

### Typed Files

Extensible content system for custom file types with optional validation (configured in `.cards/settings.json`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{cardId}/{typeName} | List files of a specific type |
| GET | /cards/{cardId}/{typeName}/{fileName} | Retrieve typed file |
| PUT | /cards/{cardId}/{typeName}/{fileName} | Create/replace typed file |
| DELETE | /cards/{cardId}/{typeName}/{fileName} | Delete typed file |

### Streams

JSONL streaming with server-side transforms. Stream types are defined in the card's environment configuration.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /cards/{cardId}/streams/{streamType}/{filename} | Stream JSONL data. Raw line-delimited JSON body (chunked transfer). Headers: `X-Stream-Title` (optional), `X-Stream-Session-Id` (optional). Returns `{ filename, streamType, lineCount, status }` |
| GET | /cards/{cardId}/streams | List streams for a card |
| GET | /cards/{cardId}/streams/{filename} | Retrieve stream metadata and lines |

Default size limits: 1MB per line, 100MB per stream (configurable per stream type).

### Environments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /environments | List available agent environments with actions |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/notifications | Broadcast notification. Body: `type` (error/warning/info), `title`, `message`, `source` — all required. Rate limited: 10/min per source |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check (no authentication required) |

</api>
