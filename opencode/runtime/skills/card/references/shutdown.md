<instructions>

Before shutdown, finish or roll back the current step and confirm both the workspace and card repository are clean. Do not invoke the shutdown command while a commit, tool call, subagent, or background process is still active.

Run the following command to gracefully end the session:

```bash
kill -SIGTERM $PPID
```

</instructions>
