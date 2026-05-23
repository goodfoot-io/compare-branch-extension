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

/**
 * Raised by {@link removeWorktreeForCard} when the worktree was torn down from
 * disk successfully but unregistering its branch record failed.
 *
 * This makes the failed phase explicit so callers can apply the correct
 * fail-open stance (the disk teardown succeeded; only the recoverable branch
 * record is orphaned) instead of inferring the phase from path existence. A
 * teardown failure ({@link removeWorktree} rejecting) propagates untouched and
 * is therefore *not* wrapped in this error.
 */
export class BranchUnregisterError extends Error {
  /** The underlying error thrown by `client.removeBranch`. */
  public readonly cause: unknown;

  constructor(cause: unknown) {
    super(
      `Failed to unregister branch record after worktree removal: ${
        cause instanceof Error ? cause.message : String(cause)
      }`
    );
    this.name = 'BranchUnregisterError';
    this.cause = cause;
  }
}

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

  try {
    await client.addBranch(cardId, { name: ref, worktree: result.path, parentBranch }, { sessionId });
  } catch (addBranchError) {
    // Atomicity: the worktree dir + git branch now exist on disk but the branch
    // record was never written. Roll the worktree back so no orphaned,
    // unregistered worktree is left behind (the exact debt this orchestrator
    // exists to prevent). `result.settle` is never returned on this path, so it
    // would be an unobserved promise — attach a no-op handler to keep a later
    // settle rejection from surfacing as an unhandledRejection, then tear down.
    void result.settle.catch(() => undefined);
    try {
      await removeWorktree(result.path);
    } catch (rollbackError) {
      // Surface the original addBranch failure as the cause, but make the
      // partial-rollback visible: the worktree could not be cleaned up.
      throw new Error(
        `createWorktreeForCard: addBranch failed and worktree rollback also failed at ${result.path}: ` +
          `addBranch=${addBranchError instanceof Error ? addBranchError.message : String(addBranchError)}; ` +
          `rollback=${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`
      );
    }
    throw addBranchError;
  }

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
 * Phase is made explicit via error type rather than inferred from path
 * existence: a {@link removeWorktree} failure (the teardown phase) propagates
 * untouched; a `removeBranch` failure (the unregister phase) is rethrown
 * wrapped in {@link BranchUnregisterError} so callers can apply the fail-open
 * stance to it specifically.
 *
 * @param client - CardsClient used to unregister the branch record.
 * @param worktreePath - Absolute path to the worktree directory.
 * @param options - Card-binding options.
 * @throws BranchUnregisterError when disk teardown succeeded but removeBranch failed.
 */
export async function removeWorktreeForCard(
  client: CardsClient,
  worktreePath: string,
  options: RemoveWorktreeForCardOptions
): Promise<void> {
  const { cardId, branchName, sessionId } = options;

  // Teardown phase: any failure here propagates untouched — it is the
  // worktree-removal failure the callers' teardown stance handles.
  await removeWorktree(worktreePath);

  // Unregister phase: the worktree is already gone from disk, so a failure here
  // leaves only a recoverable orphaned record. Wrap it in a distinct typed
  // error so callers branch on the phase explicitly.
  try {
    await client.removeBranch(cardId, branchName, { sessionId });
  } catch (error) {
    throw new BranchUnregisterError(error);
  }
}
