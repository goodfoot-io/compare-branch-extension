/**
 * WorktreeCreate hook that creates a Cards-managed git worktree.
 *
 * Fails closed: any error on the create path is rethrown so the runtime exits
 * non-zero and the harness aborts launch. The worktree path is returned only
 * after `settle` resolves, ensuring symlinks and node_modules rerouting are
 * complete before the agent uses the directory.
 *
 * @summary WorktreeCreate hook for Cards-managed worktrees
 * @module worktree-create
 */

import * as path from 'node:path';
import { resolveExtensionPath } from '@cards/sdk';
import { createWorktree } from '@cards/sdk/worktree';
import { worktreeCreateHook, worktreeCreateOutput } from '@goodfoot/claude-code-hooks';

export default worktreeCreateHook({}, async (input, { logger }) => {
  const start = Date.now();
  const cardId = process.env['CARD_ID'] || undefined;

  logger.info('WorktreeCreate', {
    event: 'WorktreeCreate',
    name: input.name,
    cwd: input.cwd,
    cardId: cardId ?? null
  });

  let compiledScriptPaths: Record<string, string> | undefined;
  if (cardId !== undefined) {
    const extensionPath = await resolveExtensionPath();
    const gitHooksDir = path.join(extensionPath, 'dist', 'git-hooks');
    compiledScriptPaths = {
      'pre-commit': path.join(gitHooksDir, 'pre-commit.mjs'),
      'post-commit': path.join(gitHooksDir, 'post-commit.mjs'),
      'post-rewrite': path.join(gitHooksDir, 'post-rewrite.mjs')
    };
  }

  const { path: worktreePath, settle } = await createWorktree(input.name, {
    cwd: input.cwd,
    ...(cardId !== undefined ? { cardId, compiledScriptPaths } : {})
  });

  const result = await settle;

  logger.info('WorktreeCreate complete', {
    event: 'WorktreeCreate',
    name: input.name,
    worktreePath,
    cardId: cardId ?? null,
    elapsedMs: Date.now() - start,
    result
  });

  return worktreeCreateOutput({ worktreePath });
});
