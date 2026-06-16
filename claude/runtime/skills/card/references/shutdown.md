<instructions>

Run this:

```xml
<invoke name="SendMessage">
  <parameter name="to">main</parameter>
  <parameter name="summary">Shutdown request</parameter>
  <parameter name="message">{"type": "shutdown_request", "reason": "Shutdown requested"}</parameter>
</invoke>
```

Then approve with:

```xml
<invoke name="SendMessage">
  <parameter name="to">main</parameter>
  <parameter name="summary">Approve shutdown</parameter>
  <parameter name="message">{"type": "shutdown_response", "request_id": [REQUEST ID FROM shutdown_request], "approve": true}</parameter>
</invoke>
```

</instructions>
