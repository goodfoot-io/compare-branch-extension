#!/bin/bash
#
# Discovers the Issues API base URL for the current workspace.
#
# Usage:
#   ./discover-api.sh
#
# Output:
#   The base URL for the Issues API (e.g., http://127.0.0.1:12345/api/v1)
#
# Exit codes:
#   0 - Success, base URL printed to stdout
#   1 - Discovery file not found or API not available for workspace
#

set -euo pipefail

DISCOVERY_FILE="$HOME/.compare-branch/issues-api.json"
WORKSPACE=$(pwd)

# Check if discovery file exists
if [ ! -f "$DISCOVERY_FILE" ]; then
  echo "Error: Discovery file not found at $DISCOVERY_FILE" >&2
  echo "Ensure VSCode is running with the Compare Branch extension and compareBranch.enableBranchIssues is enabled." >&2
  exit 2
fi

# Get port and host for current workspace (or first available if not found)
PORT=$(jq -r --arg ws "$WORKSPACE" '.[$ws].port // empty' "$DISCOVERY_FILE" 2>/dev/null)
HOST=$(jq -r --arg ws "$WORKSPACE" '.[$ws].host // empty' "$DISCOVERY_FILE" 2>/dev/null)

# Fall back to first available instance if workspace not found
if [ -z "$PORT" ] || [ -z "$HOST" ]; then
  PORT=$(jq -r 'to_entries[0].value.port // empty' "$DISCOVERY_FILE" 2>/dev/null)
  HOST=$(jq -r 'to_entries[0].value.host // empty' "$DISCOVERY_FILE" 2>/dev/null)
fi

if [ -z "$PORT" ] || [ -z "$HOST" ]; then
  echo "Error: No API instances found in discovery file" >&2
  exit 2
fi

echo "http://${HOST}:${PORT}/api/v1"
