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

1. Store the plan: `PUT /cards/{id}/plan` with `{ "content": "..." }`
2. Add a comment with code references reviewed during planning
3. Wait for user approval before proceeding

The plan content is accessible via `GET /cards/{id}/plan`.
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
| GET | /cards | List cards. Query: `status`, `tag`, `limit`, `offset`, `search` |
| POST | /cards | Create card. Body: `title` (required), `description` (required), `tags`, `gates` |
| GET | /cards/{id} | Get card details |
| PATCH | /cards/{id} | Update card. Body: `title`, `status`, `tags`, `description`, `isPinned`, `order` |
| DELETE | /cards/{id} | Delete card |
| GET | /cards/{id}/has-updates | Check updates since timestamp. Query: `since` (ISO 8601) |

**Note:** Gate flags (`planApproved`, `reviewApproved`) are server-controlled and cannot be set directly via PATCH.

### Gate Approvals

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /cards/{id}/gates/plan/approve | Approve the plan gate |
| POST | /cards/{id}/gates/review/approve | Approve the review gate |

### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{id}/comments | List comments |
| POST | /cards/{id}/comments | Add comment. Body: `author` ("agent" or "user"), `content` (markdown) |
| PATCH | /cards/{id}/comments/{commentId} | Update comment. Body: `content` |
| DELETE | /cards/{id}/comments/{commentId} | Delete comment |

### Plan

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{id}/plan | Get plan content. Returns 404 if no plan exists |
| PUT | /cards/{id}/plan | Update plan. Body: `content` (markdown) |

### Commits

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{id}/commits | List commit attributions |
| POST | /cards/{id}/commits | Add commit. Body: `sha` (full 40-char), `repoPath` (optional) |
| DELETE | /cards/{id}/commits/{sha} | Remove commit attribution |

### Timeline

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{id}/timeline | Unified timeline (comments, commits, notes, cards). Query: `before`, `limit` |

### Attachments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{id}/attachments | List attachments |
| POST | /cards/{id}/attachments | Upload. Body: `name` (filename), `data` (base64 encoded) |
| GET | /cards/{id}/attachments/{attachmentId} | Download attachment |

### Tags

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tags | List all unique tags across cards |

### Typed Files

Extensible content system for custom file types with optional validation (configured in `.cards/settings.json`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{id}/{typeName} | List files of a specific type |
| GET | /cards/{id}/{typeName}/{fileName} | Retrieve typed file |
| PUT | /cards/{id}/{typeName}/{fileName} | Create/replace typed file |
| DELETE | /cards/{id}/{typeName}/{fileName} | Delete typed file |

### Environments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /environments | List available agent environments with actions |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/notifications | Broadcast notification. Body: `message`, `severity` (error/warning/info), `source` (optional) |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check (no authentication required) |

</api>
