/**
 * WorktreeCreate hook that creates a Cards-managed git worktree.
 *
 * Fails closed: any error on the create path is rethrown so the runtime exits
 * non-zero and the harness aborts launch. When the worktree is card-bound, it
 * is registered with the Cards API via `createWorktreeForCard` — discovery
 * failure (no client) throws rather than leaving an unregistered worktree on
 * disk. Unbound worktrees skip the API entirely and write a `.cards/PENDING_BIND`
 * marker so `card create` can bind the worktree later. The worktree path is
 * returned only after `settle` resolves, ensuring symlinks and node_modules
 * rerouting are complete before the agent uses the directory.
 *
 * @summary WorktreeCreate hook for Cards-managed worktrees
 * @module worktree-create
 */

import { execFile } from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { resolveExtensionPath } from '@cards/sdk';
import { resolveWorktreeCardId } from '@cards/sdk/adhoc-attribution';
import { createCardsClient } from '@cards/sdk/client/discovery';
import { writePendingBind } from '@cards/sdk/pending-bind';
import { createWorktree, type EarlyWorktreeResult } from '@cards/sdk/worktree';
import { createWorktreeForCard } from '@cards/sdk/worktree-for-card';
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
  const branch = stdout.trim();
  // In a detached-HEAD source repo `--abbrev-ref HEAD` returns the literal
  // "HEAD". Recording that as the parent branch corrupts lineage metadata, so
  // fail closed (the create path aborts launch) rather than write a bogus value.
  if (branch === 'HEAD') {
    throw new Error(
      'WorktreeCreate: source repository is in detached-HEAD state; cannot derive a parent branch for the card-bound worktree'
    );
  }
  return branch;
}

export default worktreeCreateHook({}, async (input, { logger }) => {
  const start = Date.now();

  // Resolve the pre-bind card association from the same two sources, in the same
  // order, as the EnterWorktree hook (enter-worktree.ts): an explicit CARD_ID in
  // the environment wins, and when it is absent the card id is resolved by
  // walking up from the creation directory for a `.cards/CARD_ID` marker. This
  // lets a nested worktree inherit its parent worktree's binding. The two hooks
  // resolve byte-for-byte the same id so they can never disagree about which
  // card a given worktree belongs to. When neither source yields an id the
  // worktree is created unbound and a PENDING_BIND marker is written so
  // `card create` can bind it later.
  const cardId = process.env['CARD_ID']?.trim() || (await resolveWorktreeCardId(input.cwd));

  logger.info('WorktreeCreate', {
    event: 'WorktreeCreate',
    name: input.name,
    cwd: input.cwd,
    cardId: cardId ?? null
  });

  let created: EarlyWorktreeResult;

  if (cardId) {
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
    // retryOnNetworkError is disabled so an unreachable/stale-discovery server
    // surfaces promptly (fail-closed throw) instead of retrying forever after
    // the worktree already exists on disk.
    const client = await createCardsClient(logger, { retryOnNetworkError: false });
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
    // Derive parentBranch before creating the worktree — it is the only point
    // at which the source repo HEAD is definitively knowable. Fail closed on
    // detached HEAD for the same reason as the card-bound path.
    const parentBranch = await resolveCurrentBranch(input.cwd);
    created = await createWorktree(input.name, { cwd: input.cwd });
    // Write the PENDING_BIND marker immediately after the worktree directory
    // exists on disk (created.path is available before settle) so `card create`
    // can discover and bind this worktree. Fails closed — any write failure
    // surfaces as a thrown error and aborts launch.
    await writePendingBind(created.path, { version: 1, parentBranch });
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
