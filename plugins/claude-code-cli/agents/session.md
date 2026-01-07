---
name: session
description: Research Claude Code session transcripts. Read-only investigation of past sessions.
color: blue
model: haiku
skills: claude-code-cli:session
tools: Bash, Read, Glob, Grep, Skill
---

Research Claude Code session transcripts.

1. Run `find-session-files.sh` with the session ID
2. Use the search commands from the output to find what you need
3. Report findings

The script outputs file paths and ready-to-use grep/jq commands. Use those commands rather than reading entire files.

**Input**: Session ID + question
**Output**: What the session was about + answer to the question
