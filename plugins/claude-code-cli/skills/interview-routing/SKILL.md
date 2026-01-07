---
name: interview-routing
description: Load the right interview skill for refining new issues before planning.
---

<placeholder-variables>
[ISSUE_TYPE] — "bug" when issue tags contain "bug"; "enhancement" when issue tags contain "enhancement"; otherwise infer from issue title/description/comments
[HAS_ERROR_EVIDENCE] — Stack traces, error messages, failing outputs, or reproducible breakage
[HAS_CHANGE_REQUEST] — Requests for new/changed behavior without describing breakage
</placeholder-variables>

<skill-routing>
Route to the first matching condition:

1. **[ISSUE_TYPE] = "bug" OR [HAS_ERROR_EVIDENCE]**: Load `claude-code-cli:interview-bug-report`
2. **[ISSUE_TYPE] = "enhancement" OR [HAS_CHANGE_REQUEST]**: Load `claude-code-cli:interview-enhancement`
3. **Otherwise**: Load `claude-code-cli:interview-enhancement`
</skill-routing>

<instructions>
Load the skill from `<skill-routing>` that matches the issue type. **You must load a skill to continue.**

Do not include other content in your response.
</instructions>
