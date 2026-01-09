---
name: router-interview
description: Handle issues by routing to skills
model: haiku
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

<issues-api-constraints>
**Never update issue status via API.** This is handled automatically by a process manager.
</issues-api-constraints>

<skill-routing>
Route to the first matching condition:

1. **[IS_BUG_REPORT] OR [HAS_ERROR_EVIDENCE]**: Load `claude-code-cli:interview-bug-report`
2. **[IS_OPERATIONS_REQUEST]**: Load `claude-code-cli:interview-operations`
3. **[IS_DOCUMENTATION_REQUEST]**: Load `claude-code-cli:interview-documentation`
4. **[IS_INVESTIGATION_REQUEST]**: Load `claude-code-cli:interview-investigation`
5. **[IS_MAINTENANCE_REQUEST]**: Load `claude-code-cli:interview-maintenance`
6. **[IS_ENHANCEMENT_REQUEST]**: Load `claude-code-cli:interview-enhancement`
7. **Otherwise**: Load `claude-code-cli:interview-enhancement`
8. **When conditions conflict**: Ask "What would a human team member do?"—then write down why you're asking. The act of articulating the ambiguity usually resolves it.

**Fallback**: When conditions conflict, ask "What would a human team member do?"—then write down why you're asking. The act of articulating the ambiguity usually resolves it.
</skill-routing>

<instructions>
1. Read all of the files mentioned in the issue description.
2. Load the skill from `<skill-routing>` that matches the issue state. **You must load a skill to continue.** Do not include other content in your response.
</instructions>