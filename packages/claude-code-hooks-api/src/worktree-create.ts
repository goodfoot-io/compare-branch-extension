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
import { readSessionCardId } from '@cards/sessions/card-repo';
import { worktreeCreateHook, worktreeCreateOutput } from '@goodfoot/claude-code-hooks';

export default worktreeCreateHook({}, async (input, { logger }) => {
  const start = Date.now();

  // Explicit CARD_ID always wins. Only when it is unset/empty do we fall back
  // to the card the current session created (bound at `card create` time),
  // keyed by input.session_id — the same UUID the write side stored under
  // (session-start sets CARDS_SESSION_ID = input.session_id, so the CLI's
  // resolveSessionId() and this key converge). Mirrors the per-session keying
  // convention of the other hooks (stop, post-tool-use, session-end).
  let cardId = process.env['CARD_ID'] || undefined;
  if (cardId === undefined) {
    const sessionId = input.session_id?.trim() || undefined;
    if (sessionId !== undefined) {
      try {
        // readSessionCardId is fail-closed (rethrows non-ENOENT) and may
        // return '' for an empty/whitespace .card file. Any failure to
        // resolve the binding degrades to no attribution rather than aborting
        // worktree creation.
        cardId = readSessionCardId(sessionId)?.trim() || undefined;
      } catch (error) {
        logger.warn('WorktreeCreate session-binding lookup failed; creating unattributed worktree', {
          event: 'WorktreeCreate',
          sessionId,
          error
        });
        cardId = undefined;
      }
    }
  }

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
