# Interview Before Filing an Issue

Scope: interview process to gather enough signal for a well-formed bug report about the Cards extension before filing via `cards-extension issue`. Adapted from `cards:management`'s interview-bug-report with the same principles, targeting an issue body instead of a CARD.md file.

Source of truth: this file owns the interview process for Cards extension bug reports. The report structure this interview drives toward is `issue-report-guide.md`.

Completeness: covers every step from research dispatch through issue filing. Excludes card creation workflows (see `cards:management` skill).

Cross-refs: `issue-report-guide.md` (the report structure this interview drives toward), `inspect-cli-tools.md` (`cards-extension` CLI reference), `find-logs.md` (log evidence collection).

Parent: `../SKILL.md`

## First Principles

1. Reproducibility is the unit of truth — without it, everything else is speculation.
2. Observation and interpretation must be kept separate.
3. The environment is part of the bug: (code, state, inputs, environment) is the defect.
4. Severity tracks impact, not loudness. Silent data corruption outranks visible crashes.
5. Regression vs. latent defect changes the investigation entirely.
6. Missing observability is a defect of its own.
7. Workarounds are data — what makes the bug go away reveals its shape.

## 1. Dispatch Research Immediately

Spawn `Explore` subagents in parallel with `run_in_background: true` before engaging the user. Research targets:
- The code path implicated by the error (symbol, file, caller/callee chain)
- Recent changes to that path via git log/blame (regression candidates)
- Test coverage of the path and known flaky history
- Error/log instrumentation already in place
- Adjacent failure modes the same code could exhibit

Do not block on research. Proceed to Step 2: Load Writing Skills while subagents run.

## 2. Load Writing Skills

Load the writing guide `./issue-report-guide.md`. The writing guide defines the issue body structure this interview is driving toward. Do NOT load the `cards:management` variants — those target card creation.

## 3. Interview and Accumulate Findings

Interview the user conversationally. The commander's intent is built through the conversation, not drafted and approved as a document.

- Keep each exchange short. Reflect back what you're hearing and follow up on what matters underneath the report. Match the user's register — their vocabulary, level of formality, and concreteness.
- Use the `AskUserQuestion` tool for discrete classifications the user is best placed to pick:
  - Ask one question per turn. Batch only when a single scenario illustrates the whole cluster.
  - Attach several short "good" and "bad" scenarios to each option — concrete, one-line each — when picking exposes non-obvious downstream consequences.
  - Topic axes: regression vs. latent, reproducibility class, repro surface, source of expected behavior, repro-data shape.
  - Stay in chat for the reproduction narrative, observed-vs.-expected framing, and anything that risks freezing the user's hypothesis.
- Target what only the user can supply: reproduction specifics, environment, workarounds, observed vs. expected, sensitivity of repro data.
- Anchor in the user's frame: name the artifact, command, or moment they will actually see.
- Separate observation from interpretation; do not let the user's hypothesis narrow the investigation prematurely.

As research subagents return and as the conversation settles pieces of the destination, hold findings, user answers, and rejected hypotheses in conversation state, shaped against the section structure in `./issue-report-guide.md`. Separate observation from speculation as you go.

### Cards-Specific Evidence Collection

In addition to user-supplied information, collect evidence from the Cards extension environment. The debug skill's §1 fingerprint commands provide the baseline. Supplement with:

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

The issue body's Environment section auto-includes extension/VS Code version, platform, and node version via `generateCardUrl()` — do not ask the user for these.

## 4. File the Issue

When the destination is clear, compose the one-line title (Commander's Intent as a summary of what the conversation has settled) and check it with the user inline. Then file the issue using the template from `./issue-report-guide.md`. The body includes:

- The user's narrative (What happened, Steps to reproduce, Expected vs. Actual behavior)
- Investigation findings discovered in Step 1 and Step 3
- Environment fingerprint and relevant log tails (auto-collected — do not ask)
- Hypothesis if one emerged (framed as speculation)

```bash
cards-extension issue <<'EOF'
{
  "title": "One-line summary checked with the user",
  "body": "..."
}
EOF
```

The issue opens in the default browser with system information pre-populated by `generateCardUrl()`.

## 5. Constraints

- No fixes. No code, no remediation, no test stubs.
- Never ask the user to look something up. If it is recoverable by Glob/Grep/Read/git, find it yourself.
- Do not ask the user how the bug currently affects them or to rate its severity — current-impact questions yield answers that are neither actionable nor relevant. Derive impact and blast radius from the reproduction and the affected code path instead.
- Ask only for the expected observable behavior, never for the resolution. Do not ask the user where the fix should live, which component to change, or which mechanism resolves the defect — the reporter supplies the symptom; choosing the fix is a later step.
- Report failing tests or broken builds you encounter during research in the issue body; do not remediate.

## 6. Finalize

After `cards-extension issue` succeeds, the issue opens in the default browser. Report to the user that the issue was filed with the title you used.

**STOP** — Interview complete. Do not proceed to implementation.

## Out of Scope

- Card creation workflows → `cards:management` skill
- Report structure reference → `issue-report-guide.md`
- `cards-extension` CLI reference → `inspect-cli-tools.md`
- Decisions about whether a bug is in the Cards extension vs. another component — the debug skill's routing tables answer this before reaching the interview
