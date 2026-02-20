---
name: session
description: This skill should be used when the user asks to "look up a session", "find a session transcript", "search session history", "investigate a previous session", or provides a session ID to look up. Retrieves Claude Code session transcripts and metadata.
---

## Card Sessions

All sessions are stored in the card repository under `streams/claude-code-session/`. Each session
produces one NDJSON stream file and a `.meta.json` sidecar:

```
streams/
  claude-code-session/
    {sessionId}.jsonl              # NDJSON transcript (one SDK message per line)
    {sessionId}.jsonl.meta.json    # Stream metadata sidecar
```

### Sidecar Structure (`.meta.json`)

```json
{
  "filename": "{sessionId}.jsonl",
  "streamType": "claude-code-session",
  "status": "completed",
  "lineCount": 42,
  "title": "Claude session for {cardId}",
  "sessionId": "{sessionId}"
}
```

**Status values:** `active`, `completed`, `error`, `interrupted`, `size_limit`, `recovered`.

### Stream Content Format

Each line is a JSON object from the Claude Code SDK (`--output-format stream-json`).
Common message types:

| `type`             | `subtype`  | Content                              |
|--------------------|------------|--------------------------------------|
| `system`           | `init`     | Model, tools, cwd                    |
| `assistant`        |            | Response content blocks (text, tool_use, thinking) |
| `tool_use_summary` |            | Tool output summary                  |
| `tool_progress`    |            | Long-running tool status             |
| `result`           | `success`  | Turns, duration, cost                |
| `result`           | `error`    | Error details with stats             |

### Finding Sessions in the Card Repo

List all sessions for the current card:

```bash
cd "$CARD_REPO_PATH"
ls streams/claude-code-session/*.jsonl 2>/dev/null
# Must be run from the card repository root
```

All commands in the 'Finding Sessions in the Card Repo' and 'Searching Session Content' sections must be run from the card repository root. Run `cd "$CARD_REPO_PATH"` once before issuing any of the commands below, or prefix each command with `cd "$CARD_REPO_PATH" &&`.

Read sidecar metadata for a specific session:

```bash
cd "$CARD_REPO_PATH" && cat "streams/claude-code-session/${SESSION_ID}.jsonl.meta.json" | jq .
```

### Searching Session Content

The transcript is NDJSON (one JSON object per line). Avoid reading the entire file.

**Find user messages:**
```bash
cd "$CARD_REPO_PATH" && grep '"type":"user"' "streams/claude-code-session/${SESSION_ID}.jsonl" | jq -c '.message.content' | head -20
```

**Find assistant text responses:**
```bash
cd "$CARD_REPO_PATH" && grep '"type":"assistant"' "streams/claude-code-session/${SESSION_ID}.jsonl" | jq -c '.message.content[] | select(.type=="text") | .text' 2>/dev/null | head -50
```

**Search for specific content:**
```bash
cd "$CARD_REPO_PATH" && grep -i 'keyword' "streams/claude-code-session/${SESSION_ID}.jsonl" | jq -c '.message.content // .toolUseResult // empty' | head -20
```

**List tool calls made:**
```bash
cd "$CARD_REPO_PATH" && grep '"type":"assistant"' "streams/claude-code-session/${SESSION_ID}.jsonl" | jq -rc '.message.content[]? | select(.type=="tool_use") | .name' 2>/dev/null | sort | uniq -c | sort -rn
```

## Local Sessions (outside card repos)

<find-session-files-usage>
Use `find-session-files.sh` to retrieve session metadata and file paths for a Claude Code session stored in the local Claude config directory (e.g., `~/.claude/projects/`).

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/find-session-files.sh" [SESSION_ID]
```

The script outputs session metadata (prompt, summary, slug, timestamps) and file paths, followed by search instructions with example commands.

After running `find-session-files.sh`, the script outputs session metadata (prompt, summary, timestamps) and file paths. Use the printed `.jsonl` file path with the search commands in the 'Searching Session Content' section above to inspect transcript content. The script output is informational only — the agent must issue additional bash read or search commands to access session content.
</find-session-files-usage>
