#!/bin/bash
#
# Discovers the Cards API base URL for the current workspace.
#
# Requires CARD_WORKSPACE_PATH environment variable to be set by the Claude
# wrapper script (issue launcher). This ensures consistent API discovery
# regardless of the current working directory.
#
# Usage:
#   ./discover-workspace-api.sh
#
# Output:
#   The base URL for the Cards API (e.g., http://127.0.0.1:12345)
#
# Exit codes:
#   0 - Success, base URL printed to stdout
#   1 - Discovery file not found or API not available for workspace
#   2 - CARD_WORKSPACE_PATH environment variable is not set
#

set -euo pipefail

# Require CARD_WORKSPACE_PATH environment variable
if [ -z "${CARD_WORKSPACE_PATH:-}" ]; then
  echo "Error: CARD_WORKSPACE_PATH environment variable is not set." >&2
  echo "This script requires the Claude wrapper (issue launcher)." >&2
  echo "" >&2
  echo "Action required:" >&2
  echo "  - Launch Claude using the issue panel 'Launch Claude' button" >&2
  echo "  - Or use the agent-issue-dispatcher script" >&2
  exit 2
fi

DISCOVERY_FILE="$HOME/.cards/cards-api.json"

# Check if discovery file exists
if [ ! -f "$DISCOVERY_FILE" ]; then
  echo "Error: Discovery file not found at $DISCOVERY_FILE" >&2
  echo "Ensure VSCode is running with the Cards extension and cards.enableBranchIssues is enabled." >&2
  exit 2
fi

# The discovery file is a flat JSON object written by CardsServer:
#   { "port": N, "host": "...", "pid": N, "accessToken": "...", "startedAt": "..." }
PORT=$(jq -r '.port // empty' "$DISCOVERY_FILE" 2>/dev/null)
HOST=$(jq -r '.host // empty' "$DISCOVERY_FILE" 2>/dev/null)

if [ -z "$PORT" ] || [ -z "$HOST" ]; then
  echo "Error: No API instance found in discovery file" >&2
  exit 2
fi

echo "http://${HOST}:${PORT}"
