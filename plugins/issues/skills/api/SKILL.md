---
name: api
description: Create, read, and respond to issues related to this git branch.
---

# Issues API

Use the Issues API to communicate with the user about this git branch. The user will be notified when you create an issue or add a comment.

<comments>
Use comments to ask the user for clarifications, to report error states, or to report completion.

**If you edit a file in the workspace while working on an issue, you must include code references in the comment body using GitHub-style fragment links:**
- Single line: `[description](path/to/file.ts#L10)`
- Line range: `[description](path/to/file.ts#L10-L20)`
- Entire file: `[description](path/to/file.ts)`
</comments>

<issue-status>
- **in_progress**: The agent is actively working on this issue.
- **todo**: This issue is ready for implementation.
- **needs_review**: This issue is awaiting feedback from the user (includes plan approval and implementation review).
- **done**: The issue is complete and needs no additional review.
- **backlog**: The issue is still under consideration. Do not modify or work on issues in the backlog.
- **archived**: This issue has been archived and is no longer in the active workflow.
</issue-status>

<plan-approval>
When an issue has `planRequired: true`, you must present a plan for user approval before beginning any meaningful implementation work.

**Workflow:**
1. Create the plan document
2. Store the plan in the `planContent` field for user review:

```
PATCH /issues/{id}
{
  "planContent": "[full plan markdown content]"
}
```

3. To reference code files reviewed during planning, add a comment with fragment links in the body:

```
POST /issues/{id}/comments
{
  "body": "Plan references the following files:\n- [Configuration module](src/config/index.ts#L1-L50)\n- [API handler](src/api/handler.ts#L25)",
  "author": "agent"
}
```

4. Wait for user approval before proceeding with implementation

The `planContent` field stores the plan for review and reference during implementation.
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
echo "# List all issues"
echo "curl -s \"\$API_BASE/issues\" | jq ."
```

## Endpoints

### Issues

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /issues | List issues (supports pagination) |
| POST | /issues | Create a new issue |
| GET | /issues/{issueId} | Get issue with all comments |
| PATCH | /issues/{issueId} | Update issue properties |
| DELETE | /issues/{issueId} | Delete issue and all comments |

```typescript
// GET /issues
// Query parameters:
//   limit?: number   - Maximum issues to return (default: all)
//   offset?: number  - Number of issues to skip (default: 0)
// Returns: IssueSummaryMinimal[]
//
// Response contains only 4 essential fields for bandwidth optimization:
// - title: string                  - Issue title for display
// - status: IssueStatus            - Kanban status for grouping/filtering
// - needsAgentAttention: boolean   - Agent attention badge indicator
// - updatedAt: string              - Last modification timestamp (ISO 8601)
//
// For full issue details including comments, description, and metadata,
// use GET /issues/{id}
//
// Examples:
//   GET /issues                    → All issues (minimal)
//   GET /issues?limit=10           → First 10 issues (minimal)
//   GET /issues?limit=10&offset=10 → Issues 11-20 (minimal)
//
// Example response:
// [
//   {
//     "title": "Implement dark mode toggle",
//     "status": "in_progress",
//     "needsAgentAttention": true,
//     "updatedAt": "2024-01-15T14:30:00.000Z"
//   },
//   {
//     "title": "Fix authentication bug",
//     "status": "todo",
//     "needsAgentAttention": false,
//     "updatedAt": "2024-01-14T09:15:00.000Z"
//   }
// ]

// POST /issues
interface CreateIssueRequest {
  title: string;
  description?: string;
  author: "agent";
  planRequired?: boolean;  // Whether this issue requires plan approval before implementation
  reviewRequired?: boolean;  // Whether this issue requires user review before completing
  tags?: string[];  // Optional tags for categorization (see Tag Validation Rules)
}

// PATCH /issues/{id}
interface UpdateIssueRequest {
  title?: string;
  description?: string;
  status?: 'in_progress' | 'todo' | 'needs_review' | 'done' | 'backlog' | 'archived';
  order?: number;
  needsAgentAttention?: boolean;
  planRequired?: boolean;  // Whether this issue requires plan approval before implementation
  planContent?: string;  // Plan content
  reviewRequired?: boolean;  // Whether this issue requires user review before completing
  tags?: string[];     // Optional tags for categorization (see Tag Validation Rules)
  pinned?: boolean;  // Whether this issue is pinned to the top of the list
}
```


### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /issues/{issueId}/comments | Get comments for an issue |
| POST | /issues/{issueId}/comments | Add comment (use fragment links in body for code references) |
| DELETE | /issues/{issueId}/comments/{commentId} | Delete a comment from an issue |

```typescript
// GET /issues/{issueId}/comments
// Query parameters:
//   since?: string  - ISO 8601 date string to filter comments created after this time
// Returns: Comment[]

// POST /issues/{id}/comments
// Code references should be embedded in the body using GitHub-style fragment links:
//   - Single line: [text](path/to/file.ts#L10)
//   - Line range: [text](path/to/file.ts#L10-L20)
//   - Entire file: [text](path/to/file.ts)
interface AddCommentRequest {
  body?: string;         // Markdown content (embed code references as fragment links)
  author: "agent";
  commitSha?: string;    // Git SHA (40-char) of the commit being reported
  replyTo?: string;      // Parent comment ID
}

// DELETE /issues/{issueId}/comments/{commentId}
// Returns: { success: true }
```

### Plan Assessments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /issues/{issueId}/plan-assessments | Get plan assessments for an issue |
| POST | /issues/{issueId}/plan-assessments | Add a plan assessment to an issue |

```typescript
// GET /issues/{issueId}/plan-assessments
// Returns: string[]  (raw assessments strings)

// POST /issues/{issueId}/plan-assessments
interface AddPlanAssessmentRequest {
  body: string;      // Required assessment content
  author: "agent";   // Required author
}
// Returns: { index: number }  // Array index of appended assessment
```

### Attachments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /issues/{issueId}/attachments | Upload file to issue |
| GET | /issues/{issueId}/attachments/{attachmentId} | Get attachment metadata |
| DELETE | /issues/{issueId}/attachments/{attachmentId} | Delete attachment |
| POST | /issues/{issueId}/comments/{commentId}/attachments | Upload file to comment |
| DELETE | /issues/{issueId}/comments/{commentId}/attachments/{attachmentId} | Delete comment attachment |

```typescript
// POST /issues/{issueId}/attachments or /issues/{issueId}/comments/{commentId}/attachments
interface UploadAttachmentRequest {
  filePath: string;      // Absolute path to file
  author: "agent";
}
```

### Compare Mode

Control the extension's comparison view to show differences between git refs.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/compare | Get current compare mode state |
| POST | /api/v1/compare | Enter explicit comparison mode |
| DELETE | /api/v1/compare | Clear compare mode and restore normal mode |

```typescript
// GET /api/v1/compare
// Returns: CompareModeState
interface CompareModeState {
  sourceBranch: string;           // Current source branch/commit being compared from
  targetRef: string;              // Target ref ("HEAD" for normal mode, or specific ref for comparison)
  isExplicitComparison: boolean;  // Whether in explicit comparison mode (targetRef !== "HEAD")
  preComparisonSource: string | null;  // Source branch to restore when clearing comparison
}

// POST /api/v1/compare
// Note: If targetRef is "HEAD", automatically clears comparison mode instead
interface SetCompareModeRequest {
  sourceBranch: string;  // Source branch/commit to compare from
  targetRef: string;     // Target ref to compare against (commit, branch, or tag)
}

// DELETE /api/v1/compare
// Returns: { success: true }
// Clears explicit comparison mode and restores normal mode
```
</api>
