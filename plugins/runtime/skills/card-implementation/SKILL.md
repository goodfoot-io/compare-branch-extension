---
name: implementation
description: Implement cards.
---


<placeholder-variables>
[TASK_COUNT] — Number of implementation tasks derived from the card (set in Step 2.2 after writing todos with TodoWrite; count equals the number of todos created)
[MODEL] — Claude model selection for subagent delegation (opus, sonnet, or haiku)
</placeholder-variables>

<orchestrator-constraints>
The orchestrator prepares, plans, and coordinates — it does NOT implement code.

| Orchestrator handles directly | Implementer handles via delegation |
|-------------------------------|-----------------------------------|
| Codebase exploration | Feature implementation |
| Task derivation | Code changes |
| Result processing | Test writing |
|                               | Validation execution |
|                               | Bug fixes |

Use TodoWrite and Task tools for coordination. Never use Read/Write/Edit/MultiEdit for implementation work.

**Never update card status directly. Never include commitSha in comments after commits** — hooks handle commit tracking automatically.
</orchestrator-constraints>

<instructions>

## 1. Prepare Environment

### 1.1 Stash Changes

Stash any uncommitted changes and create baseline tag:

```bash
cd $WORKSPACE_PATH
git stash --include-untracked
git tag -f "implement/${CARD_ID}/baseline" HEAD
```

Read recent comment files to determine whether an "Implementation Complete" comment already exists:

```bash
cd $CARD_REPO_PATH
ls comment/*.md 2>/dev/null | sort | tail -5
```

If an "Implementation Complete" comment exists on the card, skip to **4. Finalize**.

### 1.2 Launch Explore Subagents

Launch background Explore subagents (haiku model). Launch multiple subagents with distinct, targeted prompts based on the card content:

   ```xml
   <invoke name="Task">
   <parameter name="description">explore-[target-a]</parameter>
   <parameter name="subagent_type">Explore</parameter>
   <parameter name="model">haiku</parameter>
   <parameter name="run_in_background">true</parameter>
   <parameter name="prompt">[Distinct exploration task derived from card]</parameter>
   </invoke>
   <invoke name="Task">
   <parameter name="description">explore-[target-b]</parameter>
   <parameter name="subagent_type">Explore</parameter>
   <parameter name="model">haiku</parameter>
   <parameter name="run_in_background">true</parameter>
   <parameter name="prompt">[Distinct exploration task derived from card]</parameter>
   </invoke>
   ```

### 1.3 Collect Exploration Results

   Collect TaskOutput for every background Explore agent launched in Step 1.2. Results from agents not collected via TaskOutput are discarded before proceeding to Section 2.

---

## 2. Derive Tasks

Launch additional Explore subagents if new information reveals unexplored areas.

If changes were stashed in Step 1.1, restore them now.

```bash
cd $WORKSPACE_PATH
git stash pop  # only if changes were stashed in Step 1.1
```

### 2.1 Analyze Requirements

From the card description and exploration results, identify:
- What files need modification?
- What new files are needed?
- What behavior changes are required?
- What tests need to be written?

### 2.2 Create Implementation Tasks

Write concrete, actionable tasks to TodoWrite. Each task should specify:
- **What** to create or modify
- **Where** (file paths discovered during exploration)
- **Why** (which requirement it satisfies)

<example>
Example task derivation for "Add rate limiting to /api/submit endpoint":

```
1. Create rate limiter utility (src/utils/rate-limiter.ts)
   - Implement token bucket algorithm
   - Export createRateLimiter(options) factory

2. Add rate limit middleware (src/middleware/rate-limit.ts)
   - Wrap utility for Express middleware signature
   - Return 429 with Retry-After header when limited

3. Integrate into submit route (src/routes/api/submit.ts:45)
   - Apply middleware before existing handler
   - Use config values for rate limits

4. Write tests
   - Unit tests for token bucket logic (src/utils/rate-limiter.test.ts)
   - Integration test for 429 response (src/routes/api/submit.test.ts)
```
</example>

After writing all todos, record [TASK_COUNT] as the total number of todos created.

### 2.3 Assess Coherence

Analyze tasks along three dimensions:

| Dimension | Question |
|-----------|----------|
| **Dependency** | Do files import/reference each other? |
| **Uniformity** | Same operation across files, or varied operations? |
| **Size** | Substantial tasks with clear completion gates? |

Route based on assessment:
- **Independent files OR uniform tasks**: Parallel — concurrent agent delegations
- **Dependent + varied + small**: Coherent — single agent for all tasks
- **Dependent + varied + substantial with clear gates**: Sequential — ordered delegations with checkpoints

When uncertain between Coherent and Sequential, choose **Coherent** for planless cards.

---

## 3. Delegate Implementation

### 3.1 Delegate to Implementer

Pass the **orchestrator-defined tasks** to the implementer agent.

Choose the [MODEL] based on the tasks:
- **Ambiguous requirements, multiple possible approaches, or tasks where you are unsure how to start:** `opus`
- **Clear goal with multiple steps, building features, or fixing bugs in unfamiliar code:** `sonnet`
- **Single-step tasks, following established patterns, or making changes you already understand:** `haiku`

**Coherent** (single delegation for all tasks):

```xml
<invoke name="Task">
<parameter name="description">Implement Card</parameter>
<parameter name="subagent_type">runtime:card:implementer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">
## Tasks to Complete

1. **[Task 1 name]** (`[file-path]`)
   - [Specific change 1]
   - [Specific change 2]

2. **[Task 2 name]** (`[file-path]`)
   - [Specific change 1]
   - [Specific change 2]

[Continue for all derived tasks]

## Validation
- Type check: `yarn typecheck`
- Test: `yarn test [relevant-test-files]`
- Lint: `yarn lint`
</parameter>
</invoke>
```

**Parallel** (concurrent delegations for independent groups):

```xml
<invoke name="Task">
<parameter name="description">Implement [GROUP_A_SUMMARY]</parameter>
<parameter name="subagent_type">runtime:card:implementer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">
## Tasks to Complete
[Group A tasks only]

## Validation
[Commands for group A]
</parameter>
<parameter name="run_in_background">true</parameter>
</invoke>
<invoke name="Task">
<parameter name="description">Implement [GROUP_B_SUMMARY]</parameter>
<parameter name="subagent_type">runtime:card:implementer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="prompt">
## Tasks to Complete
[Group B tasks only]

## Validation
[Commands for group B]
</parameter>
</invoke>
```

**Sequential** (ordered delegations with checkpoints):

Delegate first phase, checkpoint at gate, then delegate next phase.

### 3.2 Process Result

Based on implementer status:
- **COMPLETED**: Mark todos completed, write summary comment, proceed to **4. Finalize**
- **NEEDS_REVISION**: Update todo with attempt count, revert changed files to checkpoint:
  ```bash
  # Restore files modified or deleted since checkpoint
  git diff "implement/${CARD_ID}/baseline" --name-only --diff-filter=MD | \
    xargs -r git checkout "implement/${CARD_ID}/baseline" --
  # Remove files added since checkpoint
  git diff "implement/${CARD_ID}/baseline" --name-only --diff-filter=A | \
    xargs -r git rm -f
  ```
  - **If attempts < 3**: Re-delegate with additional context from failure report
  - **If attempts >= 3**: Write failure details as comment, add `blocked` tag, **STOP**
- **BLOCKED**: Write blocking details as comment, add `blocked` tag, **STOP**

```bash
cd $CARD_REPO_PATH
node -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); if(!d.tags.includes('blocked')) d.tags.push('blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
export COMMENT_ID=$($NODE !` echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[blocking details: what is blocked, why, and what is needed to unblock]
EOF
git add comment/$COMMENT_ID.md CARD.meta.json
git commit -m "blocked: [reason]"  # <card-repo-commit-style>
```

**On COMPLETED:** Write a progress comment to the card repository summarizing what was implemented, key decisions made, and files modified. Commit to the card repository:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE !` echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[what was implemented, key decisions made, and files modified]
EOF
git add comment/$COMMENT_ID.md
git commit -m "progress: [what was implemented]"  # <card-repo-commit-style>
```

### 3.3 Validation Gate

**Requirement:** ALL validation commands must pass before proceeding. This usually means linting, type checking, and testing.

**On any failure:**
1. Error in code you can modify -> delegate fix to implementer, re-run validation
2. Error outside your scope -> block immediately

**When blocked:** Write exact failure output as a comment, add `blocked` tag to `CARD.meta.json`, commit, and **STOP**.

```bash
cd $CARD_REPO_PATH
node -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); if(!d.tags.includes('blocked')) d.tags.push('blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
export COMMENT_ID=$($NODE !` echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[exact validation failure output]
EOF
git add comment/$COMMENT_ID.md CARD.meta.json
git commit -m "blocked: [reason]"  # <card-repo-commit-style>
```

Only proceed to **4. Finalize** when ALL validations pass.

---

## 4. Finalize

### 4.1 Squash Commits

Squash all commits since baseline into one:

```bash
cd $WORKSPACE_PATH
COMMIT_COUNT=$(git rev-list --count "implement/${CARD_ID}/baseline"..HEAD)
if [ "$COMMIT_COUNT" -gt 1 ]; then
  git reset --soft "implement/${CARD_ID}/baseline"
  git commit -m "$(cat <<'COMMITMSG'
[final commit message per <workspace-commit-style>]
COMMITMSG
)"
fi
```

Clean up checkpoint tags:

```bash
cd $WORKSPACE_PATH
git tag -d "implement/${CARD_ID}/baseline" 2>/dev/null
```

### 4.2 Complete

### If review is required (gates.reviewRequired is true):

Write a summary comment to the card repository explaining what you implemented and key decisions made. List the main workspace files modified and confirm all validation passed. Indicate you are waiting for approval before merge. Commit to the card repository:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE !` echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[what was implemented and key decisions made, main workspace files modified, validation confirmation, and request for reviewer focus areas]
EOF
git add comment/$COMMENT_ID.md
git commit -m "implementation complete, awaiting review"  # <card-repo-commit-style>
```

**STOP** — Merge occurs after user approval.

### If review is NOT required:

Write a completion comment to the card repository. Commit to the card repository. Then launch the merge agent:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE !` echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[completion summary: what was implemented, key decisions, files modified, validation confirmation]
EOF
git add comment/$COMMENT_ID.md
git commit -m "implementation complete"  # <card-repo-commit-style>
```

```xml
<invoke name="Task">
<parameter name="description">Merge</parameter>
<parameter name="subagent_type">runtime:card:merge</parameter>
<parameter name="prompt">!` echo "Merge the \"$WORKSPACE_BRANCH\" branch into the \"$BASE_BRANCH\" branch."`</parameter>
</invoke>
```

</instructions>
