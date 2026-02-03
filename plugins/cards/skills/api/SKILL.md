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
When a card has `gates.planRequired: true`, you must present a plan for user approval before beginning any meaningful implementation work.

**Workflow:**
1. Create the plan document
2. Store the plan using the plan endpoint:

```
PUT /cards/{id}/plan
{
  "content": "[full plan markdown content]"
}
```

3. To reference code files reviewed during planning, add a comment with fragment links:

```
POST /cards/{id}/comments
{
  "content": "Plan references the following files:\n- [Configuration module](src/config/index.ts#L1-L50)\n- [API handler](src/api/handler.ts#L25)",
  "author": "agent"
}
```

4. Wait for user approval before proceeding with implementation

The plan content is stored separately and accessible via `GET /cards/{id}/plan`.
</plan-approval>

<reload-after-compaction>
You must reload this skill after compaction.
</reload-after-compaction>

<api>

```!
BACKTICK='`'
API_BASE=$(${CLAUDE_PLUGIN_ROOT}/bin/discover-api.sh)
echo "# Get the API base URL"
echo "## Currently: \"$API_BASE\" but the port may change"
echo "API_BASE=\"\$(${CLAUDE_PLUGIN_ROOT}/bin/discover-api.sh)\""
echo ""
echo "# List all cards"
echo "curl -s \"\$API_BASE/cards\" | jq ."
```

## Endpoints

### Cards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards | List cards (supports filtering and pagination) |
| POST | /cards | Create a new card |
| GET | /cards/{id} | Get card details |
| PATCH | /cards/{id} | Update card properties |
| DELETE | /cards/{id} | Delete card |
| GET | /cards/{id}/has-updates | Check if card has updates since a timestamp |

```typescript
// GET /cards
// Query parameters:
//   status?: CardStatus  - Filter by status
//   tag?: string         - Filter by tag
//   limit?: number       - Maximum cards to return
//   offset?: number      - Number of cards to skip
//   search?: string      - Search in title/description
// Returns: CardResponse[]
//
// Example response:
// [
//   {
//     "id": "main:1",
//     "title": "Implement dark mode toggle",
//     "status": "in_progress",
//     "tags": ["feature"],
//     "description": "Add dark mode support...",
//     "isPinned": false,
//     "order": 0,
//     "gates": {
//       "planRequired": true,
//       "planApproved": false,
//       "reviewRequired": true,
//       "reviewApproved": false
//     },
//     "createdAt": "2024-01-15T14:30:00.000Z",
//     "updatedAt": "2024-01-15T14:30:00.000Z"
//   }
// ]

// POST /cards
interface CardCreateRequest {
  title: string;        // Required: card title
  description: string;  // Required: card description
  tags?: string[];      // Optional tags for categorization
  gates?: {
    planRequired?: boolean;   // Whether plan approval is required
    reviewRequired?: boolean; // Whether review approval is required
  };
}

// PATCH /cards/{id}
interface CardUpdateRequest {
  title?: string;
  status?: 'in_progress' | 'todo' | 'needs_review' | 'done' | 'backlog' | 'archived';
  tags?: string[];
  description?: string;
  isPinned?: boolean;
  order?: number;
}

// GET /cards/{id}/has-updates
// Query parameters:
//   since?: string  - ISO 8601 timestamp to compare against
// Returns: { hasUpdates: boolean, updatedAt: string }
```

### Gate Approvals

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /cards/{id}/gates/plan/approve | Approve the plan gate |
| POST | /cards/{id}/gates/review/approve | Approve the review gate |

```typescript
// POST /cards/{id}/gates/{gateName}/approve
// gateName must be "plan" or "review"
// Returns: CardResponse with updated gates
```

### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{id}/comments | Get comments for a card |
| POST | /cards/{id}/comments | Add comment |
| PATCH | /cards/{id}/comments/{commentId} | Update comment |
| DELETE | /cards/{id}/comments/{commentId} | Delete comment |

```typescript
// GET /cards/{id}/comments
// Returns: CommentResponse[]

// POST /cards/{id}/comments
interface CommentCreateRequest {
  author: string;   // Required: "agent" or "user"
  content: string;  // Required: markdown content
}

// PATCH /cards/{id}/comments/{commentId}
interface CommentUpdateRequest {
  content: string;  // Required: updated content
}

// CommentResponse
interface CommentResponse {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}
```

### Plan

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{id}/plan | Get plan content |
| PUT | /cards/{id}/plan | Update plan content |

```typescript
// GET /cards/{id}/plan
// Returns: { content: string }
// Returns 404 if no plan exists

// PUT /cards/{id}/plan
interface PlanUpdateRequest {
  content: string;  // Required: plan markdown content
}
// Returns: { content: string }
```

### Commits

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{id}/commits | List commit attributions |
| POST | /cards/{id}/commits | Add commit attribution |
| DELETE | /cards/{id}/commits/{sha} | Remove commit attribution |

```typescript
// POST /cards/{id}/commits
interface CommitCreateRequest {
  sha: string;       // Required: full 40-char git SHA
  repoPath?: string; // Optional: path to repo for fetching details
}
// Returns: { success: true }
```

### Timeline

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{id}/timeline | Get unified timeline of all card activity |

```typescript
// GET /cards/{id}/timeline
// Query parameters:
//   before?: string  - Cursor for pagination
//   limit?: number   - Maximum entries to return
// Returns: TimelineEntry[]

interface TimelineEntry {
  id: string;
  type: 'comment' | 'card' | 'commit' | 'note';
  timestamp: string;
  data: unknown;
}
```

### Attachments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cards/{id}/attachments | List attachments |
| POST | /cards/{id}/attachments | Upload attachment |
| GET | /cards/{id}/attachments/{attachmentId} | Download attachment |

```typescript
// POST /cards/{id}/attachments
interface AttachmentCreateRequest {
  name: string;  // Required: filename
  data: string;  // Required: base64 encoded file data
}
// Returns: AttachmentInfo
```

### Tags

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tags | List all unique tags across cards |

```typescript
// GET /tags
// Returns: string[]
```

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check (no authentication required) |

```typescript
// GET /health
// Returns: {
//   status: "healthy",
//   uptime: number,
//   timestamp: string,
//   components: { websocket: { status: string, connections: number } }
// }
```

</api>
