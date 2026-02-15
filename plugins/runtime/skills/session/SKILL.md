---
name: session
description: This skill should be used when the user asks to "look up a session", "find a session transcript", "search session history", "investigate a previous session", or provides a session ID to look up. Retrieves Claude Code session transcripts and metadata.
---

<find-session-files-usage>
Use `find-session-files.sh` to retrieve session metadata and file paths for a Claude Code session transcript.

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/find-session-files.sh" [SESSION_ID]
```

The script outputs session metadata (prompt, summary, slug, timestamps) and file paths, followed by search instructions with example commands.
</find-session-files-usage>
