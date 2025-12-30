---
name: api
description: Create, read, and respond to issues related to this git branch.
---

# Issues API

Use the Issues API to communicate with the user about this git branch. The user will be notified when you create an issue or add a comment.

<comments>
Use comments to ask the user for clarifications, to report error states, or to report completion.

**If you edit a file in the workspace while working on an issue, you must include that file in the comment `codeReferences` property.**
</comments>

<issue-status>
**When you start or resume work on an issue, change the issue status to "in_progress" to signal you are working on it. After you have completed work, change the issue status to "needs_review" to signal the user to review.**

If a user asks a question in an issue, answer then change the issue status to `needs_review`.

Statuses:
- **in_progress**: You, Claude, are actively working on this issue.
- **todo**: This issue is ready for implementation.
- **needs_review**: This issue is awaiting feedback from the user (includes plan approval and implementation review).
- **done**: The issue is complete and needs no additional review.
- **backlog**: The issue is still under consideration. Do not modify or work on issues in the backlog.
- **archived**: This issue has been archived and is no longer in the active workflow.
</issue-status>

<plan-approval>
When an issue has `plan: true`, you must present a plan for user approval before beginning any meaningful implementation work.

**Workflow:**
1. Create the plan document following the `claude-code-cli:plan` skill format
2. Store the plan in the `planContent` field for user review:

```
PATCH /issues/{id}
{
  "planContent": "[full plan markdown content]",
  "codeReferences": ["/path/to/reviewed/file.ts"]
}
```

3. Wait for user approval before proceeding with implementation

The `planContent` field stores the plan for review and reference during implementation.
</plan-approval>

<git-commit-sha>
Record the git commit SHA to track repository state by posting comments with `commitSha`.

Use `git rev-parse HEAD` to get the current 40-character SHA.
</git-commit-sha>

<reload-after-compaction>
You must reload this skill after compaction.
</reload-after-compaction>

```!
BACKTICK='`'
BASE_URL=$(${CLAUDE_PLUGIN_ROOT}/bin/discover-api.sh)

echo "<api>"
echo "Base URL: ${BASE_URL}"

```

## Endpoints

### Issues

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /issues | List all issues with summaries |
| POST | /issues | Create a new issue |
| GET | /issues/{issueId} | Get issue with all comments |
| PATCH | /issues/{issueId} | Update issue properties |
| DELETE | /issues/{issueId} | Delete issue and all comments |

```typescript
// POST /issues
interface CreateIssueRequest {
  title: string;
  description?: string;
  author: "agent";
  plan?: boolean;  // Whether this issue requires plan approval before implementation
  review?: boolean;  // Whether this issue requires user review before completing
  tags?: string[];  // Optional tags for categorization (see Tag Validation Rules)
}

// PATCH /issues/{id}
interface UpdateIssueRequest {
  title?: string;
  description?: string;
  status?: 'in_progress' | 'todo' | 'needs_review' | 'done' | 'backlog' | 'archived';
  order?: number;
  needsAgentAttention?: boolean;
  plan?: boolean;  // Whether this issue requires plan approval before implementation
  planContent?: string;  // Plan content
  review?: boolean;  // Whether this issue requires user review before completing
  tags?: string[];     // Optional tags for categorization (see Tag Validation Rules)
}
```


### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /issues/{issueId}/comments | Get comments for an issue |
| POST | /issues/{issueId}/comments | Add comment (with optional code references) |

```typescript
// GET /issues/{issueId}/comments
// Query parameters:
//   since?: string  - ISO 8601 date string to filter comments created after this time
// Returns: Comment[]

// POST /issues/{id}/comments
interface AddCommentRequest {
  body?: string;
  author: "agent";
  commitSha?: string;    // Git SHA (40-char) of the commit being reported
  codeReferences?: {
    uri:string;
    range: {
      startLine: number;
      endline:number;
    }
  }[];
  replyTo?: string;      // Parent comment ID
}
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
