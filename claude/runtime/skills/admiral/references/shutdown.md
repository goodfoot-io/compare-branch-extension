<instructions>

Send both messages below regardless of whether `team-lead` resolves. If a call errors with no such recipient, you are the team lead — don't retry or search for one.

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

Then bring the current step to a clean stop (finish or roll back any in-progress commit, no dirty worktree) and end the session.

</instructions>
