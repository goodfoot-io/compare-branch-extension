#!/bin/bash
#
# Find Session Files: Locates all files associated with a Claude Code session
#
# Given a session ID (UUID), returns paths and metadata for:
# - Main session transcript (.jsonl)
# - All subagent transcripts (agent-*.jsonl)
# - Session metadata (prompt, summary, slug)
#
# Usage: find-session-files.sh <session-id>
#
# Environment Variables (checked in priority order):
#   CLAUDE_CONFIG_DIR     - Custom config directory override
#   XDG_CONFIG_HOME       - XDG base config directory
#   XDG_DATA_HOME         - XDG base data directory
#   HOME                  - User home directory (fallback)
#
# Output: XML-wrapped session summary with file paths and search instructions
# Exit codes:
#   0 = success (files found)
#   1 = session not found
#   2 = invalid arguments or configuration error
#

set -euo pipefail

# --- Argument Validation ---

if [ $# -lt 1 ]; then
    echo "Usage: find-session-files.sh <session-id>" >&2
    exit 2
fi

SESSION_ID="$1"

# Validate UUID format
if ! echo "$SESSION_ID" | grep -qE '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'; then
    echo "ERROR: Invalid session ID format." >&2
    echo "Expected UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" >&2
    echo "You can find session IDs in Claude's history or transcript filenames." >&2
    exit 2
fi

# --- Determine Claude Config Directory ---

find_claude_dir() {
    local candidates=()
    [ -n "${CLAUDE_CONFIG_DIR:-}" ] && candidates+=("$CLAUDE_CONFIG_DIR")
    [ -n "${XDG_DATA_HOME:-}" ] && candidates+=("$XDG_DATA_HOME/claude")
    [ -n "${XDG_CONFIG_HOME:-}" ] && candidates+=("$XDG_CONFIG_HOME/claude")
    candidates+=("${HOME}/.config/claude" "${HOME}/.claude")

    for dir in "${candidates[@]}"; do
        if [ -d "$dir/projects" ]; then
            echo "$dir"
            return 0
        fi
    done
    for dir in "${candidates[@]}"; do
        [ -d "$dir" ] && { echo "$dir"; return 0; }
    done
    echo "${HOME}/.claude"
    return 1
}

CLAUDE_DIR=$(find_claude_dir) || {
    echo "ERROR: Claude config directory not found." >&2
    echo "Checked: \$CLAUDE_CONFIG_DIR, \$XDG_DATA_HOME/claude, \$XDG_CONFIG_HOME/claude, ~/.config/claude, ~/.claude" >&2
    echo "Ensure Claude has been run at least once to create its config directory." >&2
    exit 2
}
PROJECTS_DIR="$CLAUDE_DIR/projects"
if [ ! -d "$PROJECTS_DIR" ]; then
    echo "ERROR: Projects directory not found at $PROJECTS_DIR" >&2
    echo "This directory is created when Claude records session transcripts." >&2
    echo "Ensure Claude has been run with --transcript or equivalent." >&2
    exit 2
fi

# --- Search for Session Files ---

MAIN_TRANSCRIPT=""
SUBAGENT_TRANSCRIPTS=()
PROJECT_DIR=""

# Find main session transcript
while IFS= read -r -d '' transcript_file; do
    MAIN_TRANSCRIPT="$transcript_file"
    PROJECT_DIR=$(dirname "$transcript_file")
    break
done < <(find "$PROJECTS_DIR" -name "${SESSION_ID}.jsonl" -type f -print0 2>/dev/null)

if [ -z "$MAIN_TRANSCRIPT" ]; then
    echo "ERROR: Session not found: $SESSION_ID" >&2
    echo "Searched in: $PROJECTS_DIR" >&2
    echo "The session may have been deleted, or the ID may be incorrect." >&2
    echo "List available sessions with: ls -la \"$PROJECTS_DIR\"/*/\"*.jsonl\" 2>/dev/null | head -20" >&2
    exit 1
fi

# Find related subagent transcripts
if [ -n "$PROJECT_DIR" ]; then
    while IFS= read -r agent_file; do
        grep -q "\"sessionId\":\"${SESSION_ID}\"" "$agent_file" 2>/dev/null && SUBAGENT_TRANSCRIPTS+=("$agent_file")
    done < <(find "$PROJECT_DIR" -name "agent-*.jsonl" -type f 2>/dev/null)
fi

# --- Extract Session Metadata ---

HISTORY_FILE="$CLAUDE_DIR/history.jsonl"
ORIGINAL_PROMPT=""
SESSION_SUMMARY=""
PROJECT_PATH=""
GIT_BRANCH=""
START_TIME=""
MESSAGE_COUNT=0

# Get original prompt and project from history.jsonl
if [ -f "$HISTORY_FILE" ]; then
    # Note: grep returns exit 1 for "no match" (expected) and exit 2 for errors
    # We use || true to allow missing entries - not every session is in history
    HISTORY_ENTRY=$(grep "\"sessionId\":\"${SESSION_ID}\"" "$HISTORY_FILE" 2>/dev/null | head -1) || true
    if [ -n "$HISTORY_ENTRY" ]; then
        ORIGINAL_PROMPT=$(echo "$HISTORY_ENTRY" | jq -r '.display // empty' 2>/dev/null) || true
        PROJECT_PATH=$(echo "$HISTORY_ENTRY" | jq -r '.project // empty' 2>/dev/null) || true
    fi
fi

# Get summary, branch, and timing from transcript
if [ -f "$MAIN_TRANSCRIPT" ]; then
    # Note: Missing metadata is common and expected (not all sessions have summaries, branches, etc.)
    # These extractions use || true to continue gracefully when data doesn't exist

    # Get AI-generated summary (type: "summary" record)
    SESSION_SUMMARY=$(grep '"type":"summary"' "$MAIN_TRANSCRIPT" 2>/dev/null | jq -r '.summary // empty' 2>/dev/null | head -1) || true

    # Get git branch from first message with gitBranch
    GIT_BRANCH=$(grep -m1 '"gitBranch"' "$MAIN_TRANSCRIPT" 2>/dev/null | jq -r '.gitBranch // empty' 2>/dev/null) || true

    # Get start time from first timestamp
    START_TIME=$(head -5 "$MAIN_TRANSCRIPT" 2>/dev/null | grep '"timestamp"' | head -1 | jq -r '.timestamp // empty' 2>/dev/null) || true

    # Count messages (approximate - count lines with "type":"user" or "type":"assistant")
    MESSAGE_COUNT=$(grep -c '"type":"user"\|"type":"assistant"' "$MAIN_TRANSCRIPT" 2>/dev/null) || MESSAGE_COUNT=0
fi

# --- Output Session Summary ---

echo "<session-summary>"
echo ""

# Metadata section
if [ -n "$ORIGINAL_PROMPT" ]; then
    echo "**Original Prompt:** $ORIGINAL_PROMPT"
    echo ""
fi

if [ -n "$SESSION_SUMMARY" ]; then
    echo "**Summary:** $SESSION_SUMMARY"
    echo ""
fi

[ -n "$PROJECT_PATH" ] && echo "**Project:** \`$PROJECT_PATH\`"
[ -n "$GIT_BRANCH" ] && echo "**Branch:** \`$GIT_BRANCH\`"
[ -n "$START_TIME" ] && echo "**Started:** $START_TIME"
[ "$MESSAGE_COUNT" -gt 0 ] && echo "**Messages:** ~$MESSAGE_COUNT"
echo ""

# Files section
echo "## Files"
echo ""
echo "**Main Transcript:** \`$MAIN_TRANSCRIPT\`"

if [ ${#SUBAGENT_TRANSCRIPTS[@]} -gt 0 ]; then
    echo ""
    echo "**Subagent Transcripts:**"
    for agent_file in "${SUBAGENT_TRANSCRIPTS[@]}"; do
        AGENT_ID=$(basename "$agent_file" .jsonl | sed 's/agent-//')
        echo "- \`$agent_file\` (agent: $AGENT_ID)"
    done
fi
echo ""

# Search instructions
echo "## Searching Session Content"
echo ""
echo "The transcript is JSONL (one JSON object per line). Avoid reading the entire file."
echo ""
echo "**Find user messages:**"
echo "\`\`\`bash"
echo "grep '\"type\":\"user\"' \"$MAIN_TRANSCRIPT\" | jq -c '.message.content' | head -20"
echo "\`\`\`"
echo ""
echo "**Find assistant text responses:**"
echo "\`\`\`bash"
echo "grep '\"type\":\"assistant\"' \"$MAIN_TRANSCRIPT\" | jq -c '.message.content[] | select(.type==\"text\") | .text' 2>/dev/null | head -50"
echo "\`\`\`"
echo ""
echo "**Search for specific content:**"
echo "\`\`\`bash"
echo "grep -i 'keyword' \"$MAIN_TRANSCRIPT\" | jq -c '.message.content // .toolUseResult // empty' | head -20"
echo "\`\`\`"
echo ""
echo "**List tool calls made:**"
echo "\`\`\`bash"
echo "grep '\"type\":\"assistant\"' \"$MAIN_TRANSCRIPT\" | jq -rc '.message.content[]? | select(.type==\"tool_use\") | .name' 2>/dev/null | sort | uniq -c | sort -rn"
echo "\`\`\`"
echo ""
echo "</session-summary>"

exit 0
