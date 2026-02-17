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

<activate-before-work>
Before starting work on a card, activate it to establish commit attribution:

```
curl -s -X POST -H "Authorization: Bearer $ACCESS_TOKEN" "$API_BASE/cards/{cardId}/activate"
```

This links your session to the card so that any git commits you make are automatically attributed to it. Always activate before your first code change.
</activate-before-work>

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

<authentication>
All API requests (except `GET /health`) require a Bearer token. The discover script outputs shell-evaluable assignments for both `API_BASE` and `ACCESS_TOKEN`. Use `eval` to set them, then include the token as an `Authorization: Bearer` header on every request.
</authentication>

<api>

```!
eval "$(${CLAUDE_PLUGIN_ROOT}/bin/discover-api.sh)"
echo "# API connection (port and token may change between sessions)"
echo "eval \"\$(${CLAUDE_PLUGIN_ROOT}/bin/discover-api.sh)\""
echo ""
echo "# Example: List all cards"
echo "curl -s -H \"Authorization: Bearer \$ACCESS_TOKEN\" \"\$API_BASE/cards?workspacePath=/workspace\" | jq ."
```

## Endpoints

### Cards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{cardId} | Get card details |
| GET | /cards | List cards. Query: `workspacePath` (required), `status`, `tag`, `limit`, `offset`, `search` |
| POST | /cards | Create card. Body: `workspacePath` (required), `title` (required), `description` (required), `tags`, `gates`, `environmentName`, `order` |
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
| POST | /cards/{cardId}/comments | Add comment. Body: `author` (full git identity, e.g. `"agent <agent@cards.local>"`), `content` (markdown) |
| PATCH | /cards/{cardId}/comments/{commentId} | Update comment. Body: `content` |
| DELETE | /cards/{cardId}/comments/{commentId} | Delete comment |

### Plan

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{cardId}/plan | Get plan content. Returns 404 if no plan exists |
| PUT | /cards/{cardId}/plan | Update plan. Body: `content` (markdown) |

### Activate

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /cards/{cardId}/activate | Activate card for this session. Establishes commit attribution and registers current branch — call before starting work. Query: `workspacePath` (optional, for branch detection) |

### Commits

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{cardId}/commits | List commit attributions |
| POST | /cards/{cardId}/commits | Add commit. Body: `sha` (full 40-char), `repoPath` (optional) |
| DELETE | /cards/{cardId}/commits/{sha} | Remove commit attribution |

### Branches

Track workspace branches and worktrees associated with a card. The `/activate` endpoint also registers the current branch automatically.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{cardId}/branches | List tracked branches. Query: `workspacePath` (optional, for computing isMerged and commit containment) |
| POST | /cards/{cardId}/branches | Add branch. Body: `name` (required), `worktree` (optional path), `parentBranch` (optional, parent branch name) |
| DELETE | /cards/{cardId}/branches/{branchName} | Remove branch. Branch names with `/` are URL-encoded |

**Computed fields** (returned by GET when `workspacePath` is provided):
- `exists`: Whether the branch still exists in git
- `isMerged`: Whether the branch tip is merged into the workspace HEAD
- `commits`: Commit SHAs reachable from the branch but not from HEAD

**Response shape:**
```json
{
  "branches": [
    {
      "name": "feature/auth",
      "worktree": "/path/to/worktree",
      "parentBranch": "main",
      "addedAt": "2026-02-13T10:00:00Z",
      "exists": true,
      "isMerged": false,
      "commits": ["abc123", "def456"]
    }
  ]
}
```

### Timeline

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{cardId}/timeline | Unified timeline (comments, commits, notes, cards). Query: `before`, `limit` |

### Attachments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{cardId}/attachments | List attachments |
| PUT | /cards/{cardId}/attachments/{filename} | Upload binary. Raw body, 50MB max. Header: `X-Cards-Author` (optional, git author identity) |
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
| GET | /cards/{cardId}/schema | List registered type schemas and descriptions for card's environment |
| GET | /cards/{cardId}/{typeName} | List files of a specific type |
| GET | /cards/{cardId}/{typeName}/{fileName} | Retrieve typed file |
| PUT | /cards/{cardId}/{typeName}/{fileName} | Create/replace typed file |
| DELETE | /cards/{cardId}/{typeName}/{fileName} | Delete typed file |

### Streams

JSONL streaming with server-side transforms. Stream types are defined in the card's environment configuration.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /cards/{cardId}/streams/{streamType}/{filename} | Stream JSONL data. Raw line-delimited JSON body (chunked transfer). Headers: `X-Stream-Title` (optional), `X-Stream-Session-Id` (optional), `X-Cards-Author` (optional, git author identity). Returns `{ filename, streamType, lineCount, status }` |
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
