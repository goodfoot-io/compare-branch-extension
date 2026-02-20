---
name: implementation-with-plan
description: Implement approved plans.
---


<placeholder-variables>
[CARD_ID] — The card's unique identifier from `id` field in CARD.meta.json
[TASK_DESCRIPTION] — Human-readable description of the current task phase
[EVALUATION_CYCLE] — Counter tracking evaluation iterations (max 2)
[MODEL] — LLM model selection for subagent delegation (opus, sonnet, or haiku)
[PLAN_FILES] — All files the plan intends to modify (from task file assignments)
</placeholder-variables>

<orchestrator-constraints>
The orchestrator coordinates — it does NOT implement code.

| Orchestrator handles directly | Agents handle via delegation |
|------------------------------|------------------------------|
| Syntax errors visible in output | Feature implementation |
| Import corrections (e.g., missing .js) | Business logic changes |
| Config file typos | Complex debugging |
| Test setup/polyfills | Multi-file refactoring |
| | Investigation tasks |
| | Library integrations |
| | API changes |

Plan says "implement" -> delegate to implementer agent.
Use only TodoWrite and Task tools for coordination. Never use Read/Write/Edit/MultiEdit for implementation.

**Never update card status directly. Never include commitSha in comments after commits** — hooks handle commit tracking automatically.
</orchestrator-constraints>

<commit-message-artistry>
## Crafting World-Class Commit Messages

Commit messages are the narrative layer of code history. Future developers will read these messages to understand not just *what* changed, but *why* and *how* — the human story behind the code. Write commit messages that are technically precise, contextually rich, and genuinely engaging.

### Message Structure

Every significant commit (non-checkpoint) should follow this 2-5 paragraph structure. Length scales with change scope — a focused fix may need only 2 paragraphs; a multi-module feature deserves the full 5.

**Paragraph 1 — The Hook (Subject + Context)**
Start with a conventional commit prefix and concise subject line. Follow immediately with a sentence that establishes *why this change matters* in the broader context of the system.

**Paragraph 2 — The Problem**
What challenge, requirement, or deficiency prompted this work? Paint the "before" picture. What would happen without this change? Why now?

**Paragraph 3 — The Journey (for substantial changes)**
What alternatives were considered? What made this approach win? Were there pivots, dead ends, or "aha" moments? This paragraph is the heart of the narrative — it is what makes the commit message memorable and educational.

**Paragraph 4 — The Solution**
What was actually built? Focus on the *design* rather than listing files. What patterns were established or followed? What tradeoffs were accepted?

**Paragraph 5 — The Future (optional, for large changes)**
What does this enable? What related work remains? What should future maintainers know?

### The Undeniable Truth

Every commit teaches something. Your job is to say what, for someone who needs to understand this code later.

Do not optimize for profundity. The reader needs to understand what changed and why. Sometimes genuine insight emerges — a surprising discovery, an irony worth noting, a lesson that only became clear after the work was done. When that happens, include it. When it does not, move on. Manufactured insight is worse than none.

The test: would this help someone debugging at 2am? If you would mutter "just tell me what you did" while reading it, rewrite it.

### Voice and Tone

Write for two readers: the one debugging at 2am who needs speed, and the one on a calm Tuesday who needs context. Active voice, present tense. Match your energy to the change — a small fix deserves small prose.

### Synthesizing from Subagent Reports

Collect the Decision Narratives. Extract: what changed, what was learned, what the next person should know. Discard performative struggle. Keep genuine insight if present; do not mourn its absence.

### Checkpoint vs. Final Commits

| Type | Style |
|------|-------|
| Checkpoint | 1-2 lines: card ref, progress |
| Implementation | 2-3 paragraphs: what changed, why |
| Final | 2-5 paragraphs: the full story, ending on truth |

</commit-message-artistry>

<instructions>

## 1. Prepare Environment

Stash any uncommitted changes:

```bash
cd $WORKSPACE_PATH
git stash --include-untracked
```

Create baseline tag:

```bash
cd $WORKSPACE_PATH
git tag -f "implement/${CARD_ID}/baseline" HEAD
```

Restore stash after todo initialization in Step 2.

---

## 2. Execute Implementation

### 2.1 Validate and Initialize

If `PLAN.md` is empty or missing: write an error comment, add `blocked` tag, commit, and **STOP**.

Create todos from the plan content using TodoWrite. Initialize `[EVALUATION_CYCLE] = 0`.

Extract [PLAN_FILES] — all files the plan intends to modify (from task file assignments).

If resuming: `git stash pop` to restore prior work.

### 2.2 Task Checkpoint

Before the first agent delegation, create a pre-implementation checkpoint:

```bash
cd $WORKSPACE_PATH
git add -A
git commit --allow-empty -m "checkpoint: before implementation for card [CARD_ID]"
git tag -f "implement/${CARD_ID}/pre-implementation" HEAD
```

Before each subsequent agent delegation, commit a checkpoint:

```bash
cd $WORKSPACE_PATH
git add -A
git commit --allow-empty -m "checkpoint: before [TASK_DESCRIPTION] — [COMPLETED] of [TOTAL] tasks complete for card [CARD_ID]"
```

### 2.3 Assess Coherence

Collect background exploration results via TaskOutput. Launch additional Explore subagents if new information reveals unexplored areas.

Analyze tasks along three dimensions:

| Dimension | Question |
|-----------|----------|
| **Dependency** | Do files import/reference each other? |
| **Uniformity** | Same operation across files, or varied operations? |
| **Size** | Substantial tasks with clear completion gates? |

**Route**:
- Independent files OR uniform tasks -> **Parallel** (concurrent agents)
- Dependent + varied + small -> **Coherent** (single agent)
- Dependent + varied + substantial with clear gates -> **Sequential** (ordered agents, checkpoint between)

When uncertain between Coherent and Sequential, choose **Sequential**.
Checkpoints have low cost; missed validation opportunities have high cost.

Clear gates: type-check passes, tests pass, API functional, UI renders.

### 2.4 Delegate Implementation

Choose the [MODEL] based on the tasks:
- **Ambiguous requirements, multiple possible approaches, or tasks where you are unsure how to start:** `opus`
- **Clear goal with multiple steps, building features, or fixing bugs in unfamiliar code:** `sonnet`
- **Single-step tasks, following established patterns, or making changes you already understand:** `haiku`

Based on coherence assessment:

**Parallel**: Launch concurrent agents for independent groups:
```xml
<invoke name="Task">
<parameter name="description">Implement [GROUP_A_SUMMARY]</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">...</parameter>
<parameter name="run_in_background">true</parameter>
</invoke>
<invoke name="Task">
<parameter name="description">Implement [GROUP_B_SUMMARY]</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">...</parameter>
</invoke>
```

**Sequential**: Delegate to agent, checkpoint at gate, then delegate next phase.

**Coherent**: Single agent for all todos.

Agent prompt template — prompts must be self-contained. Agents have no conversation context. Read all files to be modified before dispatching.

```xml
<invoke name="Task">
<parameter name="description">[Implement TITLE (all todos) | Current phase/group]</parameter>
<parameter name="subagent_type">runtime:card:implementer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">
## Task
[Description with testing requirements from plan]

## Plan
@[CARD_REPO_PATH]/PLAN.md

## Scope
[Coherent: Complete all todos in sequence, committing after each logical unit.]
[Sequential: Complete phase [N] todos: [phase todo descriptions]. Stop at gate: [GATE_CONDITION].]
[Parallel: Complete todos: [independent group todo descriptions]]

## Context
[Why this task exists — from plan rationale]
[Relevant context from exploration]

## File Ownership
This task owns: [absolute paths from plan]
Only modify files assigned to this task.

## Current File Content
[Read and include current content of files to be modified]

## Constraints
[From plan: patterns, interfaces, dependencies to respect]

## Patterns to Follow
[Code snippets showing conventions — from exploration or file reads]

## Implementation Approach
For new functions or methods, load the `goodfoot:tdd-implementation` skill and follow its instructions.

## Guidelines
- Only make requested changes
- Don't add unrequested features or abstractions
- Keep implementation minimal and focused

## Success Criteria
- [ ] Implementation complete
- [ ] Tests pass (if applicable)
- [ ] Types correct
- [ ] Follows existing patterns
</parameter>
</invoke>
```

### 2.5 Process Result

Based on agent status:
- **COMPLETED**: Mark todo completed, commit if changes exist, write comment to card, continue
- **NEEDS_REVISION**: Update todo with attempt count, revert to checkpoint
  - **If attempts < 3**: Re-delegate to agent
  - **If attempts >= 3**: Mark todo blocked
- **BLOCKED**: Document in card comment, mark todo blocked, continue

**COMPLETED:** Write a brief progress comment to the card repository indicating which task was completed and what was actually done. Commit to the card repository:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE !`echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[which task was completed and what was actually done]
EOF
git add comment/$COMMENT_ID.md
git commit -m "[which task was completed, what was done, and what comes next]"
```

**After all todos:**
- ALL blocked -> write summary comment, add `blocked` tag, **STOP**
- SOME blocked -> note in summary, proceed to Step 3
- NONE blocked -> proceed to Step 3

### 2.6 Validation Gate

Create post-implementation checkpoint:

```bash
cd $WORKSPACE_PATH
git add -A
git commit --allow-empty -m "checkpoint: after implementation, before validation for card [CARD_ID]"
git tag -f "implement/${CARD_ID}/post-implementation" HEAD
```

#### Check for Unexpected Modifications

Verify that only plan-owned files were modified:

```bash
cd $WORKSPACE_PATH
MODIFIED=$(git diff "implement/${CARD_ID}/baseline" --name-only)
UNEXPECTED=$(comm -23 <(echo "$MODIFIED" | sort) <(echo "[PLAN_FILES]" | sort))
```

If unexpected modifications exist:
- **Formatting-only** (use `git diff --ignore-all-space --ignore-blank-lines` to check): Auto-keep, note in card comment
- **Substantive changes**: Write a comment listing the unexpected files, add `blocked` tag to `CARD.meta.json`, commit, **STOP** — await user direction

Do not discard modifications without user direction.

**Requirement:** ALL validation commands must pass before proceeding.

Run validation per the plan's "Validation Commands" section.

**On failure:**
1. Error in code you can modify -> delegate fix to implementer, re-run validation
2. Error outside your scope -> block immediately

**When blocked:** Write exact failure output as a comment, add `blocked` tag to `CARD.meta.json`, commit, and **STOP**.

Only proceed to **3. Refactor** when ALL validations pass.

---

## 3. Refactor

### 3.1 Pre-Refactoring Checkpoint

Commit a checkpoint:

```bash
cd $WORKSPACE_PATH
git add -A
git commit --allow-empty -m "checkpoint: before refactoring — implementation complete for card [CARD_ID]"
git tag -f "implement/${CARD_ID}/pre-refactor" HEAD
```

### 3.2 Delegate Refactoring

```xml
<invoke name="Task">
<parameter name="description">Refactor implementation</parameter>
<parameter name="subagent_type">runtime:card:refactor</parameter>
<parameter name="prompt">
## Focus Areas
1. Eliminate dead code
2. Simplify logic (guard clauses, smaller functions)
3. Remove over-engineering (YAGNI)
4. Improve naming (align with plan intent)
5. Harmonize patterns (match codebase conventions)
6. Refine tests (remove redundant, focus on behavior)

## Constraints
- Preserve observable behavior
- Maintain test coverage
- Stay within plan scope
- Validate after each change
</parameter>
</invoke>
```

### 3.3 Process Result

Based on agent status:
- **COMPLETED**: Commit with `refactor:` prefix, then capture and report refactoring changes:
  1. Run `git diff "implement/${CARD_ID}/pre-refactor" HEAD --stat` to capture changes
  2. If diff is empty: Write brief comment "No refactoring changes were made — code already met quality standards"
  3. If diff has content: Run post-refactor validation (typecheck, test, lint)
     - **Passes**: Write a comment with a paragraph summarizing what was refactored and why, followed by the diff stat. Proceed to Step 4
     - **Fails**: Revert plan-owned files to pre-refactor state: `git checkout "implement/${CARD_ID}/pre-refactor" -- [PLAN_FILES]`. Write comment noting refactoring was reverted. Proceed to Step 4
- **HAS_RECOMMENDATIONS**: Log recommendations, proceed to Step 4
- **BLOCKED**: Document reasons, proceed to Step 4

---

## 4. Evaluate Quality

### 4.1 Pre-Evaluation Checkpoint

Commit a checkpoint:

```bash
cd $WORKSPACE_PATH
git add -A
git commit --allow-empty -m "checkpoint: before evaluation — implementation and refactoring complete for card [CARD_ID]"
```

### 4.2 Delegate Evaluation

```xml
<invoke name="Task">
<parameter name="description">Evaluate implementation</parameter>
<parameter name="subagent_type">runtime:card:implementation-evaluator</parameter>
<parameter name="prompt">Evaluate for production readiness.</parameter>
</invoke>
```

### 4.3 Process Result

Based on evaluation result:
- **PRODUCTION_READY**: Write completion comment, proceed to Step 5
- **CONTINUE**: Increment [EVALUATION_CYCLE]
  - **If cycle >= 2**: Write a comment summarizing evaluation feedback and unresolved issues, add `blocked` tag to `CARD.meta.json`, commit, **STOP**
  - **If cycle < 2**: Create todos with "[Eval fix]" prefix, return to Step 2.2
- **BLOCKED**: Document in comment, add `blocked` tag, commit, **STOP**

---

## 5. Finalize

### 5.1 Craft Final Commit Message

Before completing, synthesize Decision Narratives from all subagent reports into an artful commit message following `<commit-message-artistry>` guidelines.

**Synthesis Process:**

1. **Collect narratives** from implementer and refactor agent reports
2. **Extract the arc**: Problem -> Journey -> Solution
3. **Find the truth**: It is usually in the narratives already, waiting to be recognized
4. **Weave**: A unified story, not a list
5. **Scale**: 2 paragraphs for small changes, up to 5 for substantial ones

**Create the final commit** following `<commit-message-artistry>` guidelines.

### 5.2 Complete or Await Review

**If review is NOT required (gates.reviewRequired is false or unset):**

Launch the merge agent:

```xml
<invoke name="Task">
<parameter name="description">Merge</parameter>
<parameter name="subagent_type">runtime:card:merge</parameter>
<parameter name="prompt">!`echo "Merge the \"$WORKSPACE_BRANCH\" branch into the \"$BASE_BRANCH\" branch."`</parameter>
</invoke>
```

**If review is required (gates.reviewRequired is true):**

Write a summary comment to the card repository explaining what you implemented and how it aligns with the approved plan. List the key workspace files modified and confirm all validation passed. Indicate you are awaiting approval. Commit to the card repository:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE !`echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[what was implemented and how it aligns with the approved plan, key workspace files modified, validation results, and that you are awaiting approval]
EOF
git add comment/$COMMENT_ID.md
git commit -m "[summary of implementation against the plan, key decisions, validation results, and what the reviewer should focus on]"
```

**STOP** — Merge occurs after user approval.

### 5.3 Tag Cleanup

Clean up checkpoint tags:

```bash
cd $WORKSPACE_PATH
git tag -d "implement/${CARD_ID}/baseline" \
         "implement/${CARD_ID}/pre-implementation" \
         "implement/${CARD_ID}/post-implementation" \
         "implement/${CARD_ID}/pre-refactor" 2>/dev/null
```

### Available Checkpoints

The following checkpoints are created during execution for rollback:

| Tag | Created At | Purpose |
|-----|------------|---------|
| `implement/${CARD_ID}/baseline` | Step 1 | Original state before any changes |
| `implement/${CARD_ID}/pre-implementation` | Step 2.2 | Before first task dispatch |
| `implement/${CARD_ID}/post-implementation` | Step 2.6 | After implementation, before validation |
| `implement/${CARD_ID}/pre-refactor` | Step 3.1 | After validation passes, before refactoring |

Reverts are scoped to [PLAN_FILES] only — files outside the plan's scope are never modified or discarded without user direction.

</instructions>
