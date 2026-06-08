
<placeholder-variables>
[EFFORT] — Exploration depth briefed to a spawned developer child, chosen by the work's complexity (light, standard, or deep) per `./implementation-with-plan.md`'s `<effort-selection>`
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
- **All validations pass**: Proceed to Step 3: Select Evaluation Depth.
- **Failure**: Treat each failure's output as an initial finding, then proceed to Step 6: Dispatch Developer Wave. After Step 7: Validate and Commit, return to Step 2: Pre-Evaluation Validation.

## 3. Select Evaluation Depth

Diff the workspace against the baseline to see the full scope of changes. Select depth based on the number of changed files, types of changes, and runtime risk signals:

| Depth | What runs |
|-------|-----------|
| Standard | One `$runtime:card-failure-mode` evaluator child |
| Deep | One `$runtime:card-failure-mode` child + one `$runtime:card-experience-evaluator` child |

Choose **Deep** when the implementation touches many files, introduces new API boundaries, modifies shared state, adds significant async or error-path logic, or makes substantial changes to user-facing behavior.

The evaluator children form an ephemeral spawn tree under you. There is no team to create — you spawn the evaluators directly in Step 4, and they return their results to you when their tasks complete. Across revision rounds you re-engage the same lanes by spawning fresh evaluators with the prior findings inlined, or by sending a follow-up message to an evaluator that is still live (Step 8: Trigger Re-Evaluation).

## 4. Spawn Evaluators

Read the diff and the card before writing the spawn messages. Each message must reflect the specific nature of this implementation and this card, and must tell the child which `$skill` to use.

Based on depth:
- **Standard**: `spawn_agent` one `failure_mode` child.
- **Deep**: `spawn_agent` a `failure_mode` child and an `experience_evaluator` child so they run concurrently.

For the `failure_mode` child (`task_name: failure_mode`), the `message`:

```
Use the $runtime:card-failure-mode skill and follow it from the top. Draft the failure-mode questions for this implementation, then evaluate against them. Record each finding with a `FINDING:` marker and report a `VERDICT: APPROVED` or `VERDICT: CHANGES_REQUESTED` as your final message to me, the orchestrator that spawned you. On Deep depth I relay the experience-evaluator's findings to you for cross-evaluator critique; include any `CRITIQUE: <label>` responses in your report and I relay them back. After fix commits land I re-engage you to re-evaluate — extend the questions, triage prior findings, and report a fresh verdict.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Changes are relative to git tag: `implement/[CARD_ID]/baseline`

## Validation
All validation has passed. Focus on runtime behavior, semantic failures, and gaps the validation suite does not cover.

[Describe the specific failure risks this implementation presents. Where does the diff suggest the implementer's attention was concentrated, and where are the blind spots most likely? Which runtime paths are unexercised by tests, which contracts may drift silently, and which consumer assumptions break? Write this from what you found in the diff and the card, not as generic instructions.]
```

For **Deep**, also spawn the `experience_evaluator` child (`task_name: experience_evaluator`) with the `message`:

```
Use the $runtime:card-experience-evaluator skill and follow it from the top. Draft the user-outcome failure-mode questions, then evaluate by exercising the user entry points. Record each finding with a `FINDING:` marker and report a verdict as your final message to me, the orchestrator that spawned you. I relay the failure-mode evaluator's findings to you for cross-evaluator critique; include any `CRITIQUE: <label>` responses in your report and I relay them back. After fix commits land I re-engage you to re-evaluate — extend the questions, triage prior findings, and report a fresh verdict.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Changes are relative to git tag: `implement/[CARD_ID]/baseline`

## Validation
All validation has passed. Focus on what a user would experience as broken, wrong, or missing that the validation suite does not cover.

[Translate the card's requirements into user scenarios this implementation must satisfy: acceptance criteria to verify, user-facing entry points, what a user testing against the card should do and observe. Write this from what you found in the card, not as a generic description.]
```

## 5. Collect Verdicts and Route

Each evaluator child returns a structured final report to you when its task completes, and on a live re-evaluation reports a fresh verdict via the same channel. Each report carries two kinds of content:

- **`FINDING:` entries**: Record each finding (short label and body) so you can route it into a developer wave in Step 6 and, after fixes land, brief the evaluators on what changed. Keep what you need to do those two things — not a cross-referenced ledger.
- **`VERDICT:` line**: Record the verdict for this round.

On Deep depth you mediate cross-evaluator critique: relay each evaluator's `FINDING:` entries to the peer evaluator (via `send_message` if the peer is still live, or inlined into the peer's next spawn message), and relay any `CRITIQUE: <label>` an evaluator includes back to the evaluator it targets. If an evaluator verifies a relayed critique and folds it into its own findings, it returns that as a fresh `FINDING:` in its report. Treat each `FINDING:` as a record from its sender — do not deduplicate across evaluators. Two evaluators may legitimately raise the same underlying issue from different angles; the developer wave's message will inline both labels.

Continue until every spawned evaluator has reported a `VERDICT:` for the current round. Do not adjudicate findings — read each evaluator's `VERDICT:` line and route on the verdict, not your assessment of the findings. You may not override a verdict, reclassify a finding as a "limitation" or "follow-up," or document it as a known issue in lieu of fixing it.

Never Finalize on a partial set — every spawned evaluator must report `VERDICT: APPROVED` for the current round first. An evaluator that finished its task without a usable verdict, or that cannot run, is a judgment call: spawn a fresh replacement, or treat the evaluation as BLOCKED per the branch below if it cannot run.

A fresh replacement is a new child with no prior context. Spawn it through Step 4, evaluating the current HEAD from scratch — the "When Resuming" path does not apply to it. Inline the known prior-round findings for its lane into its spawn message so it does not have to rediscover them; it produces its own round-1 verdict, after which the normal Step 8 re-evaluation loop covers it like any other evaluator.

A mixed set — one evaluator approves while another requests changes — is CHANGES_REQUESTED; proceed to Step 6.

Based on the aggregated verdicts:
- **All APPROVED** (every spawned evaluator reported `VERDICT: APPROVED`): Proceed to Step 9: Finalize. This is the only path to Finalize. Do not accept fewer than the full evaluator set.
- **Any CHANGES_REQUESTED** (at least one evaluator reported `VERDICT: CHANGES_REQUESTED`, regardless of other evaluators' verdicts): Proceed to Step 6: Dispatch Developer Wave with the recorded findings. You do not fix evaluator findings — the developer wave does.
- **BLOCKED** (an evaluator names an external constraint preventing the fix): Document the constraint and the specific finding in a comment, add `blocked` to `tags` in `CARD.meta.json`, commit, let any still-live evaluators finish per Step 9: Finalize, and **STOP**.

## 6. Dispatch Developer Wave

Group the findings by coherence, using the same routing principle as `./implementation-with-plan.md`'s `<dispatch>`:
- **Independent files OR uniform fixes**: Parallel — concurrent developers, one commit after the group returns.
- **Dependent + varied + small**: Coherent — single developer for all findings, one commit.
- **Dependent + varied + substantial with clear gates**: Sequential — ordered developers with a validate-and-commit gate between phases.

When uncertain between Coherent and Sequential, choose **Sequential**.

Choose [EFFORT] per the same tiering as `./implementation-with-plan.md`'s `<effort-selection>`.

Developer children are spawned as leaves of the tree and receive no follow-up after spawn — same single-message style as `./implementation-with-plan.md`'s `<dispatch>`. Inline every finding the developer must address into its spawn `message`; do not stream new findings to a running developer. For Parallel routing, `spawn_agent` one developer child per independent group (descriptive `task_name` like `fix_group_1`) so they run concurrently. Each developer owns the files referenced in its assigned findings. The spawn `message`:

```
Use the $runtime:card-developer skill.

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
```

## 7. Validate and Commit

Wait for every developer child in the current group (Parallel, Coherent, or current Sequential phase) to return before validating.

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

Re-engage every evaluator lane against the revised implementation. If an evaluator is still live, `send_message` it the re-evaluation context by its task path; if its task already completed, `spawn_agent` a fresh child for that lane (per its skill's "When Resuming" path) and inline its prior findings plus the re-evaluation context into the spawn `message`. On Standard depth this is one lane (`failure_mode`); on Deep depth, re-engage both lanes.

The evaluator holds its own findings in context (when live) or receives them inlined (when re-spawned) — it does not need a label→SHA dictionary to know what it raised. Give it the commit range and a plain account of what the wave changed and why, and flag anything the wave could *not* fix (that is information the evaluator cannot derive from the diff). The evaluator re-checks against the new HEAD on its own judgment. The message:

```
The implementation has been updated to address the prior round's findings. Re-evaluate against the new HEAD.

Fix commits: implement/[CARD_ID]/baseline..HEAD (this wave: [SHA list])
What changed and why: [a plain account — which findings the wave addressed and how, in enough detail to re-check]
Not fixed: [any finding the wave could not address, and why — omit if none]

RE_EVALUATE
```

For Deep, deliver the same message to the `experience_evaluator` lane.

Each evaluator resumes its analysis (per its skill's "When Resuming for a Fixed Implementation" section) and reports a fresh verdict for this round. Return to Step 5: Collect Verdicts and Route. The loop continues until every evaluator reports `APPROVED`, or a BLOCKED branch fires.

## 9. Finalize

Do not enter this step unless every spawned evaluator has reported `VERDICT: APPROVED` for the current round, or the BLOCKED branch fired in Step 5. If you arrived here through any other path — including after applying fixes yourself — return to Step 5 and collect the remaining verdicts.

The evaluator children auto-terminate when their tasks complete; there is no team to tear down. Wait for any still-live evaluator to finish, and do not spawn new ones.

Do not modify gates in `CARD.meta.json`.

</instructions>
