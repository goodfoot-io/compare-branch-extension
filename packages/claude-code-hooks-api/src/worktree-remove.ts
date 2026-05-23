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

import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { createCardsClient } from '@cards/sdk/client/discovery';
import { removeWorktree, WorktreeScopeError } from '@cards/sdk/worktree';
import { removeWorktreeForCard } from '@cards/sdk/worktree-for-card';
import { worktreeRemoveHook, worktreeRemoveOutput } from '@goodfoot/claude-code-hooks';

const execFileAsync = promisify(execFile);

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

/**
 * Reports whether a path still exists on disk.
 *
 * Used to distinguish a failed worktree removal (path still present) from a
 * failed branch unregister (path already gone) inside the fail-open handler.
 *
 * @param targetPath - Absolute path to check.
 * @returns `true` if the path exists, `false` otherwise.
 */
async function worktreePathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
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
    // cardId and HEAD yields the exact registered branch name (spike S2).
    const cardId = await readWorktreeCardId(input.worktree_path);

    if (cardId === undefined) {
      // Unbound worktree — no branch record to unregister.
      await removeWorktree(input.worktree_path);
    } else {
      const { stdout } = await execFileAsync('git', ['-C', input.worktree_path, 'rev-parse', '--abbrev-ref', 'HEAD']);
      const branchName = stdout.trim();

      // Fail-open: a missing client or a failed removeBranch must never block
      // disk teardown. Remove the worktree regardless, logging the orphaned
      // branch record for later reconciliation.
      const client = await createCardsClient(logger);
      if (client === null) {
        logger.warn('WorktreeRemove: Cards API unavailable; removing worktree without unregistering branch', {
          event: 'WorktreeRemove',
          worktree_path: input.worktree_path,
          cardId,
          branchName
        });
        await removeWorktree(input.worktree_path);
      } else {
        try {
          await removeWorktreeForCard(client, input.worktree_path, { cardId, branchName });
        } catch (error) {
          if (error instanceof WorktreeScopeError) {
            throw error;
          }
          // removeWorktreeForCard removes the worktree first, then unregisters
          // the branch. If the worktree is gone, only the branch unregister
          // failed — log and continue (fail-open on the recoverable orphan). If
          // the worktree is still on disk, the removal itself failed; rethrow
          // so the outer handler logs it under 'WorktreeRemove failed'.
          if (await worktreePathExists(input.worktree_path)) {
            throw error;
          }
          logger.warn('WorktreeRemove: branch unregister failed; worktree removed', {
            event: 'WorktreeRemove',
            worktree_path: input.worktree_path,
            cardId,
            branchName,
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
