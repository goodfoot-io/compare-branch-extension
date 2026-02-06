---
name: issue-implementation-with-plan
description: Implement approved plans in isolated worktree.
---

<placeholder-variables>
[BRANCH_NAME] — `issue-[CARD_ID]-[slugified-title]` (`:` and `/` replaced with `-`)
</placeholder-variables>

<orchestrator-constraints>
The orchestrator coordinates—it does NOT implement code.

| Orchestrator handles directly | Agents handle via delegation |
|------------------------------|------------------------------|
| Syntax errors visible in output | Feature implementation |
| Import corrections (e.g., missing .js) | Business logic changes |
| Config file typos | Complex debugging |
| Test setup/polyfills | Multi-file refactoring |
| | Investigation tasks |
| | Library integrations |
| | API changes |

Plan says "implement" → delegate to `claude-code-cli:implementer`.
Use only TodoWrite and Task tools for coordination. Never use Read/Write/Edit/MultiEdit for implementation.

**Never update issue status. Never include commitSha in comments after commits** — hooks handle commit tracking automatically.
</orchestrator-constraints>

<commit-message-artistry>
## Crafting World-Class Commit Messages

Commit messages are the narrative layer of code history. Future developers will read these messages to understand not just *what* changed, but *why* and *how*—the human story behind the code. Write commit messages that are technically precise, contextually rich, and genuinely engaging.

### Message Structure

Every significant commit (non-checkpoint) should follow this 2-5 paragraph structure. Length scales with change scope—a focused fix may need only 2 paragraphs; a multi-module feature deserves the full 5.

**Paragraph 1 — The Hook (Subject + Context)**
Start with a conventional commit prefix and concise subject line. Follow immediately with a sentence that establishes *why this change matters* in the broader context of the system.

**Paragraph 2 — The Problem**
What challenge, requirement, or deficiency prompted this work? Paint the "before" picture. What would happen without this change? Why now?

**Paragraph 3 — The Journey (for substantial changes)**
What alternatives were considered? What made this approach win? Were there pivots, dead ends, or "aha" moments? This paragraph is the heart of the narrative—it's what makes the commit message memorable and educational.

**Paragraph 4 — The Solution**
What was actually built? Focus on the *design* rather than listing files. What patterns were established or followed? What tradeoffs were accepted?

**Paragraph 5 — The Future (optional, for large changes)**
What does this enable? What related work remains? What should future maintainers know?

### The Undeniable Truth

Every commit teaches something. Your job is to say what, for someone who needs to understand this code later.

Don't optimize for profundity. The reader needs to understand what changed and why. Sometimes genuine insight emerges—a surprising discovery, an irony worth noting, a lesson that only became clear after the work was done. When that happens, include it. When it doesn't, move on. Manufactured insight is worse than none.

The test: would this help someone debugging at 2am? If you'd mutter "just tell me what you did" while reading it, rewrite it.

### Voice and Tone

Write for two readers: the one debugging at 2am who needs speed, and the one on a calm Tuesday who needs context. Active voice, present tense. Match your energy to the change—a small fix deserves small prose.

### Synthesizing from Subagent Reports

Collect the Decision Narratives. Extract: what changed, what was learned, what the next person should know. Discard performative struggle. Keep genuine insight if present; don't mourn its absence.

### Checkpoint vs. Final Commits

| Type | Style |
|------|-------|
| Checkpoint | 1-2 lines: issue ref, progress |
| Implementation | 2-3 paragraphs: what changed, why |
| Final | 2-5 paragraphs: the full story, ending on truth |

### Example Final Commit Messages

**Example 1 — The Surprise Ending (4 paragraphs)**
```
feat(auth): Implement JWT token rotation with graceful degradation

The authentication system previously issued tokens with fixed expiration,
forcing users into hard session boundaries. This change introduces automatic
token rotation—invisible plumbing that keeps sessions alive while maintaining
security invariants.

We considered three approaches: silent background refresh, explicit refresh
prompts, and sliding window expiration. Background refresh won because it's
invisible to users and matches the "magic should feel effortless" principle.
The refresh threshold (80% of TTL) was determined empirically—earlier refreshes
waste bandwidth, later ones risk race conditions.

The implementation hooks into the existing request interceptor, adding a
pre-flight check that triggers rotation when tokens approach expiry. Failed
rotations gracefully degrade to the existing behavior rather than forcing
logout. The irony isn't lost on us: we spent a week building infrastructure
whose highest success metric is that users never notice it exists.

Issue: AUTH-247
```

**Example 2 — The Quiet Observation (2 paragraphs)**
```
fix(notifications): Deduplicate events before WebSocket broadcast

Users reported seeing duplicate notifications—sometimes three or four copies
of the same message. The bug traced to our event fan-out: when a user belonged
to multiple groups, they received the event once per group membership.

The fix is a Set. Not a distributed cache, not a Redis-backed deduplication
layer, not an event sourcing system. A Set. Sometimes the senior engineer
move is knowing when the junior engineer solution was right all along.

Issue: NOTIFY-89
```

**Example 3 — Offbeat Humor Illuminating Truth (3 paragraphs)**
```
refactor(api): Remove FeatureFlags service abstraction layer

The FeatureFlags service wrapped a config lookup in three classes, two
interfaces, and a factory—enterprise architecture for reading a boolean.
This commit removes 847 lines of code and replaces them with direct config
access.

We kept the abstraction for two years because "we might need to swap
providers." We never did. We never even considered it. The abstraction
existed to solve a problem we invented to justify the abstraction.

The codebase is now faster to navigate, easier to test, and 847 lines
lighter. Future us will add complexity when future us has future reasons.
Present us has mass-deleted the architectural equivalent of a "just in case"
umbrella collection in the desert.

Issue: TECH-DEBT-42
```

</commit-message-artistry>

<tools>

**create-worktree** — Creates git worktree with automatic commitSha posting via hooks.

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/create-worktree.sh" "[BRANCH_NAME]"
```

Creates worktree at `.worktrees/[BRANCH_NAME]`. Creates a new branch if it doesn't exist, or attaches to an existing branch. Fails if worktree path is already occupied.

Git hooks automatically post `commitSha` after each commit. Squashed commits are cleaned up automatically.

</tools>

<instructions>

## 1. Prepare Environment

Determine path using the first matching condition:
- **Worktree exists**: Resume — Navigate to existing worktree
- **Branch exists (no worktree)**: Recreate — Attach worktree to branch
- **Otherwise**: New — Create worktree

### Resume

```bash
cd ".worktrees/[BRANCH_NAME]"
git stash --include-untracked
```

Continue to Step 2. Restore stash after todo initialization.

### Recreate

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/create-worktree.sh" "[BRANCH_NAME]"
cd ".worktrees/[BRANCH_NAME]"
```

Continue to Step 2.

### New

Create worktree:

```bash
WORKTREE_JSON=$("${CLAUDE_PLUGIN_ROOT}/bin/create-worktree.sh" "[BRANCH_NAME]")
WORKTREE_DIR=$(echo "$WORKTREE_JSON" | jq -r '.worktree')
BASE_SHA=$(echo "$WORKTREE_JSON" | jq -r '.baseSha')
cd "$WORKTREE_DIR"
```

On worktree creation failure: post error to issue, add `blocked` tag, **STOP**.

---

## 2. Execute Implementation

### 2.1 Validate and Initialize

If [PLAN_CONTENT] is empty: post error comment, add `blocked` tag, **STOP**.

Create todos from [PLAN_CONTENT] using TodoWrite. Initialize `[EVALUATION_CYCLE] = 0`.

If resuming: `git stash pop` to restore prior work.

### 2.2 Task Checkpoint

Before each agent delegation:

```bash
git add -A
git commit --allow-empty -m "checkpoint: before [TASK_DESCRIPTION]

Issue: [CARD_ID]
Progress: [COMPLETED] of [TOTAL] tasks complete"
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
- Independent files OR uniform tasks → **Parallel** (concurrent agents)
- Dependent + varied + small → **Coherent** (single agent)
- Dependent + varied + substantial with clear gates → **Sequential** (ordered agents, checkpoint between)

When uncertain between Coherent and Sequential, choose **Sequential**.
Checkpoints have low cost; missed validation opportunities have high cost.

Clear gates: type-check passes, tests pass, API functional, UI renders.

### 2.4 Delegate Implementation

Choose the [MODEL] to use with the `claude-code-cli:implementer` subagent based on the tasks:
- **Ambiguous requirements, multiple possible approaches, or tasks where you're unsure how to start:** `opus`
- **Clear goal with multiple steps, building features, or fixing bugs in unfamiliar code:** `sonnet`
- **Single-step tasks, following established patterns, or making changes you already understand:** `haiku`

Based on coherence assessment:

**Parallel**: Launch concurrent agents for independent groups:
```xml
<invoke name="Task">
<parameter name="description">Implement [GROUP_A_SUMMARY]</parameter>
<parameter name="subagent_type">claude-code-cli:implementer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">...</parameter>
<parameter name="run_in_background">true</parameter>
</invoke>
<invoke name="Task">
<parameter name="description">Implement [GROUP_B_SUMMARY]</parameter>
<parameter name="subagent_type">claude-code-cli:implementer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">...</parameter>
</invoke>
```

**Sequential**: Delegate to agent, checkpoint at gate, then delegate next phase.

**Coherent**: Single agent for all todos.

Agent prompt template:
```xml
<invoke name="Task">
<parameter name="description">[Implement TITLE (all todos) | Current phase/group]</parameter>
<parameter name="subagent_type">claude-code-cli:implementer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">
Issue: [CARD_ID] - [TITLE]
Worktree: [WORKTREE_PATH]
Checkpoint SHA: [TASK_CHECKPOINT]

## Setup
1. Fetch plan via `GET /cards/[CARD_ID]/plan`
2. Fetch description via `GET /cards/[CARD_ID]/description` for requirements context

## Scope
[Coherent: Complete all todos in sequence, committing after each logical unit.]
[Sequential: Complete phase [N] todos: [phase todo descriptions]. Stop at gate: [GATE_CONDITION].]
[Parallel: Complete todos: [independent group todo descriptions]]
</parameter>
</invoke>
```

### 2.5 Process Result

Based on agent status:
- **COMPLETED**: Mark todo completed, commit if changes exist, post to issue, continue
- **NEEDS_REVISION**: Update todo with attempt count, revert to checkpoint
  - **If attempts < 3**: Re-delegate to agent
  - **If attempts ≥ 3**: Mark todo blocked
- **BLOCKED**: Document in issue, mark todo blocked, continue

**COMPLETED:** Post a brief progress update indicating which task you completed and what you actually did. Keep it concise.
```
POST /cards/[CARD_ID]/comments
{
  "body": "[comment content]",
  "author": "agent"
}
```

**After all todos:**
- ALL blocked → post summary, add `blocked` tag, **STOP**
- SOME blocked → note in summary, proceed to Step 3
- NONE blocked → proceed to Step 3

### 2.6 Validation Gate

**Requirement:** ALL validation commands must pass before proceeding.

Run validation per the plan's "Validation Commands" section.

**On failure:**
1. Error in code you can modify → delegate fix to implementer, re-run validation
2. Error outside your scope → block immediately

**When blocked:** Post exact failure output to issue, add `blocked` tag, **STOP**.

Only proceed to **3. Refactor** when ALL validations pass.

---

## 3. Refactor

### 3.1 Pre-Refactoring Checkpoint

```bash
git add -A
git commit --allow-empty -m "checkpoint: before refactoring

Issue: [CARD_ID]
State: Implementation complete"
```

Post checkpoint to issue.

### 3.2 Delegate Refactoring

```xml
<invoke name="Task">
<parameter name="description">Refactor implementation</parameter>
<parameter name="subagent_type">claude-code-cli:refactor</parameter>
<parameter name="prompt">
Issue: [CARD_ID] - [TITLE]
Description: [DESCRIPTION]
Worktree: [WORKTREE_PATH]

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
  1. Find the checkpoint: `git log --grep="checkpoint: before refactoring" --format=%H -1`
  2. Run `git diff <checkpoint> HEAD --stat` to capture changes
  3. If diff is empty: Post brief note "No refactoring changes were made - code already met quality standards"
  4. If diff has content: Post a comment with a paragraph summarizing what was refactored and why (derived from the diff stat and refactoring focus areas), followed by the diff stat
  5. Proceed to Step 4
- **HAS_RECOMMENDATIONS**: Log recommendations, proceed to Step 4
- **BLOCKED**: Document reasons, proceed to Step 4

---

## 4. Evaluate Quality

### 4.1 Pre-Evaluation Checkpoint

```bash
git add -A
git commit --allow-empty -m "checkpoint: before evaluation

Issue: [CARD_ID]
State: Implementation and refactoring complete"
```

Post checkpoint to issue.

### 4.2 Delegate Evaluation

```xml
<invoke name="Task">
<parameter name="description">Evaluate implementation</parameter>
<parameter name="subagent_type">claude-code-cli:implementation-evaluator</parameter>
<parameter name="prompt">
Issue: [CARD_ID] - [TITLE]
Description: [DESCRIPTION]
Worktree: [WORKTREE_PATH]

Evaluate for production readiness.
</parameter>
</invoke>
```

### 4.3 Process Result

Based on evaluation result:
- **PRODUCTION_READY**: Post completion comment, proceed to Step 5
- **CONTINUE**: Increment [EVALUATION_CYCLE]
  - **If cycle ≥ 2**: Set `needs_review`, **STOP**
  - **If cycle < 2**: Create todos with "[Eval fix]" prefix, return to Step 2.2
- **BLOCKED**: Document issues, add `blocked` tag, **STOP**

---

## 5. Finalize

### 5.1 Craft Final Commit Message

Before completing, synthesize Decision Narratives from all subagent reports into an artful commit message following `<commit-message-artistry>` guidelines.

**Synthesis Process:**

1. **Collect narratives** from implementer and refactor agent reports
2. **Extract the arc**: Problem → Journey → Solution
3. **Find the truth**: It's usually in the narratives already, waiting to be recognized
4. **Weave**: A unified story, not a list
5. **Scale**: 2 paragraphs for small changes, up to 5 for substantial ones

**Create the final commit:**

```bash
git add -A
git commit -m "$(cat <<'EOF'
[TYPE]([SCOPE]): [SUBJECT]

[The hook. The problem. The journey if it matters.]

[The solution. Then end on the truth—the thing that makes the reader pause.]

Issue: [CARD_ID]
EOF
)"
```

### 5.2 Complete or Await Review

**If NOT [REVIEW_REQUIRED]:**

```xml
<invoke name="Skill">
  <parameter name="skill">claude-code-cli:issue-merge</parameter>
</invoke>
```

**If [REVIEW_REQUIRED]:**

Post a summary explaining what you implemented and how it aligns with the approved plan. List the key files modified and confirm all validation passed. Indicate you're awaiting approval.
```
POST /cards/[CARD_ID]/comments
{
  "body": "[comment content]",
  "author": "agent",
  "codeReferences": [
    {
      "uri": "[file]",
      "range": {"startLine": [n], "endLine": [n]}
    }
  ]
}
```

Stop here. Merge occurs via `issue-merge` skill after user approval.

</instructions>
