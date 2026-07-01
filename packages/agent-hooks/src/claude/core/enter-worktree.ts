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
 *   `additionalContext` nudge instructing the agent to run `cards create`.
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

import { join } from 'node:path';
import { findAgentPid, resolveGlobalCardsConfigDir } from '@cards.management/sdk';
import { resolveCardRepoPath, resolveWorktreeCardId } from '@cards.management/sdk/adhoc-attribution';
import { isKnownAgentComm } from '@cards.management/sdk/bin/process-utils';
import { spawnAdhocAttribution } from '@cards.management/sdk/bin/spawn-adhoc-attribution';
import { addUnboundCandidate } from '@cards.management/sdk/unbound-worktree-candidates';
import { postToolUseHook, postToolUseOutput } from '@goodfoot/claude-code-hooks';
import { resolveBindableWorktreeDir } from '../../shared/bindable-worktree.js';

export { acquireLock, resolveCardRepoPath, resolveWorktreeCardId } from '@cards.management/sdk/adhoc-attribution';

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

  // Feed the per-session unbound-candidate set so `cards create` (run from
  // inside or outside this worktree) can discover and bind it. Idempotent on
  // re-enter: the hash-keyed entry is simply overwritten with the same data.
  await addUnboundCandidate(input.session_id, worktreeDir, input.transcript_path);

  const systemMessage = `If you know the id of an existing card this work belongs to, run \`cards <id> bind\` to attach it. Otherwise, load the \`cards:cards\` skill to create a new card for these changes.`;
  const additionalContext = `If you know the id of an existing card this work belongs to, run \`cards <id> bind\` to attach it. Otherwise, load the \`cards:cards\` skill to create a new card for these changes.`;

  // Emit the one-time nudge.
  return postToolUseOutput({
    systemMessage,
    hookSpecificOutput: {
      additionalContext
    }
  });
});
