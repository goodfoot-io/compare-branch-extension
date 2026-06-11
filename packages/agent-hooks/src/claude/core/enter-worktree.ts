/**
 * EnterWorktree (PostToolUse) hook for ad-hoc session attribution.
 *
 * Routes on the worktree's on-disk state:
 *
 * - **BOUND** — `.cards/CARD_ID` present on disk (or `CARD_ID` env set) →
 *   re-attaches via `spawnAdhocAttribution`. Never nudges. Operator experience
 *   is identical to the previous guarded-spawn behavior.
 *
 * - **UNBOUND** — no `CARD_ID`, but cwd is a *bindable linked worktree* (a
 *   linked git worktree, `--git-dir` ≠ `--git-common-dir`, with no
 *   `.cards/CARD_ID`) → adds the worktree to the per-session unbound-candidate
 *   set (carrying this session's `transcriptPath`) then emits a one-time
 *   `additionalContext` nudge instructing the agent to run `card create`.
 *   Re-entering the same unbound worktree in the same session simply overwrites
 *   the candidate entry — the write is idempotent. This detects hand-made
 *   worktrees (`git worktree add`) that no WorktreeCreate hook ever fed.
 *
 * - **Neither** → no-op.
 *
 * `CARD_ID` (bound) wins over the bindable test when a worktree is bound
 * (the bindable test requires the absence of `.cards/CARD_ID`).
 *
 * This is a `PostToolUse` hook matched to the `EnterWorktree` tool. It fires
 * after the tool switches the session's working directory, so `input.cwd` is
 * the freshly-entered worktree.
 *
 * The PID is resolved and validated (`findAgentPid` + comm-check) before any
 * lock, spawn, or status write on the BOUND path. A null or invalid PID is an
 * immediate no-op: a card is never marked active unless it can be monitored.
 *
 * @summary EnterWorktree PostToolUse hook for ad-hoc session attribution
 * @module enter-worktree
 */

import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { findAgentPid, resolveGlobalCardsConfigDir } from '@cards/sdk';
import { resolveCardRepoPath, resolveWorktreeCardId } from '@cards/sdk/adhoc-attribution';
import { isKnownAgentComm } from '@cards/sdk/bin/process-utils';
import { spawnAdhocAttribution } from '@cards/sdk/bin/spawn-adhoc-attribution';
import { addUnboundCandidate } from '@cards/sdk/unbound-worktree-candidates';
import { postToolUseHook, postToolUseOutput } from '@goodfoot/claude-code-hooks';

export { acquireLock, resolveCardRepoPath, resolveWorktreeCardId } from '@cards/sdk/adhoc-attribution';

const execFileAsync = promisify(execFile);

/**
 * Tests whether `cwd` is a *bindable* linked git worktree: a linked worktree
 * (`git rev-parse --git-dir` ≠ `--git-common-dir`) that carries no
 * `.cards/CARD_ID` marker. Returns the worktree's toplevel directory when
 * bindable, or `null` otherwise.
 *
 * Detects any unbound linked worktree, including hand-made ones
 * (`git worktree add`) that no WorktreeCreate hook ever ran for. The main repository (where
 * `--git-dir` equals `--git-common-dir`) is not bindable.
 *
 * @param cwd - Directory the EnterWorktree tool switched into.
 * @returns Absolute toplevel path of the bindable worktree, or null.
 */
async function resolveBindableWorktreeDir(cwd: string): Promise<string | null> {
  let gitDir: string;
  let gitCommonDir: string;
  let toplevel: string;
  try {
    [gitDir, gitCommonDir, toplevel] = await Promise.all([
      execFileAsync('git', ['-C', cwd, 'rev-parse', '--path-format=absolute', '--git-dir']).then((r) =>
        r.stdout.trim()
      ),
      execFileAsync('git', ['-C', cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir']).then((r) =>
        r.stdout.trim()
      ),
      execFileAsync('git', ['-C', cwd, 'rev-parse', '--show-toplevel']).then((r) => r.stdout.trim())
    ]);
  } catch {
    // Not a git repository, or git unavailable — nothing bindable here.
    return null;
  }

  // A linked worktree has a git-dir distinct from the common dir. The main
  // worktree has them equal and is never a bind target.
  if (gitDir === gitCommonDir) return null;

  // Already bound — CARD_ID wins; do not feed the candidate set.
  try {
    await access(join(toplevel, '.cards', 'CARD_ID'));
    return null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  return toplevel;
}

export default postToolUseHook({ matcher: 'EnterWorktree' }, async (input, { logger }) => {
  // ─── BOUND PATH ───────────────────────────────────────────────────────────
  //
  // Resolve card identity: CARD_ID env wins, then disk walk via
  // resolveWorktreeCardId. Either source triggers the re-attach path.

  const cardId = process.env['CARD_ID']?.trim() || (await resolveWorktreeCardId(input.cwd));

  if (cardId) {
    // Derive cardRepoPath from the discovery file.
    const cardRepoPath = await resolveCardRepoPath(cardId, logger);
    if (!cardRepoPath) return null;

    // Action-subprocess guard — never fight the wrapper.
    if (process.env['ACTION_NAME']) return null;

    // PID first — fail closed on missing or wrong PID.
    const agentPid = findAgentPid();
    if (!agentPid) return null;
    if (!isKnownAgentComm(agentPid, logger)) return null;

    // Build the per-session de-dupe lock path.
    const lockPath = join(resolveGlobalCardsConfigDir(), 'adhoc-sessions', `${input.session_id}.lock`);

    // Delegate the status guard + lock + both spawns to the shared helper so
    // first-bind (card create) and re-attach (this hook) share one code path
    // and cannot drift apart.
    await spawnAdhocAttribution(
      {
        agentPid,
        sessionId: input.session_id,
        transcriptPath: input.transcript_path,
        cardId,
        cardRepoPath,
        lockPath
      },
      logger
    );

    return null;
  }

  // ─── UNBOUND PATH ─────────────────────────────────────────────────────────
  //
  // No CARD_ID — is cwd a bindable linked worktree (linked, no CARD_ID)? This
  // detects hand-made `git worktree add` worktrees that no WorktreeCreate hook
  // ever fed, as well as hook-created ones. The main repository is never a bind
  // target.

  const worktreeDir = await resolveBindableWorktreeDir(input.cwd);
  if (!worktreeDir) return null;

  // Feed the per-session unbound-candidate set so `card create` (run from
  // inside or outside this worktree) can discover and bind it. Idempotent on
  // re-enter: the hash-keyed entry is simply overwritten with the same data.
  await addUnboundCandidate(input.session_id, worktreeDir, input.transcript_path);

  const systemMessage = `If you know the id of an existing card this work belongs to, run \`card <id> bind\` to attach it. Otherwise, load the \`cards:management\` skill to create a new card for these changes.`;
  const additionalContext = `If you know the id of an existing card this work belongs to, run \`card <id> bind\` to attach it. Otherwise, load the \`cards:management\` skill to create a new card for these changes.`;

  // Emit the one-time nudge.
  return postToolUseOutput({
    systemMessage,
    hookSpecificOutput: {
      additionalContext
    }
  });
});
