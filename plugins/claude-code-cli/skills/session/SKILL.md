---
name: session
description: Look up Claude Code session transcripts by session ID. Use when investigating previous sessions, finding what was discussed or done in a session, or searching session history.
---

<find-session-files-usage>
Use `find-session-files.sh` to retrieve session metadata and file paths for a Claude Code session transcript.

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/find-session-files.sh" [SESSION_ID]
```

The script outputs session metadata (prompt, summary, slug, timestamps) and file paths, followed by search instructions with example commands.
</find-session-files-usage>