/**
 * WorktreeRemove hook that tears down a Cards-managed git worktree.
 *
 * Failures on the remove path are logged but do not block the harness —
 * the harness ignores the hook's output on WorktreeRemove. When the worktree is
 * card-bound (a `.cards/CARD_ID` marker is present), its branch record is also
 * unregistered via `removeWorktreeForCard`; a missing client or a failed
 * `removeBranch` is logged but never blocks disk teardown (fail-open). Unbound
 * worktrees fall back to the bare `removeWorktree`. `WorktreeScopeError` still
 * rethrows.
 *
 * @summary WorktreeRemove hook for Cards-managed worktrees
 * @module worktree-remove
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createCardsClient } from '@cards/sdk/client/discovery';
import { removeWorktree, WorktreeScopeError } from '@cards/sdk/worktree';
import { BranchUnregisterError, removeWorktreeForCard } from '@cards/sdk/worktree-for-card';
import { worktreeRemoveHook, worktreeRemoveOutput } from '@goodfoot/claude-code-hooks';

/**
 * Reads the `.cards/CARD_ID` marker from a worktree, returning the trimmed card
 * ID or `undefined` when the marker is absent (an unbound worktree).
 *
 * @param worktreePath - Absolute path to the worktree directory.
 * @returns The card ID, or `undefined` if no marker exists.
 */
async function readWorktreeCardId(worktreePath: string): Promise<string | undefined> {
  try {
    const raw = await fs.readFile(path.join(worktreePath, '.cards', 'CARD_ID'), 'utf-8');
    return raw.trim() || undefined;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

export default worktreeRemoveHook({}, async (input, { logger }) => {
  const start = Date.now();

  logger.info('WorktreeRemove', {
    event: 'WorktreeRemove',
    worktree_path: input.worktree_path
  });

  try {
    // Resolve the card binding from disk before removal: the marker yields the
    // cardId. The exact branch name is derived inside releaseWorktreeForCard
    // from the worktree's HEAD, where the detached-HEAD skip-with-warning stance
    // now lives — so the hook no longer resolves the branch itself.
    const cardId = await readWorktreeCardId(input.worktree_path);

    if (cardId === undefined) {
      // Unbound worktree (no marker): there is no branch record to unregister.
      // Tear down the worktree from disk only.
      await removeWorktree(input.worktree_path);
    } else {
      // Fail-open: a missing client or a failed removeBranch must never block
      // disk teardown. Remove the worktree regardless, logging the orphaned
      // branch record for later reconciliation.
      const client = await createCardsClient(logger, { retryOnNetworkError: false });
      if (client === null) {
        logger.warn('WorktreeRemove: Cards API unavailable; removing worktree without unregistering branch', {
          event: 'WorktreeRemove',
          worktree_path: input.worktree_path,
          cardId
        });
        await removeWorktree(input.worktree_path);
      } else {
        try {
          await removeWorktreeForCard(client, input.worktree_path, { cardId });
        } catch (error) {
          // Classify by phase via error type, not by path existence. A
          // BranchUnregisterError means the worktree was already torn down and
          // only the recoverable branch record is orphaned — fail open. Any
          // other error (including WorktreeScopeError) is a teardown failure
          // and follows the hook's existing rethrow stance, surfacing under the
          // outer 'WorktreeRemove failed' handler (WorktreeScopeError rethrows
          // all the way out).
          if (!(error instanceof BranchUnregisterError)) {
            throw error;
          }
          logger.warn('WorktreeRemove: branch unregister failed; worktree removed', {
            event: 'WorktreeRemove',
            worktree_path: input.worktree_path,
            cardId,
            error: String(error)
          });
        }
      }
    }

    logger.info('WorktreeRemove complete', {
      event: 'WorktreeRemove',
      worktree_path: input.worktree_path,
      elapsedMs: Date.now() - start
    });
  } catch (error) {
    if (error instanceof WorktreeScopeError) {
      throw error;
    }
    logger.warn('WorktreeRemove failed', {
      event: 'WorktreeRemove',
      worktree_path: input.worktree_path,
      elapsedMs: Date.now() - start,
      error: String(error)
    });
  }

  return worktreeRemoveOutput({});
});
