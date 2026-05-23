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
import { BranchUnregisterError, removeWorktreeForCard } from '@cards/sdk/worktree-for-card';
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
 * Resolves the registered branch name for a worktree from its current HEAD.
 *
 * Returns `undefined` when HEAD is detached (`--abbrev-ref` yields the literal
 * `"HEAD"`): in that case the branch name cannot be confidently matched against
 * the registered record, so the caller skips the branch unregister rather than
 * removing the wrong record or claiming success on an unreliable name.
 *
 * @param worktreePath - Absolute path to the worktree directory.
 * @returns The branch name, or `undefined` when HEAD is detached.
 */
async function resolveWorktreeBranch(worktreePath: string): Promise<string | undefined> {
  const { stdout } = await execFileAsync('git', ['-C', worktreePath, 'rev-parse', '--abbrev-ref', 'HEAD']);
  const branch = stdout.trim();
  return branch === 'HEAD' ? undefined : branch;
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

    const branchName = cardId === undefined ? undefined : await resolveWorktreeBranch(input.worktree_path);

    if (cardId === undefined || branchName === undefined) {
      // Unbound worktree (no marker) or detached HEAD (branch name unreliable):
      // there is no branch record we can confidently unregister. Tear down the
      // worktree from disk; do not silently claim a branch was unregistered.
      if (cardId !== undefined) {
        logger.warn(
          'WorktreeRemove: worktree HEAD is detached; branch record could not be resolved, removing worktree only',
          {
            event: 'WorktreeRemove',
            worktree_path: input.worktree_path,
            cardId
          }
        );
      }
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
          cardId,
          branchName
        });
        await removeWorktree(input.worktree_path);
      } else {
        try {
          await removeWorktreeForCard(client, input.worktree_path, { cardId, branchName });
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
