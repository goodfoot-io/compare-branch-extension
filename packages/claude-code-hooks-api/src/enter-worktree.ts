/**
 * EnterWorktree (PostToolUse) hook for ad-hoc session attribution.
 *
 * Routes on the worktree's on-disk state:
 *
 * - **BOUND** — `.cards/CARD_ID` present on disk (or `CARD_ID` env set) →
 *   re-attaches via `spawnAdhocAttribution`. Never nudges. Operator experience
 *   is identical to the previous guarded-spawn behavior.
 *
 * - **UNBOUND** — no `CARD_ID`, but `.cards/PENDING_BIND` present → records
 *   this worker session's `transcriptPath` + `sessionId` into the marker
 *   (atomic read-modify-write) then emits a one-time `additionalContext` nudge
 *   instructing the agent to run `card create`. Re-entering the same unbound
 *   worktree in the **same** session (marker already carries this `sessionId`)
 *   silently no-ops — the nudge is idempotent.
 *
 * - **Neither** → no-op.
 *
 * `CARD_ID` (bound) wins over `PENDING_BIND` when both markers are present
 * (the "both-markers crash state" described in the plan).
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

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { findAgentPid, resolveGlobalCardsConfigDir } from '@cards/sdk';
import { MAX_WALK_LEVELS, resolveCardRepoPath, resolveWorktreeCardId } from '@cards/sdk/adhoc-attribution';
import { isKnownAgentComm } from '@cards/sdk/bin/process-utils';
import { spawnAdhocAttribution } from '@cards/sdk/bin/spawn-adhoc-attribution';
import { readPendingBind, writePendingBind } from '@cards/sdk/pending-bind';
import { postToolUseHook, postToolUseOutput } from '@goodfoot/claude-code-hooks';

export { acquireLock, resolveCardRepoPath, resolveWorktreeCardId } from '@cards/sdk/adhoc-attribution';

/**
 * Walks upward from `cwd` toward `/`, up to {@link MAX_WALK_LEVELS} levels,
 * looking for a `.cards/PENDING_BIND` file. Returns the first directory that
 * contains the marker, or `null` when none is found.
 *
 * Mirrors the walk pattern of `resolveWorktreeCardId` but returns the
 * containing worktree directory rather than the file's contents, because
 * `readPendingBind` / `writePendingBind` take the worktree dir as their
 * parameter.
 *
 * @param cwd - Directory to start the walk from.
 * @returns Absolute path to the worktree directory holding PENDING_BIND, or null.
 */
async function resolveWorktreePendingBindDir(cwd: string): Promise<string | null> {
  let dir = cwd;
  for (let level = 0; level < MAX_WALK_LEVELS; level++) {
    const markerPath = join(dir, '.cards', 'PENDING_BIND');
    try {
      await readFile(markerPath);
      return dir;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
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
    if (!cardRepoPath) return postToolUseOutput({});

    // Action-subprocess guard — never fight the wrapper.
    if (process.env['ACTION_NAME']) return postToolUseOutput({});

    // PID first — fail closed on missing or wrong PID.
    const agentPid = findAgentPid();
    if (!agentPid) return postToolUseOutput({});
    if (!isKnownAgentComm(agentPid, logger)) return postToolUseOutput({});

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

    return postToolUseOutput({});
  }

  // ─── UNBOUND PATH ─────────────────────────────────────────────────────────
  //
  // No CARD_ID — check for a PENDING_BIND marker. Walk up from cwd so a
  // nested cwd (e.g. a subdirectory of the worktree root) still finds the
  // marker written by the WorktreeCreate hook at the worktree root.

  const worktreeDir = await resolveWorktreePendingBindDir(input.cwd);
  if (!worktreeDir) return postToolUseOutput({});

  const marker = await readPendingBind(worktreeDir);
  if (!marker) return postToolUseOutput({});

  // Idempotency: if this session already recorded its sessionId into the
  // marker, the nudge was already emitted in an earlier EnterWorktree fire
  // for the same session — do not re-nag.
  if (marker.sessionId === input.session_id) {
    return postToolUseOutput({});
  }

  // Atomically record this session's transcript info into the marker so
  // `card create` can validate it belongs to this session.
  await writePendingBind(worktreeDir, {
    ...marker,
    transcriptPath: input.transcript_path,
    sessionId: input.session_id
  });

  // Emit the one-time nudge.
  return postToolUseOutput({
    hookSpecificOutput: {
      additionalContext:
        'This worktree is not yet bound to a card. Run `card create` inside it to ' +
        'create a card and start tracking this session.'
    }
  });
});
