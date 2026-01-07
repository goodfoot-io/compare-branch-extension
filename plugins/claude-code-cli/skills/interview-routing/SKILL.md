---
name: interview-routing
description: Load the right interview skill for refining new issues before planning.
---

<placeholder-variables>
[IS_BUG_REPORT] — User reports unexpected behavior, errors, or broken functionality
[HAS_ERROR_EVIDENCE] — Stack traces, error messages, failing outputs, or reproducible breakage
[IS_DOCUMENTATION_REQUEST] — User wants docs, guides, examples, runbooks, or knowledge-base updates
[IS_INVESTIGATION_REQUEST] — User asks for research, diagnostics, spikes, or feasibility checks
[IS_MAINTENANCE_REQUEST] — User wants refactors, upgrades, migrations, or reliability/performance improvements without new behavior
[IS_OPERATIONS_REQUEST] — CI/build failures, infra chores, operational support, or incident follow-ups
[IS_ENHANCEMENT_REQUEST] — User requests new or changed behavior without describing breakage
</placeholder-variables>

<instructions>

Determine path using the first matching condition:
- **[IS_BUG_REPORT] OR [HAS_ERROR_EVIDENCE]**: Load `claude-code-cli:interview-bug-report`
- **[IS_OPERATIONS_REQUEST]**: Load `claude-code-cli:interview-operations`
- **[IS_DOCUMENTATION_REQUEST]**: Load `claude-code-cli:interview-documentation`
- **[IS_INVESTIGATION_REQUEST]**: Load `claude-code-cli:interview-investigation`
- **[IS_MAINTENANCE_REQUEST]**: Load `claude-code-cli:interview-maintenance`
- **[IS_ENHANCEMENT_REQUEST]**: Load `claude-code-cli:interview-enhancement`
- **Otherwise**: Load `claude-code-cli:interview-enhancement`
- **When conditions conflict**: Ask "What would a human team member do?"—then write down why you're asking. The act of articulating the ambiguity usually resolves it.

Load the skill that matches the issue type. **You must load a skill to continue.**

Do not include other content in your response.

**Never update issue status via API.**
</instructions>
