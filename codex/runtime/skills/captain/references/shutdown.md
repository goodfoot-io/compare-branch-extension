<instructions>

Before shutdown, finish or roll back the current step and confirm both the workspace and card repository are clean. Then read the installed `card/references/shutdown.md` in this runtime plugin and follow its `<instructions>` exactly.

Do not discover or signal a PID directly. If the card shutdown reference or its executable is missing, fail closed and ask the user to close the Codex session manually; never use `SIGKILL`.

</instructions>
