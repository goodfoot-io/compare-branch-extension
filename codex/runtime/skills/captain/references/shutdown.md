<!-- @goodfoot/agent-skills source: public/skills-src/runtime/captain/references/shutdown.md.eta sha256:3f0b2de1beb43e9f56436d155ae74655773dd7572dcd2fdb80c85d924c207a60 -->
<instructions>

At any natural terminal state — after a merge, after recording a blocker, or after all tasks are complete — check whether `EXIT_WHEN_DONE` is `true` in your environment context. If it is not set, stop here and continue normally.

If `EXIT_WHEN_DONE=true`:

1. Finish or roll back every mutation, check, and commit; confirm both the workspace and card repository are clean; and wait until every subagent and background process has finished.
2. In your final assistant turn, make the shutdown command the sole tool call, choosing the honest outcome:

```bash
cards "$CARD_ID" shutdown --outcome success
# or
cards "$CARD_ID" shutdown --outcome blocked --message "waiting on review"
# or
cards "$CARD_ID" shutdown --outcome error --message "what failed"
```

`--outcome` defaults to `success`; `--message` is optional free text. Exit 0 confirms the request was sent.

Do not make any later tool call after the shutdown command. Delivery is not completion: the Codex Stop hook acknowledges readiness only after Cards proves the owned process tree is drained.

3. End the session cleanly. The action handler terminates this session gracefully in response to the signal — no kill commands are needed.

</instructions>
