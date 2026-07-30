<instructions>

Launch a batch of cards through their `launch` action, one at a time, in an order
that respects what loose dependencies exist between them. Never launch two cards
concurrently — agents on the same branch or on `main`'s ref lock will contend.

## 1. Inputs

- **[CARD_IDS]** — the set of card IDs to launch, already selected by the caller
  (e.g., from `cards list --status todo`, a tag search, or an explicit list). This
  skill starts from that set; it does not select it.

## 2. Determine an Informal Order

There is no formal dependency graph between cards — build a single heuristic
ordering, not a DAG solve:

- Fetch each card's relations to find pairwise links: `cards <id> --jsonpath
  '$.relations'` and `cards <id> --jsonpath '$.incomingRelations'`. Cluster
  cards that reference each other so related work lands close together in time.
- **A card in the set is about the launch tooling itself** (e.g., a bug in
  `cards action launch`, the CLI, or the extension): order it first. Fixing it
  early reduces false-failure noise for every launch after it.
- Where relations are absent, group remaining cards thematically by title/tags
  (e.g., all cards touching the same page or subsystem) so nearby launches don't
  re-discover the same context independently.
- State the resulting order and the reasoning before starting — this is a
  judgment call the caller should be able to see and correct.

## 3. Launch Each Card and Wait for `needs_review`

For each card ID in order:

```bash
cards <id> action launch --exit-when-done
```

- This call returns immediately with `{"success": true|false}` — it does **not**
  block until the launched work finishes, regardless of which flags are passed.
  Poll for completion separately:

```bash
prevst=""
while true; do
  st=$(cards <id> --jsonpath '$.status' 2>&1)   # never name this var `status` — zsh reserves it read-only
  [ "$st" != "$prevst" ] && { echo "<id> status: $st"; prevst=$st; }
  case "$st" in needs_review|done|archived) break ;; esac
  sleep 20
done
```

- **`cards action launch` can report a false timeout/error even though the
  action started successfully.** Do not treat a non-zero exit or `"success":
  false` as a real failure by itself — verify via `cards <id>
  --jsonpath '$.status'` reaching `active` (or beyond) before deciding the
  launch actually failed.
- **Never retry a launch call.** A duplicate dispatch spawns a second agent on
  the same card, and the two will fight over its worktree.
- Only start the next card's launch once the current one reaches `needs_review`
  (or `done`/`archived`) — that transition is set automatically when the
  action handler exits, and is the serialization point the whole loop depends on.
- `needs_review` **is** the review gate, not a stall. A card agent committing
  its work and moving to `needs_review` is the process working correctly —
  do not pause the queue or flag it as a concern.

## 4. Track and Report

- Represent each card as one task (TaskCreate/TaskUpdate or equivalent):
  mark it in_progress immediately before its launch call, completed the
  moment its status reaches `needs_review`. This gives the caller visible
  queue progress across a long-running batch.
- When the batch finishes, report each card ID with its final status, the
  order used, and the reasoning behind that order.

</instructions>
