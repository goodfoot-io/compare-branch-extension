# Issue Report Structure

Scope: structure for filing a well-formed bug report about the Cards extension via `cards-extension issue`. Adapted from `cards:cards`'s bug-report structure with the same sections, targeting an issue body string instead of a CARD.md file.

Source of truth: this file owns the issue body template. The escalation sections in every troubleshoot reference file delegate to this template.

Completeness: covers every section a `cards-extension issue` body should contain. Excludes card creation workflows (see `cards:cards` skill).

Cross-refs: `interview-issue-report.md` (gathering signal before filing), `inspect-cli-tools.md` (`cards-extension` CLI reference), `find-logs.md` (log evidence collection).

Parent: `../SKILL.md`

## Report Sections

| Section | Content |
|---------|---------|
| Commander's Intent | Opening paragraph — the system after the defect is gone. Becomes the `title` field as a one-line summary |
| What happened | Narrative description of the failure |
| Steps to reproduce | Numbered sequence of actions |
| Expected behavior | What should have happened |
| Actual behavior | What happened instead (include error messages, copy-paste exact) |
| Investigation | What you explored, what you found, which observation channels you checked |
| Hypothesis (optional) | Theory about the cause, framed as speculation ("This suggests...") |
| Environment | Automatically populated by `generateCardUrl()`: extension version, VS Code version, platform, node version. Supplement with reproduction-specific environment below |
| Relevant logs | Tail of the most relevant log file(s) — include the log name and why it was selected |

## Writing Principles

- **Open with Commander's Intent**. The destination is the fixed-state world, not "the bug is fixed." This becomes the `title` field.
- **Document observable facts**: Exact error messages (copy-paste), file paths, line numbers, git state. Fragment-link every named file, function, and type.
- **Reproduction steps**: Numbered, specific, noting prerequisites and consistency (reproducible vs intermittent).
- **Separate observation from speculation**: Frame hypotheses as exploration — "This suggests..." not "The bug is caused by..."
- **Multiple observation channels**: Document which channels (logs, APIs, UIs, monitoring) you checked and what each showed. Discrepancies between channels are often the most diagnostic information.
- **Observable vs non-observable state**: Name what you cannot see as well as what you can.
- **Error state vs crash**: Check actual system health independently of error reports.
- **Missing observability**: Note what visibility would have made investigation easier as concrete gaps.

## Template

```bash
cards-extension issue <<'EOF'
{
  "title": "One-line summary of the fixed-state destination",
  "body": "## What happened\n\n<narrative description of the failure>\n\n## Steps to reproduce\n\n1. ...\n2. ...\n3. ...\n\n**Reproducibility**: <always | intermittent — N of M attempts>\n\n## Expected behavior\n\n<what should have happened>\n\n## Actual behavior\n\n<what happened instead, with exact error messages>\n\n```\n<copy-pasted error output>\n```\n\n## Investigation\n\n<what you explored, what you found>\n\n- Checked <channel>: <finding>\n- Checked <channel>: <finding>\n\n## Hypothesis\n\n<theory about the cause, framed as speculation — optional, remove if none>\n\n## Environment\n\n```\n$(echo \"HOME=$HOME\" && echo \"CARDS_HOME=${CARDS_HOME:-unset}\" && echo \"WORKSPACE=$(git rev-parse --show-toplevel 2>/dev/null || echo 'not in repo')\" && cat ~/.cards/cards-api.json 2>/dev/null | jq '{port, pid, buildTime}' || echo 'discovery file not found')\n```\n\n## Relevant logs\n\n$(tail -50 ${WORKSPACE}/.cards/logs/<log-name>.log 2>/dev/null || echo 'no log output at that path')\n\nSelected because: <reason this log file is the relevant one>"
}
EOF
```

### Template Notes

- Replace `<log-name>` with the actual log filename (e.g., `claude-code-cards-api-hooks`, `claude-code-cards-runtime-hooks`, `cards-default-configuration-hooks`). The log file inventory is in `find-logs.md`.
- The Environment section auto-captures HOME, CARDS_HOME, WORKSPACE, and discovery file state. `generateCardUrl()` adds extension version, VS Code version, platform, and node version automatically — do not duplicate those in the body.
- The body is a single JSON string. Multi-line content uses `\n` escaping within the heredoc — the shell expands `$(...)` before passing to `cards-extension issue`.
- Unknown JSON fields are rejected. Only `title` and `body` are accepted.
- Missing or empty `title`/`body` exit with code 1 and an error message to stderr.

## Out of Scope

- Card creation workflows → `cards:cards` skill
- Interview process for gathering signal → `interview-issue-report.md`
- `cards-extension` CLI reference → `inspect-cli-tools.md`
