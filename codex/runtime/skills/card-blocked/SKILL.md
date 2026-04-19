---
name: card-blocked
description: Handle blocked cards by reporting blockers.
---

<placeholder-variables>
[REFERENCED CARD ID] — A card ID from the `relations` array in CARD.meta.json or referenced in the description or comments
</placeholder-variables>

<instructions>

Do not attempt implementation until the blocker is resolved.

## Preflight Check

```bash
command -v card >/dev/null 2>&1 || { echo 'Error: card CLI not found on PATH. Open VS Code with the Cards extension installed and run from an integrated terminal.' >&2; exit 1; }
```

## 1. Analyze Blocker

Read `CARD.meta.json` for `relations` entries that reference other cards. Read the card description and comments for context on what is blocking progress. Identify all blocker reasons and referenced card IDs.

- **Multiple blockers found**: Check each referenced card's status; all must be resolved before removing the "blocked" tag.

Based on blocker analysis:
- **Blocker references another card**: Look up its metadata and check its status

  ```bash
  card [REFERENCED CARD ID]
  ```

  The output is JSON containing the card's metadata (status, tags, gates) and `repositoryPath`.

  - **If resolved (status = "done")**: Remove `blocked` from `tags` in `CARD.meta.json`. Commit, then re-invoke routing.

  - **If not resolved**: Continue to Step 2
- **Blocker cannot be identified**: Post a comment asking for clarification and stop

  ```bash
  cd $CARD_REPO_PATH
  cat <<'EOF' > comment/clarify-blocker.md
  [clarification request: describe what blocker information is missing and what the user should provide]
  EOF
  git add comment/clarify-blocker.md
  git commit -m "[single sentence describing what blocker information is missing]"  # <card-repo-commit-style>
  ```

## 2. Report Blocked Status

Skip if a comment already exists containing "## Blocked" that describes the same blocker(s). If the blocker reason has changed since the last "## Blocked" comment, do not skip — write a new comment with the updated reason.

## 3. Write Comment and Commit

Write a comment explaining:
- What is preventing progress
- The specific blocker (including any referenced card IDs)
- What action is needed to resolve it

```bash
cd $CARD_REPO_PATH
cat <<'EOF' > comment/blocked-status.md
[what is preventing progress, the specific blocker with any referenced card IDs, what action is needed to resolve it, and that work will resume once the blocker is cleared]
EOF
git add comment/blocked-status.md
git commit -m "[single sentence describing what is blocking progress and what is needed to resolve it]"  # <card-repo-commit-style>
```

**STOP** — Do not proceed until the blocker is resolved and the "blocked" tag is removed. Routing will re-evaluate once the tag is removed.

</instructions>
