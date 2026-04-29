#!/bin/sh
# Wrapper script for cards-dev.mjs that resolves the Node.js binary
# from ~/.cards/VSCODE_NODE (extension-bundled) or falls back to PATH node.
#
# Generated as a build artifact by claude-code-hooks-api.
NODE=$(cat "$HOME/.cards/VSCODE_NODE" 2>/dev/null || echo node)
exec "$NODE" "$(dirname "$0")/cards-dev.mjs" "$@"
