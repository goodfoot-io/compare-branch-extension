<!-- @goodfoot/agent-skills source: skills-src/runtime/captain/references/shutdown.md.eta sha256:595b49e9ecb7568a54d0227ec21035d1b13480234bbd41b45b0241e42c5fb505 -->
<instructions>

At any natural terminal state — after a merge, after recording a blocker, or after all tasks are complete — check whether `EXIT_WHEN_DONE` is `true` in your environment context. If it is not set, stop here and continue normally.

If `EXIT_WHEN_DONE=true`:

1. Finish or roll back the current step and confirm both the workspace and card repository are clean. Do not signal while a commit, tool call, subagent, or background process is still active.
2. Tell Cards you are done, choosing the honest outcome:

```bash
cards "$CARD_ID" shutdown --outcome success
# or
cards "$CARD_ID" shutdown --outcome blocked --message "waiting on review"
# or
cards "$CARD_ID" shutdown --outcome error --message "what failed"
```

`--outcome` defaults to `success`; `--message` is optional free text. Exit 0 confirms the request was sent.

3. End the session cleanly. The action handler terminates this session gracefully in response to the signal — no kill commands are needed.

</instructions>
