export const meta = {
  name: 'test-cards-workflow',
  description:
    'Auto-fix re-anchorable drift, then sonnet clusters the drifted meshes by similarity and haiku git-mesh:expert agents review/reconcile each batch',
  whenToUse:
    'When `git mesh stale` reports many drifted meshes and you want them reconciled: a blanket --fix handles the mechanical re-anchor, then per-mesh confirmation is delegated to expert agents batched by subject.',
  phases: [
    {
      title: 'Auto-fix',
      detail: 'run `wiki check --fix` (if wiki on PATH), capture drift list, then `git mesh stale --fix`',
      model: 'haiku'
    },
    {
      title: 'Cluster',
      detail: 'sonnet groups drifted meshes into similarity batches (10+ similar / ≤5 unique)',
      model: 'sonnet'
    },
    {
      title: 'Reconcile',
      detail: 'one haiku git-mesh:expert per batch confirms the relationship --fix re-anchored and corrects it',
      model: 'haiku'
    },
    { title: 'Commit', detail: 'single agent commits .mesh only', model: 'haiku' }
  ]
};

// ---- Schemas -------------------------------------------------------------

const DRIFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    meshes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          files: { type: 'array', items: { type: 'string' } },
          statuses: { type: 'array', items: { type: 'string' } }
        },
        required: ['name', 'files', 'statuses']
      }
    },
    fixNote: { type: 'string' }
  },
  required: ['meshes', 'fixNote']
};

const BATCHES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    batches: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          theme: { type: 'string' },
          cohesion: { type: 'string', enum: ['similar', 'unique'] },
          meshes: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'theme', 'cohesion', 'meshes']
      }
    }
  },
  required: ['batches']
};

const RECONCILE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          mesh: { type: 'string' },
          action: {
            type: 'string',
            enum: ['kept-reanchor', 'moved', 'rewhy', 'delete', 'fixed-source-needed', 'left']
          },
          relationship: { type: 'string' },
          note: { type: 'string' }
        },
        required: ['mesh', 'action', 'relationship']
      }
    }
  },
  required: ['verdicts']
};

// ---- Phase 0: auto-fix + capture the review set --------------------------

phase('Auto-fix');
const drift = await agent(
  `You are preparing a mesh-reconciliation run in the git repo at /workspace. Do EXACTLY these steps, in order, and nothing else.

0. Check whether the \`wiki\` CLI is on PATH (e.g. \`command -v wiki\`). If it IS, run \`wiki check --fix\` first — it resolves auto-fixable wiki/git-mesh issues (e.g. mesh_uncovered) and may add or modify .mesh files. If \`wiki\` is NOT on PATH, skip this step and note that in fixNote. Do not commit.

1. Run \`git mesh stale --format porcelain\`. Parse every row that does NOT start with '#'. Columns are TAB-separated: STATUS, layer, MESH_NAME, FILE_PATH, START, END. Group rows by MESH_NAME. For each mesh collect: the distinct FILE_PATH values (the anchored files) and the distinct STATUS values (CHANGED / MOVED / DELETED).

2. Run \`git mesh stale --fix\`. This re-anchors Moved and Changed anchors in place by rewriting the .mesh worktree files (no commit). If it prints "index changed during stale; consider re-running", run it again — up to 3 attempts — until that warning no longer appears.

3. Do NOT run \`git add\` or \`git commit\`. Leave the rewritten .mesh files unstaged.

Return the grouped pre-fix drift list (this is the set of meshes the downstream reviewers must confirm) and a one-line note (fixNote) describing whether \`wiki check --fix\` ran and what it plus \`git mesh stale --fix\` changed. Capture the list in step 1 BEFORE running --fix, because after --fix the meshes will report clean and the list would be lost.`,
  { agentType: 'git-mesh:expert', model: 'haiku', schema: DRIFT_SCHEMA, label: 'auto-fix + capture' }
);

const meshes = (drift?.meshes ?? []).filter((m) => m && m.name);
log(`Auto-fix done (${drift?.fixNote ?? 'no note'}). ${meshes.length} drifted meshes to review.`);
if (meshes.length === 0) {
  return { fixNote: drift?.fixNote ?? null, batches: 0, verdicts: [] }
}

// ---- Phase 1: sonnet delegator clusters by similarity --------------------

phase('Cluster');
const clustered = await agent(
  `You are the reconciliation delegator. An automatic \`git mesh stale --fix\` has just re-anchored the Moved/Changed anchors of the meshes below. Your job is to CLUSTER these meshes into review batches that will each be handed to one downstream git-mesh:expert agent.

Batching rules (follow exactly):
- Meshes that share anchored files, share a name prefix / subsystem, or concern the same subject are COHESIVE. Put them together in a LARGE batch — 10 or more meshes is good (cohesion: "similar").
- Meshes that are unique or unrelated to others get SMALL batches — NO MORE THAN 5 meshes each (cohesion: "unique").
- Every mesh must appear in exactly ONE batch. Do not drop or duplicate any. Give each batch a short human theme.

Use the anchored file paths and the mesh-name path segments as your similarity signal (e.g. meshes under "wiki/reference/website/..." or all anchoring "StreamFileWatcher.ts" belong together).

Drifted meshes (JSON):
${JSON.stringify(meshes)}`,
  { model: 'sonnet', schema: BATCHES_SCHEMA, label: 'cluster-by-similarity' }
);

const batches = (clustered?.batches ?? []).filter((b) => b && Array.isArray(b.meshes) && b.meshes.length);
log(
  `Sonnet produced ${batches.length} batches (${batches.filter((b) => b.cohesion === 'similar').length} similar, ${batches.filter((b) => b.cohesion === 'unique').length} unique).`
);

// ---- Phase 2: one haiku git-mesh:expert per batch ------------------------

phase('Reconcile');
const results = await parallel(
  batches.map(
    (b) => () =>
      agent(
        `An automatic \`git mesh stale --fix\` already re-anchored the Moved/Changed anchors for the meshes in this batch by rewriting their .mesh worktree files to the CURRENT bytes. A blanket --fix does NOT confirm the relationship still holds — that confirmation is your job. Apply the handbook's drift decision tree to EACH mesh below.

For each mesh:
1. Run \`git mesh why <name>\` and \`git mesh <name>\` to see the recorded relationship and anchors.
2. Read the CURRENT bytes at each anchor — both/all ends — with the Read tool. Never reason from filename or memory.
3. Write one sentence stating the relationship the current bytes form, then decide:
   - Relationship still holds (bytes shifted, meaning preserved) → the --fix re-anchor is correct → action "kept-reanchor", leave it.
   - Bytes identical, only the location moved → action "moved", leave it.
   - The subsystem itself changed → write a new why: \`git mesh why <name> -m "..."\` → action "rewhy".
   - The relationship is gone, or an anchored path was DELETED and no longer has a counterpart → \`git mesh delete <name>\` (or \`git mesh remove\` the dead anchor) → action "delete".
   - One side's MEANING broke and the correct fix is to edit a SOURCE file → you may NOT edit source files (allowlist forbids it). Do not touch the mesh; record action "fixed-source-needed" and leave it for a human.

HARD CONSTRAINTS:
- Edit ONLY .mesh files. Do NOT run \`git add\` or \`git commit\` — a later workflow step commits every mesh edit together in one commit.
- Stay strictly within your git allowlist (git mesh *, read-only git status/diff/log/show). Never \`git add .\`, \`git commit -a\`, \`git reset\`, \`git checkout\` of non-.mesh paths, \`git stash\`, or \`git clean\` — the worktree is shared with live work.

Batch theme: ${b.theme} (cohesion: ${b.cohesion})
Meshes to reconcile:
${b.meshes.map((m) => `  - ${m}`).join('\n')}

Return a verdict for every mesh.`,
        {
          agentType: 'git-mesh:expert',
          model: 'haiku',
          schema: RECONCILE_SCHEMA,
          phase: 'Reconcile',
          label: `reconcile:${b.id}`
        }
      )
  )
);

const verdicts = results.filter(Boolean).flatMap((r) => r?.verdicts ?? []);
const byAction = verdicts.reduce((acc, v) => ((acc[v.action] = (acc[v.action] ?? 0) + 1), acc), {});
log(`Reconcile complete: ${verdicts.length} verdicts — ${JSON.stringify(byAction)}`);

// ---- Phase 3: single commit of .mesh only --------------------------------

phase('Commit');
const commit = await agent(
  `Every mesh reconciliation edit now lives in the .mesh worktree files (from the auto-fix re-anchor and the expert review). Persist them all in ONE commit:

1. \`git status --porcelain .mesh\` to see which mesh files changed.
2. \`git add .mesh\`
3. \`git commit -m "Reconcile drifted meshes: auto-fix re-anchor + batched expert review"\`

Commit ONLY .mesh files. NEVER \`git add .\`, \`git add -A\`, or \`git commit -a\` — the worktree is shared with live, uncommitted source work that must not be swept in. If a post-commit hook promotes any non-.mesh path into the commit, STOP, run no further git commands, and report the commit SHA plus exactly which non-.mesh paths got included. Report the commit SHA and a one-line summary of how many mesh files were committed.`,
  { agentType: 'git-mesh:expert', model: 'haiku', label: 'commit-mesh' }
);

return {
  fixNote: drift?.fixNote ?? null,
  batches: batches.length,
  verdictCounts: byAction,
  needsHuman: verdicts.filter((v) => v.action === 'fixed-source-needed').map((v) => v.mesh),
  commit,
}
