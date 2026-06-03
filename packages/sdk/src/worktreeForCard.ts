/**
 * Orchestrators that pair git-worktree creation/removal with the card-repo
 * branch record via CardsClient. The bare createWorktree / removeWorktree
 * primitives in worktree.ts remain client-free; this module is the only place
 * that imports CardsClient alongside those primitives.
 *
 * @summary Card-bound worktree lifecycle orchestrators
 * @module worktreeForCard
 */

import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { promisify } from 'node:util';
import type { CardsClient } from './client/cardsClient.js';
import { clearPendingBind, writePendingBind } from './pendingBind.js';
import {
  clearCardBoundFile,
  createWorktree,
  type EarlyWorktreeResult,
  removeWorktree,
  writeCardBoundFile
} from './worktree.js';

const execFileAsync = promisify(execFile);

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

export interface BindWorktreeToCardOptions {
  /** Card identifier to bind the worktree to. */
  cardId: string;
  /** Parent branch recorded in branches.json — the branch that was current when the worktree was created. */
  parentBranch: string;
  /** Session ID forwarded to addBranch for commit attribution. */
  sessionId?: string;
}

/**
 * Binds an already-existing, unbound worktree to a card.
 *
 * Sibling to {@link createWorktreeForCard} but for the inverted flow: the
 * worktree already exists on disk (created by a WorktreeCreate hook without a
 * pre-bound card), carries a `.cards/PENDING_BIND` marker, and needs to be
 * associated with a card record after `card create` runs inside it.
 *
 * Steps (under a worktree-path-keyed lock so concurrent binds serialize against
 * the same worktree — `addBranch` is a non-idempotent POST):
 *
 * 1. Reconciliation guard: if `.cards/CARD_ID` already exists, the worktree is
 *    already bound (or in a both-markers crash state). Clear any stale
 *    `PENDING_BIND` and return without calling `addBranch`.
 * 2. Write `.cards/CARD_ID` via {@link writeCardBoundFile}.
 * 3. Call `client.addBranch(...)` with the worktree's checked-out branch name.
 * 4. Clear the `PENDING_BIND` marker.
 *
 * **Worktree-preserving rollback**: if `addBranch` throws, `CARD_ID` is
 * un-written and `PENDING_BIND` is restored, then the original error is
 * rethrown. `removeWorktree` is NEVER called — the worktree predates the bind
 * and must survive regardless of bind outcome.
 *
 * @param client - CardsClient used to register the branch record.
 * @param worktreeDir - Absolute path to the (already-existing) worktree root.
 * @param options - Binding options.
 */
export async function bindWorktreeToCard(
  client: CardsClient,
  worktreeDir: string,
  options: BindWorktreeToCardOptions
): Promise<void> {
  const { cardId, parentBranch, sessionId } = options;

  // Serialize concurrent binds against the same worktree. `addBranch` is a
  // non-idempotent POST so two racing callers would register duplicate branch
  // records. We use a module-level Map<worktreeDir, Promise<void>> chain rather
  // than an O_EXCL file lock because: (a) this is an in-process constraint —
  // only one Node process runs `card create` per worktree at a time in normal
  // operation; (b) it avoids a lock-file cleanup step that would complicate the
  // worktree-preserving rollback; (c) it is the lowest-churn correct approach
  // for serializing async calls within a single process.
  const prev = bindLocks.get(worktreeDir) ?? Promise.resolve();
  let resolveCurrent!: () => void;
  const current = new Promise<void>((res) => {
    resolveCurrent = res;
  });
  bindLocks.set(
    worktreeDir,
    prev.then(() => current)
  );

  try {
    await prev;
    await bindWorktreeToCardUnlocked(client, worktreeDir, cardId, parentBranch, sessionId);
  } finally {
    resolveCurrent();
    // Clean up the map entry when this is still the last waiter, avoiding
    // unbounded map growth on long-running processes.
    if (bindLocks.get(worktreeDir) === prev.then(() => current)) {
      bindLocks.delete(worktreeDir);
    }
  }
}

/**
 * Module-level lock map for worktree-path-keyed serialization.
 *
 * Keys are absolute worktree directory paths; values are the tail of the
 * current promise chain for that path. Each call to {@link bindWorktreeToCard}
 * appends to the chain and cleans up its entry when it is the last waiter.
 */
const bindLocks = new Map<string, Promise<void>>();

async function bindWorktreeToCardUnlocked(
  client: CardsClient,
  worktreeDir: string,
  cardId: string,
  parentBranch: string,
  sessionId: string | undefined
): Promise<void> {
  // Step 1 — Reconciliation guard: if CARD_ID already exists, the worktree is
  // already bound (normal re-entry) or in a both-markers crash state (CARD_ID
  // written, PENDING_BIND clear not yet done before crash). In either case,
  // drain the stale PENDING_BIND so the EnterWorktree nag stops and return
  // without calling addBranch (which is a non-idempotent POST).
  const cardIdPath = `${worktreeDir}/.cards/CARD_ID`;
  let alreadyBound = false;
  try {
    await access(cardIdPath);
    alreadyBound = true;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    // ENOENT — not yet bound, proceed normally.
  }

  if (alreadyBound) {
    await clearPendingBind(worktreeDir);
    return;
  }

  // Step 2 — Write the CARD_ID marker.
  await writeCardBoundFile(worktreeDir, cardId);

  // Step 3 — Register the branch with the Cards API. Derive the branch name
  // from the worktree's checked-out HEAD — the same pattern used in
  // remove-worktree.ts (`git -C <dir> rev-parse --abbrev-ref HEAD`).
  let branchName: string;
  try {
    const { stdout } = await execFileAsync('git', ['-C', worktreeDir, 'rev-parse', '--abbrev-ref', 'HEAD']);
    branchName = stdout.trim();
  } catch (gitError) {
    // Cannot resolve the branch name — roll back the CARD_ID write and
    // preserve PENDING_BIND so the worktree is still re-tryable.
    await clearCardBoundFile(worktreeDir);
    throw gitError;
  }

  try {
    await client.addBranch(cardId, { name: branchName, worktree: worktreeDir, parentBranch }, { sessionId });
  } catch (addBranchError) {
    // Worktree-preserving rollback: un-write CARD_ID and restore PENDING_BIND
    // so the bind can be retried. NEVER call removeWorktree — the worktree
    // predates this bind and must survive regardless of outcome.
    await clearCardBoundFile(worktreeDir);
    await writePendingBind(worktreeDir, { version: 1, parentBranch, sessionId });
    throw addBranchError;
  }

  // Step 4 — Clear the PENDING_BIND marker now that the branch is registered.
  await clearPendingBind(worktreeDir);
}
