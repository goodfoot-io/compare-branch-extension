
<placeholder-variables>
[MODEL] — LLM model selection for developer subagent delegation (opus, sonnet, or haiku)
</placeholder-variables>

<instructions>

## 1. Stage Uncommitted Changes

**Every commit below follows the `<workspace-commit-style>` and `<markdown-guidelines>` conventions.**

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
- **All validations pass**: Proceed to Step 3: Dispatch Evaluators.
- **Failure**: Treat each failure's output as an initial finding, then proceed to Step 5: Dispatch Developer Wave. After Step 6: Validate and Commit, return to Step 2: Pre-Evaluation Validation.

## 3. Dispatch Evaluators

Diff `implement/[CARD_ID]/baseline..HEAD` to see the full scope of changes. Select depth based on the number of changed files, types of changes, and runtime risk signals:

| Depth | What runs |
|-------|-----------|
| Standard | One `failure-mode` subagent |
| Deep | One `failure-mode` subagent + one `experience-evaluator` subagent |

Choose **Deep** when the implementation touches many files, introduces new API boundaries, modifies shared state, adds significant async or error-path logic, or makes substantial changes to user-facing behavior.

The evaluators form an ad-hoc group purely by being named, and run in the background so you can collect their DMs while they work. After DMing a round's `VERDICT:` an evaluator goes idle and stops on its own; your Step 7 re-evaluation DM wakes it with its prior context, resuming at its skill's "When Resuming for a Fixed Implementation" section.

Read the diff and the card before writing the prompts. Each prompt must reflect the specific nature of this implementation and this card. Record the HEAD SHA you dispatch against and inline it in every prompt; the tree must be clean at dispatch.

Based on depth:
- **Standard**: Dispatch one `failure-mode` evaluator.
- **Deep**: Dispatch `failure-mode` and `experience-evaluator` in a single message so they run concurrently.

```xml
<invoke name="Agent">
<parameter name="description">Failure mode analysis</parameter>
<parameter name="subagent_type">runtime:card:failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">failure-mode</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
Follow the skill from the top. Draft the failure-mode questions for this implementation, then evaluate against them. DM each finding as `FINDING:` to `team-lead` (and on Deep depth, also DM `experience-evaluator`); DM critiques of the experience-evaluator's findings directly to `experience-evaluator` as `CRITIQUE: <label>`; DM a `VERDICT: APPROVED` or `VERDICT: CHANGES_REQUESTED` to `team-lead` when analysis is complete. Every DM follows your skill's `<dm-envelope>`. The orchestrator DMs you a re-evaluation trigger after fix commits land — extend the questions, triage prior findings, and DM a new verdict.

## Peers
The orchestrator is `team-lead`. On Deep depth, your peer evaluator is `experience-evaluator`.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Evaluate commit [HEAD_SHA]; changes are `implement/[CARD_ID]/baseline..HEAD`. Never evaluate the working tree — if `git status --porcelain` is non-empty, DM `team-lead` a question naming the dirty paths, and yield.

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
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
Follow the skill from the top. Draft the user-outcome failure-mode questions, then evaluate by exercising the user entry points. DM each finding as `FINDING:` to `team-lead` and to `failure-mode`; DM critiques of the failure-mode evaluator's findings directly to `failure-mode` as `CRITIQUE: <label>`; DM a verdict to `team-lead` when analysis is complete. Every DM follows your skill's `<dm-envelope>`. The orchestrator DMs you a re-evaluation trigger after fix commits land — extend the questions, triage prior findings, and DM a new verdict.

## Peers
The orchestrator is `team-lead`. Your peer evaluator is `failure-mode`.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Evaluate commit [HEAD_SHA]; changes are `implement/[CARD_ID]/baseline..HEAD`. Never exercise the working tree — if `git status --porcelain` is non-empty, DM `team-lead` a question naming the dirty paths, and yield.

## Validation
All validation has passed. Focus on what a user would experience as broken, wrong, or missing that the validation suite does not cover.

[Translate the card's requirements into user scenarios this implementation must satisfy: acceptance criteria to verify, user-facing entry points, what a user testing against the card should do and observe. Write this from what you found in the card, not as a generic description.]
</parameter>
</invoke>
```

## 4. Collect Verdicts and Route

Monitor inbound DMs from each evaluator. Each evaluator emits two kinds of DM addressed to you:

- **`FINDING:` DM**: Record the finding (short label and body) so you can route it into a developer wave in Step 5 and, after fixes land, brief the evaluators on what changed. Keep what you need to do those two things — not a cross-referenced ledger.
- **`VERDICT:` DM**: Record the verdict for this round.

Cross-evaluator critiques are exchanged as DMs between the evaluators (`CRITIQUE: <label>` from `failure-mode` to `experience-evaluator` and vice versa) and do not reach you. On Deep depth, evaluators also DM each other their `FINDING:` markers directly so they can critique each other's findings; you receive your own copy from each evaluator.

A verified peer CRITIQUE arrives as a fresh `FINDING:` DM from the verifying evaluator. Do not deduplicate across evaluators — two evaluators may legitimately raise the same underlying issue from different angles, and the developer wave's prompt inlines both labels.

Continue until every dispatched evaluator has DM'd a `VERDICT:` for the current round. Do not adjudicate findings — read each evaluator's `VERDICT:` line and route on the verdict, not your assessment of the findings. You may not override a verdict, reclassify a finding as a "limitation" or "follow-up," or document it as a known issue in lieu of fixing it.

An `idle_notification` means the evaluator's process has stopped; it runs again only when an inbound message wakes it. Idle after DMing this round's `VERDICT:` is the normal settled state. Idle **without** it, the evaluator will never act again on its own — wake it with a DM that inlines whatever it is waiting on; task-notifications for work it delegated may be delivered to you, not to it, so forward those results in the wake-up DM.

An evaluator that yielded on a dirty tree is the exception. Commit or revert the outstanding changes, then wake it with the new HEAD SHA — never re-dispatch, which would re-open findings already accepted.

Otherwise, if it idles again without a verdict, or cannot run, re-dispatch a replacement (or BLOCKED per the branch below).

A re-dispatched replacement is a fresh agent with no prior context. Dispatch it through Step 3 under the same name as the evaluator it replaces, evaluating the current HEAD from scratch — the "When Resuming" path does not apply to it. Point it at its lane's questions note in the card repository's `notes/` (`failure-mode-questions` or `user-outcome-questions`) and inline the known prior-round findings for its lane into its dispatch prompt; it produces its own round-1 verdict, after which the normal Step 7 re-evaluation loop covers it like any other evaluator.

A mixed set — one evaluator approves while another requests changes — is CHANGES_REQUESTED; proceed to Step 5.

Based on the aggregated verdicts:
- **All APPROVED** (every dispatched evaluator has DM'd `VERDICT: APPROVED`): Proceed to Step 8: Finalize. This is the only path to Finalize. Do not accept fewer than the full evaluator set.
- **Any CHANGES_REQUESTED** (at least one evaluator has DM'd `VERDICT: CHANGES_REQUESTED`, regardless of other evaluators' verdicts): Proceed to Step 5: Dispatch Developer Wave with the recorded findings. You do not fix evaluator findings — the developer wave does.
- **BLOCKED** (an evaluator names an external constraint preventing the fix): Document the constraint and the specific finding in a comment, add `blocked` to `tags` in `CARD.meta.json`, commit, then **STOP**. An evaluator that has DM'd its verdict has already gone idle and stopped; if a peer evaluator is still working and you want to stop it early, DM it a `shutdown_request` per Step 8.

## 5. Dispatch Developer Wave

Group the findings by coherence, using the same routing principle as `./implementation-with-plan.md`'s `<dispatch>`:
- **Independent files OR uniform fixes**: Parallel — concurrent developers, one commit after the group returns. Before dispatching, confirm each developer's "File Ownership" set is disjoint from every other developer's in the same group — if any file overlaps, route Coherent or Sequential instead.
- **Dependent + varied + small**: Coherent — single developer for all findings, one commit.
- **Dependent + varied + substantial with clear gates**: Sequential — ordered developers with a validate-and-commit gate between phases.

When uncertain between Coherent and Sequential, choose **Sequential**.

Choose [MODEL] per the same tiering as `./implementation-with-plan.md`'s `<model-selection>`.

Developers are **not** part of the evaluation group and receive no follow-up after dispatch — same single-prompt style as `./implementation-with-plan.md`'s `<dispatch>`. Inline every finding the developer must address into its initial prompt; do not stream new findings to a running developer. For Parallel routing, dispatch concurrent developers by placing multiple foreground `<invoke>` blocks in a single message — they execute in parallel without backgrounding. Each developer owns the files referenced in its assigned findings.

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

## 6. Validate and Commit

Wait for every developer in the current group (Parallel, Coherent, or current Sequential phase) to return before validating.

Developers do not commit — record the group's pre-dispatch HEAD SHA before delegating in Step 5, and on return compare it to current HEAD. If HEAD moved, a developer committed despite the constraint: `git reset --soft <pre-dispatch-SHA>` before validating, so the group's work folds into the single commit this step produces rather than leaving a stray commit ahead of it.

Lint and typecheck per the project's CLAUDE.md validation conventions. Re-run only the failing test or suite until it passes; broaden to the changed package's suite once green, and defer cross-package or full-validation runs to Step 2: Pre-Evaluation Validation.

Based on the combined result:
- **All validations pass**: Commit the group's changes per `<workspace-commit-style>` and `<markdown-guidelines>`. If you arrived from Step 2: Pre-Evaluation Validation, return there. Otherwise proceed to Step 7: Trigger Re-Evaluation.
- **Developer-introduced error** (syntax error, import correction, config typo, test polyfill): Fix inline and re-run the validations above. These are mechanical corrections to errors the developer wave introduced — not resolutions of evaluator findings. If the fix addresses an evaluator finding, discard and re-dispatch per the next bullet.
- **Error requires implementation changes**: Discard the group's uncommitted work and re-dispatch per Step 5: Dispatch Developer Wave with regrouped findings (split a too-large group into smaller ones if a single developer's work failed to cohere; combine related findings if separate developers produced conflicting changes).

Commit on success — you own every commit; developers do not commit:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
```

Discarding uncommitted work for re-dispatch:

```bash
git restore .
git clean -fd
```

## 7. Trigger Re-Evaluation

DM a re-evaluation trigger to every dispatched evaluator. On Standard depth this is one DM (`failure-mode`); on Deep depth, place both DMs in a single message so they fan out concurrently.

The evaluator holds its own findings in context. Give it the new HEAD SHA, the commit range, a plain account of what the wave changed and why, and anything the wave could *not* fix. The evaluator re-checks against the new HEAD on its own judgment.

```xml
<invoke name="SendMessage">
  <parameter name="to">failure-mode</parameter>
  <parameter name="summary">Re-evaluate against revised implementation</parameter>
  <parameter name="message">
RE_EVALUATE
---
The implementation has been updated to address the prior round's findings. Re-evaluate against commit [HEAD_SHA]; the tree is clean at that commit.

Fix commits: implement/[CARD_ID]/baseline..HEAD (this wave: [SHA list])
What changed and why: [a plain account — which findings the wave addressed and how, in enough detail to re-check]
Not fixed: [any finding the wave could not address, and why — omit if none]
  </parameter>
</invoke>
```

For Deep, send the same message to `experience-evaluator` in the same dispatch.

Each evaluator resumes its analysis (per its skill's "When Resuming for a Fixed Implementation" section) and DMs a fresh verdict for this round. Return to Step 4: Collect Verdicts and Route. The loop continues until every evaluator DMs `APPROVED`, or a BLOCKED branch fires.

## 8. Finalize

Do not enter this step unless every dispatched evaluator has DM'd `VERDICT: APPROVED` for the current round, or the BLOCKED branch fired in Step 4. If you arrived here through any other path — including after applying fixes yourself — return to Step 4 and collect the remaining verdicts.

Every evaluator that DM'd `VERDICT: APPROVED` for this round has already gone idle — proceed directly. Only if an evaluator is still actively working and you want to stop it early, DM it `{"type": "shutdown_request"}` (this wakes it if already idle, then it exits). On Standard depth there is one evaluator (`failure-mode`); on Deep depth, send the request to both `failure-mode` and `experience-evaluator` in a single message:

```xml
<invoke name="SendMessage">
  <parameter name="to">failure-mode</parameter>
  <parameter name="summary">Shutdown request</parameter>
  <parameter name="message">{"type": "shutdown_request", "reason": "Evaluation complete"}</parameter>
</invoke>
```

Do not modify gates in `CARD.meta.json`.

</instructions>
