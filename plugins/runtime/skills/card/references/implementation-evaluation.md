
<placeholder-variables>
[MODEL] — LLM model selection for developer subagent delegation (opus, sonnet, or haiku)
</placeholder-variables>

<instructions>

## 1. Stage Uncommitted Changes

**You must load the `cards:markdown` and `runtime:workspace-commit-style` skills before the first commit.**

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
- **All validations pass**: Proceed to Step 3: Evaluate with Team.
- **Failure**: Treat each failure's output as an initial finding, then proceed to Step 5: Dispatch Developer Wave. After the wave's Step 5.1: Validate and Commit gate passes, return to Step 2: Pre-Evaluation Validation.

## 3. Evaluate with Team

Diff the workspace against the baseline to see the full scope of changes. Select depth based on the number of changed files, types of changes, and runtime risk signals:

| Depth | What runs |
|-------|-----------|
| Standard | One `failure-mode` subagent |
| Deep | One `failure-mode` subagent + one `experience-evaluator` subagent |

Choose **Deep** when the implementation touches many files, introduces new API boundaries, modifies shared state, adds significant async or error-path logic, or makes substantial changes to user-facing behavior.

### 3.1 Create Evaluation Team

```xml
<invoke name="TeamCreate">
  <parameter name="team_name">card-impl-eval-[CARD_ID]</parameter>
  <parameter name="description">Implementation evaluation team for card [CARD_ID]</parameter>
</invoke>
```

Every evaluator dispatched in Step 3.2: Dispatch Evaluators joins the team via `team_name=card-impl-eval-[CARD_ID]`. Developers dispatched in Step 5: Dispatch Developer Wave do **not** join the team.

### 3.2 Dispatch Evaluators

Read the diff and the card before writing the prompts. Each prompt must reflect the specific nature of this implementation and this card.

Evaluators run in the background so the orchestrator can monitor team broadcasts while they work.

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

Identify potential failure modes in this implementation.

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

Find failure modes in this implementation as a user would experience them.

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

## 4. Collect Verdicts and Route

Monitor team broadcasts. Each evaluator emits two kinds of message:

- **`FINDING:` broadcast**: Record the finding (short label and body) for use in Step 5: Dispatch Developer Wave.
- **`VERDICT:` broadcast**: Record the verdict.

Continue until every dispatched evaluator has broadcast `VERDICT:`.

Tear down the team — the evaluators are done for this cycle:

```xml
<invoke name="TeamDelete" />
```

Read each evaluator's `VERDICT:` line. The decision is determined by the verdicts, not your assessment of the findings. You may not override a verdict, reclassify a finding as a "limitation" or "follow-up," or document it as a known issue in lieu of fixing it.

Based on the aggregated verdicts:
- **All APPROVED**: Proceed to Step 6: Finalize.
- **Any CHANGES_REQUESTED**: Proceed to Step 5: Dispatch Developer Wave with the recorded findings. After the wave's Step 5.1: Validate and Commit gate passes, return to Step 3: Evaluate with Team to re-evaluate against the new HEAD with a fresh team.
- **BLOCKED** (an evaluator names an external constraint preventing the fix): Document the constraint and the specific finding in a comment, add `blocked` to `tags` in `CARD.meta.json`, commit, and **STOP**.

## 5. Dispatch Developer Wave

Group the findings by coherence, using the same routing principle as `./implementation-with-plan.md` Step 2.2: Assess Coherence:
- **Independent files OR uniform fixes**: Parallel — concurrent developers, one commit after the group returns.
- **Dependent + varied + small**: Coherent — single developer for all findings, one commit.
- **Dependent + varied + substantial with clear gates**: Sequential — ordered developers with a validate-and-commit gate between phases.

When uncertain between Coherent and Sequential, choose **Sequential**.

Choose [MODEL] per the same tiering as `./implementation-with-plan.md` Step 2.3: Delegate Implementation.

Developers are **not** team members. For Parallel routing, dispatch concurrent developers by placing multiple foreground `<invoke>` blocks in a single message — they execute in parallel without backgrounding. Each developer owns the files referenced in its assigned findings.

```xml
<invoke name="Agent">
<parameter name="description">Apply review fixes ([SCOPE_SUMMARY])</parameter>
<parameter name="subagent_type">runtime:card:developer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="run_in_background">false</parameter>
<parameter name="prompt">
## Task
Apply fixes for the findings below. Do not run full validation — the orchestrator validates after you return.

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

### 5.1 Validate and Commit

Wait for every developer in the current group (Parallel, Coherent, or current Sequential phase) to return before validating.

Run the repository's workspace-level type-check and lint commands from the workspace root.

Then run tests scoped to what the group changed:
- **Changes isolated to a single package**: Run that package's test suite.
- **Changes span multiple packages, or the package boundary is unclear**: Run the workspace's full validation suite.

Based on the combined result:
- **All validations pass**: Commit the group's changes, then return to the caller (Step 2: Pre-Evaluation Validation or Step 4: Collect Verdicts and Route).
- **Error within orchestrator scope** (syntax error, import correction, config typo, test polyfill): Fix inline and re-run the validations above.
- **Error requires implementation changes**: Treat as NEEDS_REVISION. Discard the group's uncommitted work and re-dispatch per Step 5: Dispatch Developer Wave.

Commit on success:

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

## 6. Finalize

Only enter this step when every evaluator broadcast `VERDICT: APPROVED` in Step 4: Collect Verdicts and Route. Do not modify gates in `CARD.meta.json`.

</instructions>
