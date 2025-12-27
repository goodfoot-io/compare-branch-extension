---
name: issue-approve-review
description: Set reviewApproved when user posts approval comment. Use when [STATUS] is "needs_review" and [LATEST_USER_COMMENT] contains approval language but issue.reviewApproved is not yet true.
---

<instructions>

## 1. Verify State

Confirm that:
- Issue status is `needs_review`
- The latest user comment contains approval language ("approved", "lgtm", "proceed", "go ahead", "ship it", "merge")
- `issue.reviewApproved` is not already `true`

## 2. Initialize

```
PATCH /issues/[ISSUE_ID]
{
  "status": "in_progress"
}
```

## 3. Set Review Approved

Call the API to set `reviewApproved: true`:

```
PATCH /issues/[ISSUE_ID]
{
  "reviewApproved": true
}
```

## 4. Post Acknowledgment

Post a brief comment acknowledging the approval:

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "Review approved. The implementation will be merged on the next invocation.",
  "author": "agent"
}
```

## 5. Finalize

Set status back to `needs_review` and clear the attention flag:

```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review",
  "needsAgentAttention": false
}
```

**STOP** - The routing layer will trigger `issue-merge` on the next invocation when `[REVIEW_APPROVED]` is true.

</instructions>
