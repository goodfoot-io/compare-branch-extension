# Interview Before Filing an Issue

Scope: interview process for gathering signal before filing a Cards extension bug via `cards-extension issue`.

## 1. Dispatch Research Immediately

Spawn `Explore` subagents in parallel with `run_in_background: true` before engaging the user. Research targets:
- The code path implicated by the error (symbol, file, caller/callee chain)
- Recent changes to that path via git log/blame (regression candidates)
- Test coverage of the path and known flaky history
- Error/log instrumentation already in place
- Adjacent failure modes the same code could exhibit

Do not block on research. Proceed to Step 2: Load Writing Skills while subagents run.

## 2. Load Writing Skills

Load `./issue-report-guide.md` — it defines the issue body structure this interview drives toward. Do NOT load the `cards:cards` variants; those target card creation.

## 3. Interview and Accumulate Findings

Interview the user conversationally. The commander's intent is built through the conversation, not drafted and approved as a document.

- Keep each exchange short. Reflect back what you're hearing and follow up on what matters underneath the report. Match the user's register — their vocabulary, level of formality, and concreteness.
- Use the `AskUserQuestion` tool for discrete classifications the user is best placed to pick:
  - Ask one question per turn. Batch only when a single scenario illustrates the whole cluster.
  - Attach several short "good" and "bad" scenarios to each option — concrete, one-line each — when picking exposes non-obvious downstream consequences.
  - Topic axes: regression vs. latent, reproducibility class, repro surface, source of expected behavior, repro-data shape.
  - Stay in chat for the reproduction narrative, observed-vs.-expected framing, and anything that risks freezing the user's hypothesis.
- Target what only the user can supply: reproduction specifics, environment, observed vs. expected, sensitivity of repro data, and workarounds — probe *how* a workaround makes the bug go away, which reveals its shape.
- Anchor in the user's frame: name the artifact, command, or moment they will actually see.
- Separate observation from interpretation; do not let the user's hypothesis narrow the investigation prematurely.

As research subagents return and the conversation settles pieces of the destination, hold findings, user answers, and rejected hypotheses in conversation state, shaped against the section structure in `./issue-report-guide.md`.

### Cards-Specific Evidence Collection

Collect from the Cards extension environment too. The debug skill's §1 fingerprint commands provide the baseline. Supplement with:

```bash
# Logs — select the most relevant subsystem (see find-logs.md for the inventory)
tail -100 ${WORKSPACE}/.cards/logs/<log-name>.log 2>/dev/null

# Discovery file — server state at time of failure
cat ~/.cards/cards-api.json 2>/dev/null | jq '{port, pid, buildTime}'

# Plugin cache — hook binary state
find ~/.claude/plugins/cache ~/.codex/plugins/cache -name 'hooks.json' -type f 2>/dev/null

# Worktree state — if the failure involves worktrees
git worktree list 2>/dev/null
cat .cards/CARD_ID 2>/dev/null || echo 'not card-bound'
```

## 4. File the Issue

When the destination is clear, compose the one-line title (Commander's Intent as a summary of what the conversation has settled) and check it with the user inline. Then file using the template in `./issue-report-guide.md`.

```bash
cards-extension issue <<'EOF'
{
  "title": "One-line summary checked with the user",
  "body": "..."
}
EOF
```

## 5. Constraints

- No fixes. No code, no remediation, no test stubs.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Never ask for the environment fingerprint or system info — the report auto-captures it.
- Do not ask the user how the bug currently affects them or to rate its severity — current-impact questions yield answers that are neither actionable nor relevant. Derive impact and blast radius from the reproduction and the affected code path, ranking by consequence rather than volume: silent data corruption outranks visible crashes.
- Ask only for the expected observable behavior, never for the resolution. Do not ask the user where the fix should live, which component to change, or which mechanism resolves the defect — the reporter supplies the symptom; choosing the fix is a later step.
- Report failing tests or broken builds you encounter during research in the issue body; do not remediate.

## 6. Finalize

After `cards-extension issue` succeeds, the issue opens in the default browser. Report to the user that the issue was filed with the title you used.

**STOP** — Interview complete. Do not proceed to implementation.

## Out of Scope

- Card creation workflows → `cards:cards` skill
- Report structure reference → `issue-report-guide.md`
- `cards-extension` CLI reference → `inspect-cli-tools.md`
- Decisions about whether a bug is in the Cards extension vs. another component — the debug skill's routing tables answer this before reaching the interview
