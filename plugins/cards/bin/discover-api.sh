#!/bin/bash
#
# Discovers the Cards API connection details for the current workspace.
#
# Usage:
#   eval "$(./discover-api.sh)"
#   curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "$API_BASE/cards" | jq .
#
# Output:
#   Shell-evaluable variable assignments:
#     API_BASE="http://127.0.0.1:12345"
#     ACCESS_TOKEN="..."
#
# Exit codes:
#   0 - Success, variable assignments printed to stdout
#   2 - Discovery file not found or missing required fields
#

set -euo pipefail

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
TOKEN=$(jq -r '.accessToken // empty' "$DISCOVERY_FILE" 2>/dev/null)

if [ -z "$PORT" ] || [ -z "$HOST" ]; then
  echo "Error: No API instances found in discovery file" >&2
  exit 2
fi

if [ -z "$TOKEN" ]; then
  echo "Error: No accessToken found in discovery file" >&2
  exit 2
fi

echo "API_BASE=\"http://${HOST}:${PORT}\""
echo "ACCESS_TOKEN=\"${TOKEN}\""
