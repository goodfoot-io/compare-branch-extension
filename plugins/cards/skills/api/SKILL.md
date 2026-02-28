---
name: api
description: Manage cards in the VSCode "Cards" extension.
---

# Cards API

Use the CLI binaries below to manage cards and comparisons. For operations not covered by the CLI (comments, plans, branches, streams, etc.), use the REST API Reference at the bottom of this document. The user will be notified when you create a card or add a comment.

<card-status>
- **in_progress**: The agent is actively working on this card.
- **todo**: This card is ready for implementation.
- **needs_review**: This card is awaiting feedback from the user (includes plan approval and implementation review).
- **done**: The card is complete and needs no additional review.
- **backlog**: The card is still under consideration. Do not modify or work on cards in the backlog.
- **archived**: This card has been archived and is no longer in the active workflow.
</card-status>

<plan-approval>
When a card has `gates.planRequired: true`, present a plan for user approval before beginning implementation.

1. Store the plan via the Plan REST API endpoint (`PUT /cards/{cardId}/plan`)
2. Add a comment with code references reviewed during planning
3. Wait for user approval before proceeding

The plan content is accessible via the Plan REST API endpoint (`GET /cards/{cardId}/plan`). See the REST API Reference below for details.
</plan-approval>

<reload-after-compaction>
You must reload this skill after compaction.
</reload-after-compaction>

## CLI Binaries

### card.mjs — Card operations

Read, create, start, and stop card sessions. Locates the server through `~/.cards/cards-api.json`.

```!
eval "$(${CLAUDE_PLUGIN_ROOT}/bin/discover-api.sh)"
echo "# API connection (port and token may change between sessions)"
echo "eval \"\$(${CLAUDE_PLUGIN_ROOT}/bin/discover-api.sh)\""
echo ""
echo "# Example: Get a card"
echo "\$NODE \${CLAUDE_PLUGIN_ROOT}/bin/card.mjs <card-id>"
```

#### Commands

**Get a card** — Fetch card details by ID:
```
$NODE ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs <card-id>
```

**Create a card** — Pipe JSON to stdin with `title` (required) and `description` (required). Optional: `tags`, `environment`, `gates`:
```
$NODE ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs create <<'EOF'
{ "title": "Fix auth", "description": "Token refresh fails", "tags": ["bug"] }
EOF
```

**Start a session** — Associate this Claude session with a card. Registers the workspace branch and flushes any pending commits:
```
$NODE ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs start <card-id>
```
Always call `start` before your first code change on a card. This establishes commit attribution.

**Stop a session** — Disassociate this Claude session from its card:
```
$NODE ${CLAUDE_PLUGIN_ROOT}/bin/card.mjs stop
```

### compare.mjs — Compare operations

Manage the attribution tree comparison mode. One active comparison per server.

#### Commands

**Set comparison** — Pipe a JSON request to stdin. Three shapes are supported. All three accept an optional `"title"` field; when present, the title overrides the derived ref-based title in the attribution tree view sidebar.

Branch range — compare two arbitrary refs:
```
$NODE ${CLAUDE_PLUGIN_ROOT}/bin/compare.mjs set <<'EOF'
{ "baseRef": "main", "compareRef": "feature-branch", "title": "My Comparison" }
EOF
```

Dynamic worktree — track a worktree's HEAD live:
```
$NODE ${CLAUDE_PLUGIN_ROOT}/bin/compare.mjs set <<'EOF'
{ "baseRef": "main", "repositoryPath": "/workspace/.worktrees/cards/main-4/1", "title": "Card Changes" }
EOF
```

Fixed attribution — show pre-computed SHAs against a ref:
```
$NODE ${CLAUDE_PLUGIN_ROOT}/bin/compare.mjs set <<'EOF'
{ "compareRef": "main", "attributionShas": ["abc123", "def456"], "title": "Squash Attribution" }
EOF
```

**Get current comparison**:
```
$NODE ${CLAUDE_PLUGIN_ROOT}/bin/compare.mjs get
```

**Clear comparison**:
```
$NODE ${CLAUDE_PLUGIN_ROOT}/bin/compare.mjs clear
```
