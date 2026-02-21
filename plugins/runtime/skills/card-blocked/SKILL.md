---
name: blocked
description: Handle blocked cards by reporting blockers.
---

<placeholder-variables>
[REFERENCED CARD ID] — The card ID extracted from blocker keywords ("blocked by", "waiting on", "depends on") in the description or comments
</placeholder-variables>

<instructions>

Do not attempt implementation until the blocker is resolved.

## 1. Analyze Blocker

Search the card description and comments for blocker keywords ("blocked by", "waiting on", "depends on"). Identify all blocker reasons and referenced card IDs. If multiple blockers are found, check each referenced card's status. All blockers must be resolved before removing the "blocked" tag.

Based on blocker analysis:
- **Blocker references another card**: Look up its metadata and check its status

  ```bash
  $NODE !` echo $CLAUDE_PLUGIN_ROOT`/bin/card.mjs [REFERENCED CARD ID]
  ```

  The output is JSON containing the card's metadata (status, tags, gates) and `repositoryPath`.

  - **If resolved (status = "done")**: Remove the "blocked" tag from `CARD.meta.json` and re-invoke routing

    ```bash
    cd $CARD_REPO_PATH
    $NODE -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); d.tags=d.tags.filter(t=>t!=='blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
    git add CARD.meta.json
    git commit -m "unblocked: blocker resolved"  # <card-repo-commit-style>
    ```

  - **If not resolved**: Continue to Step 2
- **Blocker cannot be identified**: Post a comment asking for clarification and stop

  ```bash
  cd $CARD_REPO_PATH
  export COMMENT_ID=$($NODE !` echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
  cat <<'EOF' > comment/$COMMENT_ID.md
  [clarification request: describe what blocker information is missing and what the user should provide]
  EOF
  git add comment/$COMMENT_ID.md
  git commit -m "clarification needed: blocker details missing"  # <card-repo-commit-style>
  ```

## 2. Report Blocked Status

Skip if a comment already exists containing "## Blocked" that describes the same blocker(s). If the blocker reason has changed since the last "## Blocked" comment, do not skip — write a new comment with the updated reason.

## 3. Write Comment and Commit

Write a comment to the card repository explaining what is preventing progress, identifying the specific blocker (including any referenced card IDs), describing what action is needed to resolve it, and indicating that work will resume once the blocker is cleared.

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE !` echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[what is preventing progress, the specific blocker with any referenced card IDs, what action is needed to resolve it, and that work will resume once the blocker is cleared]
EOF
git add comment/$COMMENT_ID.md
git commit -m "blocked: [what and why]"  # <card-repo-commit-style>
```

**STOP** — Do not proceed until the blocker is resolved and the "blocked" tag is removed. Routing will re-evaluate once the tag is removed.

</instructions>
