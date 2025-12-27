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

## 2. Set Review Approved

Call the API to set `reviewApproved: true`:

```
PATCH /issues/[ISSUE_ID]
{
  "reviewApproved": true
}
```

## 3. Post Acknowledgment

Post a brief comment acknowledging the approval:

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "Review approved. The implementation will be merged on the next invocation.",
  "author": "agent"
}
```

## 4. Clear Attention Flag

Clear the attention flag to prevent immediate re-invocation:

```
PATCH /issues/[ISSUE_ID]
{
  "needsAgentAttention": false
}
```

**STOP** - The routing layer will trigger `issue-merge` on the next invocation when `[REVIEW_APPROVED]` is true.

</instructions>
