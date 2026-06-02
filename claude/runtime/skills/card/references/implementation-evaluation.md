
<placeholder-variables>
[MODEL] — LLM model selection for developer subagent delegation (opus, sonnet, or haiku)
</placeholder-variables>

<instructions>

## 1. Stage Uncommitted Changes

**You must load the `cards:markdown` skill before the first commit.**

Commit any uncommitted workspace changes:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines> — describe the uncommitted changes]
COMMITMSG
)"
```

## 2. Pre-Evaluation Validation

Run validation per the plan's validation commands.

Based on the result:
- **All validations pass**: Proceed to Step 3: Create the Evaluation Team.
- **Failure**: Treat each failure's output as an initial finding, then proceed to Step 6: Dispatch Developer Wave (the team is not yet created; developers do not join the team in any case). After Step 7: Validate and Commit, return to Step 2: Pre-Evaluation Validation.

## 3. Create the Evaluation Team

Diff the workspace against the baseline to see the full scope of changes. Select depth based on the number of changed files, types of changes, and runtime risk signals:

| Depth | What runs |
|-------|-----------|
| Standard | One `failure-mode` subagent |
| Deep | One `failure-mode` subagent + one `experience-evaluator` subagent |

Choose **Deep** when the implementation touches many files, introduces new API boundaries, modifies shared state, adds significant async or error-path logic, or makes substantial changes to user-facing behavior.

Create the team — it persists across every revision round and is torn down only on terminal exit (Step 9: Finalize, or the BLOCKED branch in Step 5):

```xml
<invoke name="TeamCreate">
  <parameter name="team_name">card-impl-eval-[CARD_ID]</parameter>
  <parameter name="description">Implementation evaluation team for card [CARD_ID]</parameter>
</invoke>
```

Every evaluator dispatched in Step 4 joins the team via `team_name=card-impl-eval-[CARD_ID]`. Developers dispatched in Step 6 do **not** join the team.

## 4. Dispatch Evaluators

Read the diff and the card before writing the prompts. Each prompt must reflect the specific nature of this implementation and this card.

Evaluators run in the background so you can collect inbound DMs from them while they work. Both evaluators stay alive across revision rounds — re-evaluation in later rounds is triggered by a per-evaluator DM (Step 8: Trigger Re-Evaluation), so each evaluator's "When Resuming for a Fixed Implementation" section in its skill can resume against the updated workspace.

Based on depth:
- **Standard**: Dispatch one `failure-mode` evaluator.
- **Deep**: Dispatch `failure-mode` and `experience-evaluator` in a single message so they run concurrently.

```xml
<invoke name="Agent">
<parameter name="description">Failure mode analysis</parameter>
<parameter name="subagent_type">runtime:card:failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">failure-mode</parameter>
<parameter name="team_name">card-impl-eval-[CARD_ID]</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
**IMPORTANT: Load the `runtime:card-failure-mode` skill immediately.**

Follow the skill from the top. Draft the failure-mode questions for this implementation, then evaluate against them. DM each finding as `FINDING:` to `team-lead` (and on Deep depth, also DM `experience-evaluator`); DM critiques of the experience-evaluator's findings directly to `experience-evaluator` as `CRITIQUE: <label>`; DM a `VERDICT: APPROVED` or `VERDICT: CHANGES_REQUESTED` to `team-lead` when analysis is complete. The marker goes in the `summary` field; the body in `message`. The orchestrator DMs you a re-evaluation trigger after fix commits land — extend the questions, triage prior findings, and DM a new verdict.

## Team Name
Your team is `card-impl-eval-[CARD_ID]`. Roster discovery (`~/.claude/teams/card-impl-eval-[CARD_ID]/config.json`) uses this exact name.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Changes are relative to git tag: `implement/[CARD_ID]/baseline`

## Validation
All validation has passed. Focus on runtime behavior, semantic failures, and gaps the validation suite does not cover.

[Describe the specific failure risks this implementation presents. Where does the diff suggest the implementer's attention was concentrated, and where are the blind spots most likely? Which runtime paths are unexercised by tests, which contracts may drift silently, and which consumer assumptions break? Write this from what you found in the diff and the card, not as generic instructions.]
</parameter>
</invoke>
```

For **Deep**, add the second dispatch in the same message:

```xml
<invoke name="Agent">
<parameter name="description">Experience evaluation</parameter>
<parameter name="subagent_type">runtime:card:experience-evaluator</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">experience-evaluator</parameter>
<parameter name="team_name">card-impl-eval-[CARD_ID]</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
**IMPORTANT: Load the `runtime:card-experience-evaluator` skill immediately.**

Follow the skill from the top. Draft the user-outcome failure-mode questions, then evaluate by exercising the user entry points. DM each finding as `FINDING:` to `team-lead` and to `failure-mode`; DM critiques of the failure-mode evaluator's findings directly to `failure-mode` as `CRITIQUE: <label>`; DM a verdict to `team-lead` when analysis is complete. The marker goes in the `summary` field; the body in `message`. The orchestrator DMs you a re-evaluation trigger after fix commits land — extend the questions, triage prior findings, and DM a new verdict.

## Team Name
Your team is `card-impl-eval-[CARD_ID]`.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Changes are relative to git tag: `implement/[CARD_ID]/baseline`

## Validation
All validation has passed. Focus on what a user would experience as broken, wrong, or missing that the validation suite does not cover.

[Translate the card's requirements into user scenarios this implementation must satisfy: acceptance criteria to verify, user-facing entry points, what a user testing against the card should do and observe. Write this from what you found in the card, not as a generic description.]
</parameter>
</invoke>
```

## 5. Collect Verdicts and Route

Monitor inbound DMs from each evaluator. Each evaluator emits two kinds of DM addressed to you:

- **`FINDING:` DM**: Record the finding (short label and body) so you can route it into a developer wave in Step 6 and, after fixes land, brief the evaluators on what changed. Keep what you need to do those two things — not a cross-referenced ledger.
- **`VERDICT:` DM**: Record the verdict for this round.

Cross-evaluator critiques are exchanged as DMs between the evaluators (`CRITIQUE: <label>` from `failure-mode` to `experience-evaluator` and vice versa) and do not reach you. On Deep depth, evaluators also DM each other their `FINDING:` markers directly so they can critique each other's findings; you receive your own copy from each evaluator.

If an evaluator verifies a peer's CRITIQUE and folds it into its own findings, that finding will arrive at your inbox as a fresh `FINDING:` DM from the verifying evaluator. Treat each inbound `FINDING:` as a record from its sender — do not deduplicate across evaluators. Two evaluators may legitimately raise the same underlying issue from different angles; the developer wave's prompt will inline both labels.

Continue until every dispatched evaluator has DM'd a `VERDICT:` for the current round. Do not adjudicate findings — read each evaluator's `VERDICT:` line and route on the verdict, not your assessment of the findings. You may not override a verdict, reclassify a finding as a "limitation" or "follow-up," or document it as a known issue in lieu of fixing it.

Never Finalize on a partial set — every dispatched evaluator must DM `VERDICT: APPROVED` for the current round first. An incomplete set while another evaluator is still working is expected; continue waiting. An evaluator that has exited without a verdict, or is unresponsive to a direct status DM, is not a wait but a judgment call: re-dispatch a replacement, or treat the evaluation as BLOCKED per the branch below if it cannot run.

A re-dispatched replacement is a fresh agent with no prior context. Dispatch it through Step 4 into the same `card-impl-eval-[CARD_ID]` team, evaluating the current HEAD from scratch — the "When Resuming" path does not apply to it. Inline the known prior-round findings for its lane into its dispatch prompt so it does not have to rediscover them; it produces its own round-1 verdict, after which the normal Step 8 re-evaluation loop covers it like any other evaluator.

A mixed set — one evaluator approves while another requests changes — is CHANGES_REQUESTED; proceed to Step 6.

Based on the aggregated verdicts:
- **All APPROVED** (every dispatched evaluator has DM'd `VERDICT: APPROVED`): Proceed to Step 9: Finalize. This is the only path to Finalize. Do not accept fewer than the full evaluator set.
- **Any CHANGES_REQUESTED** (at least one evaluator has DM'd `VERDICT: CHANGES_REQUESTED`, regardless of other evaluators' verdicts): Proceed to Step 6: Dispatch Developer Wave with the recorded findings. You do not fix evaluator findings — the developer wave does.
- **BLOCKED** (an evaluator names an external constraint preventing the fix): Document the constraint and the specific finding in a comment, add `blocked` to `tags` in `CARD.meta.json`, commit, tear down the team per Step 9: Finalize (shutdown each evaluator, wait, then `TeamDelete`), and **STOP**.

## 6. Dispatch Developer Wave

Group the findings by coherence, using the same routing principle as `./implementation-with-plan.md`'s `<dispatch>`:
- **Independent files OR uniform fixes**: Parallel — concurrent developers, one commit after the group returns.
- **Dependent + varied + small**: Coherent — single developer for all findings, one commit.
- **Dependent + varied + substantial with clear gates**: Sequential — ordered developers with a validate-and-commit gate between phases.

When uncertain between Coherent and Sequential, choose **Sequential**.

Choose [MODEL] per the same tiering as `./implementation-with-plan.md`'s `<model-selection>`.

Developers are **not** team members and receive no follow-up after dispatch — same single-prompt style as `./implementation-with-plan.md`'s `<dispatch>`. Inline every finding the developer must address into its initial prompt; do not stream new findings to a running developer. For Parallel routing, dispatch concurrent developers by placing multiple foreground `<invoke>` blocks in a single message — they execute in parallel without backgrounding. Each developer owns the files referenced in its assigned findings.

```xml
<invoke name="Agent">
<parameter name="description">Apply review fixes ([SCOPE_SUMMARY])</parameter>
<parameter name="subagent_type">runtime:card:developer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="run_in_background">false</parameter>
<parameter name="prompt">
## Task
Apply fixes for the findings below. Do not run full validation and do not commit — the orchestrator validates and commits after you return.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
HEAD reflects the implementation under evaluation. The implementation baseline is git tag `implement/[CARD_ID]/baseline`.

## Findings

### [short label]
[full finding body — include the file or runtime path it applies to]

[Repeat per finding assigned to this developer.]

## File Ownership
This work owns: [absolute paths the findings touch — do not modify files outside this set without orchestrator confirmation]

## Guidelines
- Apply the fix for every finding above
- Keep changes minimal and focused on the findings
- Follow existing patterns

## Success Criteria
- [ ] Every finding addressed
- [ ] Types correct
- [ ] Follows existing patterns
</parameter>
</invoke>
```

## 7. Validate and Commit

Wait for every developer in the current group (Parallel, Coherent, or current Sequential phase) to return before validating.

Lint and typecheck per CLAUDE.md `<validation>`. Re-run only the failing test or suite until it passes; broaden to the changed package's suite once green, and defer cross-package or full-validation runs to Step 2: Pre-Evaluation Validation.

Based on the combined result:
- **All validations pass**: Commit the group's changes per `<workspace-commit-style>` and `<markdown-guidelines>`. If you arrived from Step 2: Pre-Evaluation Validation, return there. Otherwise proceed to Step 8: Trigger Re-Evaluation.
- **Developer-introduced error** (syntax error, import correction, config typo, test polyfill): Fix inline and re-run the validations above. These are mechanical corrections to errors the developer wave introduced — not resolutions of evaluator findings. If the fix addresses an evaluator finding, discard and re-dispatch per the next bullet.
- **Error requires implementation changes**: Discard the group's uncommitted work and re-dispatch per Step 6: Dispatch Developer Wave with regrouped findings (split a too-large group into smaller ones if a single developer's work failed to cohere; combine related findings if separate developers produced conflicting changes).

Commit on success — you own every commit; developers do not commit:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
```

NEEDS_REVISION rollback:

```bash
git restore .
git clean -fd
```

## 8. Trigger Re-Evaluation

The team and its evaluators are still alive. DM a re-evaluation trigger to every dispatched evaluator. On Standard depth this is one DM (`failure-mode`); on Deep depth, place both DMs in a single message so they fan out concurrently.

The evaluator holds its own findings in context — it does not need a label→SHA dictionary to know what it raised. Give it the commit range and a plain account of what the wave changed and why, and flag anything the wave could *not* fix (that is information the evaluator cannot derive from the diff). The evaluator re-checks against the new HEAD on its own judgment.

```xml
<invoke name="SendMessage">
  <parameter name="to">failure-mode</parameter>
  <parameter name="summary">Re-evaluate against revised implementation</parameter>
  <parameter name="message">
The implementation has been updated to address the prior round's findings. Re-evaluate against the new HEAD.

Fix commits: implement/[CARD_ID]/baseline..HEAD (this wave: [SHA list])
What changed and why: [a plain account — which findings the wave addressed and how, in enough detail to re-check]
Not fixed: [any finding the wave could not address, and why — omit if none]

RE_EVALUATE
  </parameter>
</invoke>
```

For Deep, send the same message to `experience-evaluator` in the same dispatch.

Each evaluator resumes its analysis (per its skill's "When Resuming for a Fixed Implementation" section) and DMs a fresh verdict for this round. Return to Step 5: Collect Verdicts and Route. The loop continues until every evaluator DMs `APPROVED`, or a BLOCKED branch fires.

## 9. Finalize

Do not enter this step unless every dispatched evaluator has DM'd `VERDICT: APPROVED` for the current round, or the BLOCKED branch fired in Step 5. If you arrived here through any other path — including after applying fixes yourself — return to Step 5 and collect the remaining verdicts.

Send a shutdown request to every still-running evaluator in the team. On Standard depth this is one DM (`failure-mode`); on Deep depth, place both DMs in a single message so they fan out concurrently:

```xml
<invoke name="SendMessage">
  <parameter name="to">failure-mode</parameter>
  <parameter name="message">{"type": "shutdown_request"}</parameter>
</invoke>
```

Wait for every evaluator to shut down before tearing down the team:

```xml
<invoke name="TeamDelete" />
```

Do not modify gates in `CARD.meta.json`.

</instructions>
