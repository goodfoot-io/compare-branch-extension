---
name: issue-routing
description: Load the right skill based on issue state.
---

<placeholder-variables>
[ISSUE_ID] — The issue's unique identifier from `id` field
[STATUS] — Workflow state: backlog, todo, in_progress, needs_review, done, archived
[PLAN_REQUIRED] — Whether plan approval is needed from `planRequired` field
[PLAN_CONTENT] — Plan markdown from `planContent` field (string or null)
[REVIEW_REQUIRED] — Whether merge approval is needed from `reviewRequired` field
[LATEST_USER_COMMENT] — Most recent comment with `author: "user"`
[LAST_ACTIVITY] — Timestamp of most recent comment or status change
[HAS_QUESTION] — Contains genuine information-seeking question (not rhetorical, not "Can you fix X?", not "Could you implement Y?")
[HAS_MODIFICATION_REQUEST] — Requests changes ("update", "change", "fix", "modify", "add", "remove")
[HAS_REOPEN_REQUEST] — User indicates issue is not complete (missed requirements, found bugs, wants changes)
[HAS_ACTIVE_INFRASTRUCTURE_ERROR] — Most recent agent comment reports unresolved disk, network, permission, or environment failure (historical resolved errors do not match)
[PLAN_APPROVED] — issue.planApproved === true
[REVIEW_APPROVED] — issue.reviewApproved === true
[IS_BLOCKED] — Tags contain "blocked" OR comments reference blockers
[IS_STALE] — No activity for 30+ days AND status not "done" or "archived"
[IS_TESTABLE_BUG] — Has error evidence (stack traces, error messages) AND programmatically verifiable
[DOR_MET] — Problem statement exists, acceptance criteria inferable, technical approach determinable
</placeholder-variables>

<skill-routing>
Route to the first matching condition:

1. **[HAS_ACTIVE_INFRASTRUCTURE_ERROR]**: Load `claude-code-cli:issue-error-recovery`
2. **[HAS_QUESTION]**: Load `claude-code-cli:issue-question-response`
3. **[STATUS] = "backlog"**: Load `claude-code-cli:issue-backlog-response`
4. **[REVIEW_APPROVED]**: Load `claude-code-cli:issue-merge`
5. **[IS_BLOCKED]**: Load `claude-code-cli:issue-blocked`
6. **[STATUS] = "done" AND [HAS_REOPEN_REQUEST]**: Load `claude-code-cli:issue-reopen-and-implement`
7. **[STATUS] = "done"**: Load `claude-code-cli:issue-no-action`
8. **[STATUS] = "needs_review" AND NOT [HAS_MODIFICATION_REQUEST]**: Load `claude-code-cli:issue-awaiting-review`
9. **[IS_STALE] AND [STATUS] != "needs_review"**: Load `claude-code-cli:issue-clarification` with stale flag
10. **[PLAN_REQUIRED] AND NOT [PLAN_APPROVED]**: Load `claude-code-cli:issue-plan`
11. **[STATUS] = "todo" AND NOT [DOR_MET]**: Load `claude-code-cli:issue-clarification`
12. **[PLAN_APPROVED]**: Load `claude-code-cli:issue-implementation-with-plan`
13. **[IS_TESTABLE_BUG]**: Load `claude-code-cli:issue-bug`
14. **Otherwise**: Load `claude-code-cli:issue-implementation`

**Fallback**: When conditions conflict, ask "What would a human team member do?"—then write down why you're asking. The act of articulating the ambiguity usually resolves it.
</skill-routing>

<instructions>
Load the skill from `<skill-routing>` that matches the issue state. **You must load a skill to continue.**

Do not include other content in your response.

**Never update issue status via API.**
</instructions>
