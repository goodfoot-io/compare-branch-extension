<instructions>

Before shutdown, finish or roll back the current step and confirm both the workspace and card repository are clean. Do not invoke the shutdown command while a commit, tool call, subagent, or background process is still active.

Run the shutdown executable installed with this reference, deriving its path from this file rather than from the current working directory:

```bash
node "$(dirname "$(realpath "<ABSOLUTE shutdown.md PATH FROM THE STOP MESSAGE>")")/../bin/shutdown-codex.mjs"
```

Replace the angle-bracketed placeholder with the absolute `shutdown.md` path from the Stop-hook message. Do not search for or guess a PID yourself.

The executable must inherit `CARD_REPO_PATH` and `CARDS_SESSION_ID`. It selects and revalidates the exact Node launcher ancestor for the installed `@openai/codex/bin/codex.js`, sends that positive PID exactly `SIGTERM`, waits for its observed exit, and appends an audit record to `CARD_REPO_PATH/streams/codex-shutdown/CARDS_SESSION_ID.jsonl`.

Exit status 0 means the validated launcher exited gracefully. Any nonzero status is a fail-closed refusal or timeout: report its printed evidence and audit path, leave the session running, and ask the user to close the Codex session manually. Never target another PID, a process group, a shell, or the native Codex child; never retry with `SIGKILL`.

</instructions>
