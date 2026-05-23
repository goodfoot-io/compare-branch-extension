/**
 * Orchestrators that pair git-worktree creation/removal with the card-repo
 * branch record via CardsClient. The bare createWorktree / removeWorktree
 * primitives in worktree.ts remain client-free; this module is the only place
 * that imports CardsClient alongside those primitives.
 *
 * @summary Card-bound worktree lifecycle orchestrators
 * @module worktreeForCard
 */

import type { CardsClient } from './client/cardsClient.js';
import { createWorktree, type EarlyWorktreeResult, removeWorktree } from './worktree.js';

export interface CreateWorktreeForCardOptions {
  /** Working directory used when locating git roots. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Card identifier — required because every caller of this orchestrator is card-bound. */
  cardId: string;
  /** Map of git hook name to compiled .mjs path — required to avoid D10a attribution loss. */
  compiledScriptPaths: Record<string, string>;
  /** Parent branch from which the worktree's branch was created, recorded in branches.json. */
  parentBranch: string;
  /** Session ID forwarded to addBranch for commit attribution. */
  sessionId?: string;
}

/**
 * Creates a card-bound worktree and registers the branch with the Cards API.
 *
 * Calls `createWorktree(ref, opts)`, then — using the EARLY worktree path
 * (before `settle` resolves) — calls `client.addBranch(...)` so the agent
 * session can spawn immediately without waiting for symlink wiring to finish.
 * Returns the same `{ path, settle }` shape so callers choose whether to await
 * settle. Never awaits settle internally — doing so would break the A2 race fix.
 *
 * @param client - CardsClient used to register the branch record.
 * @param ref - Branch name to create.
 * @param options - Card-binding options.
 * @returns EarlyWorktreeResult — path is usable immediately, settle resolves later.
 */
export async function createWorktreeForCard(
  client: CardsClient,
  ref: string,
  options: CreateWorktreeForCardOptions
): Promise<EarlyWorktreeResult> {
  const { cwd, cardId, compiledScriptPaths, parentBranch, sessionId } = options;

  const result = await createWorktree(ref, { cwd, cardId, compiledScriptPaths });

  await client.addBranch(cardId, { name: ref, worktree: result.path, parentBranch }, { sessionId });

  return result;
}

export interface RemoveWorktreeForCardOptions {
  /** Card identifier whose branch record will be unregistered. */
  cardId: string;
  /** Exact branch name to remove from the card's branch record. */
  branchName: string;
  /** Session ID forwarded to removeBranch for commit attribution. */
  sessionId?: string;
}

/**
 * Removes a card-bound worktree and unregisters its branch from the Cards API.
 *
 * Removes the worktree from disk first, then unregisters the branch record.
 * This ordering ensures a failed removeBranch call (recoverable) never blocks
 * disk teardown, while a failed removeWorktree (the fail-open callers handle)
 * leaves the branch record intact for reconciliation.
 *
 * @param client - CardsClient used to unregister the branch record.
 * @param worktreePath - Absolute path to the worktree directory.
 * @param options - Card-binding options.
 */
export async function removeWorktreeForCard(
  client: CardsClient,
  worktreePath: string,
  options: RemoveWorktreeForCardOptions
): Promise<void> {
  const { cardId, branchName, sessionId } = options;

  await removeWorktree(worktreePath);
  await client.removeBranch(cardId, branchName, { sessionId });
}
