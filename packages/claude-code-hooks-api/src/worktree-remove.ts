/**
 * WorktreeRemove hook that tears down a Cards-managed git worktree.
 *
 * Failures on the remove path are logged but do not block the harness —
 * the harness ignores the hook's output on WorktreeRemove.
 *
 * @summary WorktreeRemove hook for Cards-managed worktrees
 * @module worktree-remove
 */

import { removeWorktree } from '@cards/sdk/worktree';
import { worktreeRemoveHook, worktreeRemoveOutput } from '@goodfoot/claude-code-hooks';

export default worktreeRemoveHook({}, async (input, { logger }) => {
  const start = Date.now();

  logger.info('WorktreeRemove', {
    event: 'WorktreeRemove',
    worktree_path: input.worktree_path
  });

  try {
    await removeWorktree(input.worktree_path);
    logger.info('WorktreeRemove complete', {
      event: 'WorktreeRemove',
      worktree_path: input.worktree_path,
      elapsedMs: Date.now() - start
    });
  } catch (error) {
    logger.warn('WorktreeRemove failed', {
      event: 'WorktreeRemove',
      worktree_path: input.worktree_path,
      elapsedMs: Date.now() - start,
      error: String(error)
    });
  }

  return worktreeRemoveOutput({});
});
