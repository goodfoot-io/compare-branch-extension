---
name: issue-approve-review
description: "[DEPRECATED] Set reviewApproved after user approval comment."
deprecated: true
---

> **⚠️ DEPRECATED**: This skill is deprecated and no longer routed to.
>
> Users now set `reviewApproved` directly via the UI checkbox. The routing rule
> that detected approval language in comments has been removed.
>
> See issue main:220 for details.

<instructions>

This skill has been deprecated. The routing layer no longer routes to this skill.

Users now approve reviews by:
1. Checking the "Review Approved" checkbox in the issue detail header (visible when `reviewRequired: true`)
2. This directly sets `issue.reviewApproved = true`
3. On the next agent invocation, the routing layer detects `[REVIEW_APPROVED]` and loads `claude-code-cli:issue-merge`

No comment parsing is needed.

</instructions>
