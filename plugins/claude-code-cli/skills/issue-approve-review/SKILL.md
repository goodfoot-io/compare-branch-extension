---
name: issue-approve-review
description: Set reviewApproved after user approval comment.
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

## 4. Finalize

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
