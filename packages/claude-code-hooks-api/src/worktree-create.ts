/**
 * WorktreeCreate hook that creates a Cards-managed git worktree.
 *
 * Fails closed: any error on the create path is rethrown so the runtime exits
 * non-zero and the harness aborts launch. When the worktree is card-bound, it
 * is registered with the Cards API via `createWorktreeForCard` — discovery
 * failure (no client) throws rather than leaving an unregistered worktree on
 * disk. Unbound worktrees skip the API entirely. The worktree path is returned
 * only after `settle` resolves, ensuring symlinks and node_modules rerouting
 * are complete before the agent uses the directory.
 *
 * @summary WorktreeCreate hook for Cards-managed worktrees
 * @module worktree-create
 */

import { execFile } from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { resolveExtensionPath } from '@cards/sdk';
import { createCardsClient } from '@cards/sdk/client/discovery';
import { createWorktree, type EarlyWorktreeResult } from '@cards/sdk/worktree';
import { createWorktreeForCard } from '@cards/sdk/worktree-for-card';
import { readSessionCardId } from '@cards/sessions/card-repo';
import { worktreeCreateHook, worktreeCreateOutput } from '@goodfoot/claude-code-hooks';

const execFileAsync = promisify(execFile);

/**
 * Resolves the current branch name of the git repo at `cwd`.
 *
 * Used to derive the `parentBranch` recorded for a card-bound worktree, since
 * the WorktreeCreate hook input carries no base branch. Mirrors the start point
 * `createWorktree` resolves the new branch from (the source repo's HEAD).
 *
 * @param cwd - Working directory inside the source git repository.
 * @returns The abbreviated current branch name (e.g. `main`).
 */
async function resolveCurrentBranch(cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD']);
  return stdout.trim();
}

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

  let created: EarlyWorktreeResult;

  if (cardId !== undefined) {
    const extensionPath = await resolveExtensionPath();
    const gitHooksDir = path.join(extensionPath, 'dist', 'git-hooks');
    const compiledScriptPaths = {
      'pre-commit': path.join(gitHooksDir, 'pre-commit.mjs'),
      'post-commit': path.join(gitHooksDir, 'post-commit.mjs'),
      'post-rewrite': path.join(gitHooksDir, 'post-rewrite.mjs')
    };

    // Fail-closed: a card-bound worktree must never exist on disk without a
    // branch record. If the API cannot be discovered, abort launch rather than
    // create an unregistered worktree.
    const client = await createCardsClient(logger);
    if (client === null) {
      throw new Error('WorktreeCreate: Cards API unavailable; cannot register card-bound worktree');
    }

    // The WorktreeCreate hook input carries no base branch, so derive the
    // parent branch from the source repo's current HEAD — the same start point
    // createWorktree resolves the new branch from.
    const parentBranch = await resolveCurrentBranch(input.cwd);

    created = await createWorktreeForCard(client, input.name, {
      cwd: input.cwd,
      cardId,
      compiledScriptPaths,
      parentBranch,
      sessionId: input.session_id
    });
  } else {
    created = await createWorktree(input.name, { cwd: input.cwd });
  }

  const { path: worktreePath, settle } = created;
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
