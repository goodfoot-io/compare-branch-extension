<instructions>

At any natural terminal state — after a merge, after recording a blocker, or after all tasks are complete — check whether `EXIT_WHEN_DONE` is `true` in your environment context. If it is not set, stop here and continue normally.

If `EXIT_WHEN_DONE=true`:

1. If you are running inside a teammate team, send both messages below regardless of whether `team-lead` resolves. If a call errors with no such recipient, you are the team lead — don't retry or search for one.

```xml
<invoke name="SendMessage">
  <parameter name="to">team-lead</parameter>
  <parameter name="summary">Shutdown request</parameter>
  <parameter name="message">{"type": "shutdown_request", "reason": "Shutdown requested"}</parameter>
</invoke>
```

```xml
<invoke name="SendMessage">
  <parameter name="to">team-lead</parameter>
  <parameter name="summary">Approve shutdown</parameter>
  <parameter name="message">{"type": "shutdown_response", "request_id": [REQUEST ID FROM shutdown_request], "approve": true}</parameter>
</invoke>
```

2. Bring the workspace to a clean stop: finish or roll back any in-progress commit so both the workspace and card repository are clean. Do not signal while a commit, tool call, subagent, or background process is still active.
3. Tell Cards you are done, choosing the honest outcome:

```bash
cards "$CARD_ID" shutdown --outcome success
# or
cards "$CARD_ID" shutdown --outcome blocked --message "waiting on review"
# or
cards "$CARD_ID" shutdown --outcome error --message "what failed"
```

`--outcome` defaults to `success`; `--message` is optional free text. Exit 0 confirms the request was sent.

4. End the session cleanly. The action handler terminates this session gracefully in response to the signal — no kill commands are needed.

</instructions>
