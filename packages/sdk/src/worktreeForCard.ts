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
import { createHash } from 'node:crypto';
import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { acquireLock, releaseLock } from '@cards/sessions/internal';
import { resolveCardRepoPath } from './adhocAttribution.js';
import { isKnownAgentComm } from './bin/process-utils.js';
import { spawnAdhocAttribution } from './bin/spawnAdhocAttribution.js';
import { resolveGlobalCardsConfigDir } from './cards-config.js';
import type { CardsClient } from './client/cardsClient.js';
import { clearPendingBind } from './pendingBind.js';
import { findAgentPid } from './process-tree.js';
import {
  appendWorktreeGitExcludes,
  captureOriginalHooksPath,
  clearCardBoundFile,
  createWorktree,
  type EarlyWorktreeResult,
  findGitRoots,
  provisionSharedHooksDir,
  removeWorktree,
  resolveHomeDir,
  writeCardBoundFile
} from './worktree.js';

const execFileAsync = promisify(execFile);

/**
 * Minimal stderr logger shared by the outfit/release attribution path.
 *
 * The orchestrators have no structured logger, but {@link spawnAdhocAttribution}
 * and the adhoc-attribution helpers require a `warn`/`error` interface. Routing
 * diagnostics to stderr keeps stdout clean for any CLI caller whose stdout is a
 * machine-readable payload.
 */
const stderrLogger = {
  warn(message: string, data?: Record<string, unknown>): void {
    process.stderr.write(`${message}${data ? ` ${JSON.stringify(data)}` : ''}\n`);
  },
  error(message: string, data?: Record<string, unknown>): void {
    process.stderr.write(`${message}${data ? ` ${JSON.stringify(data)}` : ''}\n`);
  }
};

/** Maximum wait for the cross-process bind lock before failing closed. */
const BIND_LOCK_TIMEOUT_MS = 5_000;

/**
 * Resolves the cross-process advisory lock path for binding a given worktree.
 *
 * The worktree's absolute path is hashed (sha-256, hex) into a single safe
 * filename under `<globalCardsConfigDir>/bind-locks/`, so two `card create`
 * invocations targeting the same worktree contend on the same lock file
 * regardless of process. Hashing avoids path-separator and length issues from
 * embedding the directory verbatim in a filename.
 *
 * @param worktreeDir - Absolute worktree root.
 * @returns Absolute path to the worktree's bind lock file.
 */
function resolveBindLockPath(worktreeDir: string): string {
  const hash = createHash('sha256').update(worktreeDir).digest('hex');
  return join(resolveGlobalCardsConfigDir(), 'bind-locks', `${hash}.lock`);
}

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

export interface OutfitWorktreeForCardOptions {
  /** Card identifier this worktree is bound to. */
  cardId: string;
  /** Parent branch from which the worktree's branch was created, recorded in branches.json. */
  parentBranch: string;
  /** Session ID forwarded to addBranch and the attribution spawn for commit attribution. */
  sessionId?: string;
  /**
   * Path to the session transcript to watch. When omitted/empty the attribution
   * phase is skipped — this is the creation-time path, where attribution is
   * owned by the runtime session machinery, not the worktree orchestrator.
   */
  transcriptPath?: string;
  /** Map of git hook name to compiled .mjs path — required to avoid D10a attribution loss. */
  compiledScriptPaths: Record<string, string>;
}

/**
 * Outfits an existing worktree as card-bound: installs the commit-attribution
 * hooks on disk, registers the branch with the Cards API, and (when a transcript
 * is supplied) spawns transcript attribution.
 *
 * This is the single orchestrator both the creation-time and bind-time paths
 * funnel through, so the on-disk binding and API registration cannot drift
 * between them. It owns three ordered phases:
 *
 * **Disk phase** (synchronous before any caller commits, for the creation-time
 * flow — preserves the A2 guarantee). Every step is idempotent so a re-run after
 * a partial crash heals the worktree rather than corrupting it:
 * 1. Write `.cards/CARD_ID` ({@link writeCardBoundFile}, idempotent overwrite).
 * 2. Snapshot the original hooks path — GUARDED: skipped if
 *    `.cards/CARD_ORIGINAL_HOOK_PATH` already exists, so a re-run can never
 *    capture the cards hooks dir as the "original".
 * 3. Provision the shared dispatcher dir (idempotent).
 * 4. Enable `extensions.worktreeConfig` (idempotent git config).
 * 5. Set per-worktree `core.hooksPath` (idempotent git config --worktree).
 * 6. Append `.cards/CARD_ID` and `.cards/CARD_ORIGINAL_HOOK_PATH` to git excludes.
 *
 * **API phase** — `client.addBranch(...)` under the cross-process advisory bind
 * lock. No client-side pre-check (that would reintroduce the TOCTOU); the store's
 * upsert semantics make a re-run safe.
 *
 * **Attribution phase** — when `transcriptPath` is supplied, run
 * {@link spawnAdhocAttribution}. Activation is deliberately NOT written here — it
 * stays inside `adhoc-cleanup`, preserving the invariant that an `active` card
 * always has a live monitor and ref. The activatable-status guard and de-dupe
 * lock inside `spawnAdhocAttribution` are preserved untouched.
 *
 * @param client - CardsClient used to register the branch record.
 * @param worktreeDir - Absolute path to the (already-created) worktree root.
 * @param options - Card id, parent branch, session, transcript, and compiled hook paths.
 */
export async function outfitWorktreeForCard(
  client: CardsClient,
  worktreeDir: string,
  options: OutfitWorktreeForCardOptions
): Promise<void> {
  const { cardId, parentBranch, sessionId, transcriptPath, compiledScriptPaths } = options;

  if (cardId.length === 0) {
    throw new Error('outfitWorktreeForCard: cardId must be a non-empty string');
  }
  // D10a guard: dispatchers without .mjs files silently lose attribution.
  if (Object.keys(compiledScriptPaths).length === 0) {
    throw new Error('outfitWorktreeForCard: compiledScriptPaths must be non-empty');
  }

  // --- Disk phase (A2-critical for creation-time, idempotent for re-runs) ---

  const { repoRoot } = await findGitRoots(worktreeDir);

  // 1. Write .cards/CARD_ID (writeCardBoundFile mkdir -p's .cards itself).
  await writeCardBoundFile(worktreeDir, cardId);

  // 2. Snapshot the pre-existing hooks dir — GUARDED. If the snapshot already
  //    exists, a previous outfit already captured the user's original hooks dir;
  //    re-capturing now would record the cards shared dispatcher dir (set in
  //    step 5) as the "original" and break hook chaining. Skip on re-run.
  const originalHookPathFile = join(worktreeDir, '.cards', 'CARD_ORIGINAL_HOOK_PATH');
  let originalHookPathExists = false;
  try {
    await access(originalHookPathFile);
    originalHookPathExists = true;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
  if (!originalHookPathExists) {
    const originalHooksDir = await captureOriginalHooksPath(repoRoot);
    await writeFile(originalHookPathFile, originalHooksDir);
  }

  // 3. Provision the shared dispatcher dir (idempotent). It lives at a global,
  //    flat location (`~/.cards/workspace-hooks`) — the provisioned scripts and
  //    `.mjs` payloads are byte-identical across all repos and worktrees (every
  //    repo/worktree-specific value is resolved at runtime), so a single global
  //    dir is correct and keeps it out of any working tree. `$HOME` is the same
  //    anchor the dispatcher uses for `$HOME/.cards/VSCODE_NODE`.
  const sharedHooksDir = join(resolveHomeDir(), '.cards', 'workspace-hooks');
  await provisionSharedHooksDir(sharedHooksDir, compiledScriptPaths);

  // 4. Enable per-worktree config — MUST precede the --worktree write (D9).
  await execFileAsync('git', ['-C', repoRoot, 'config', 'extensions.worktreeConfig', 'true'], {
    timeout: 5_000
  });

  // 5. Point this worktree at the shared dispatcher dir (D9: after step 4).
  await execFileAsync('git', ['-C', worktreeDir, 'config', '--worktree', 'core.hooksPath', sharedHooksDir], {
    timeout: 5_000
  });

  // 6. Hide the binding markers from git status so they are never staged.
  await appendWorktreeGitExcludes(worktreeDir, ['.cards/CARD_ID', '.cards/CARD_ORIGINAL_HOOK_PATH']);

  // --- API phase ---

  // Serialize concurrent outfits against the same worktree across processes so
  // a re-run race cannot duplicate the addBranch POST. No client-side
  // pre-check: the store upserts, and a pre-check would reintroduce the TOCTOU.
  // Fail-closed: a lock-acquire timeout propagates.
  const lockPath = resolveBindLockPath(worktreeDir);
  await acquireLock(lockPath, BIND_LOCK_TIMEOUT_MS);
  try {
    const branchName = await resolveWorktreeBranchName(worktreeDir);
    await client.addBranch(cardId, { name: branchName, worktree: worktreeDir, parentBranch }, { sessionId });
  } finally {
    releaseLock(lockPath);
  }

  // --- Attribution phase ---

  // Only spawn when a transcript is supplied. The creation-time flow omits it —
  // attribution there is owned by the runtime session machinery, not this
  // orchestrator — so omitting the transcript leaves action-launch behavior
  // unchanged. Activation is NOT written here; it stays inside adhoc-cleanup so
  // an `active` card always has a live monitor + ref.
  if (transcriptPath && transcriptPath.length > 0 && sessionId && sessionId.length > 0) {
    const cardRepoPath = await resolveCardRepoPath(cardId, stderrLogger);
    if (!cardRepoPath) {
      stderrLogger.warn(
        'outfitWorktreeForCard: bound worktree but could not resolve card repository path — attribution not spawned',
        {
          cardId
        }
      );
      return;
    }

    const agentPid = findAgentPid();
    if (!agentPid || !isKnownAgentComm(agentPid, stderrLogger)) {
      stderrLogger.warn(
        'outfitWorktreeForCard: bound worktree but could not resolve a known agent PID — attribution not spawned',
        {
          cardId
        }
      );
      return;
    }

    const attributionLockPath = join(resolveGlobalCardsConfigDir(), 'adhoc-sessions', `${sessionId}.lock`);
    await spawnAdhocAttribution(
      { agentPid, sessionId, transcriptPath, cardId, cardRepoPath, lockPath: attributionLockPath },
      stderrLogger
    );
  }
}

/**
 * Resolves a worktree's checked-out branch name via
 * `git -C <dir> rev-parse --abbrev-ref HEAD`.
 *
 * @param worktreeDir - Absolute worktree root.
 * @returns The trimmed branch name.
 */
async function resolveWorktreeBranchName(worktreeDir: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-C', worktreeDir, 'rev-parse', '--abbrev-ref', 'HEAD'], {
    timeout: 5_000
  });
  return stdout.trim();
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
 * Composes the pure {@link createWorktree} git primitive with
 * {@link outfitWorktreeForCard}: it creates the worktree on disk, then — using
 * the EARLY worktree path (before `settle` resolves) — outfits it (installs the
 * attribution hooks and registers the branch) so the agent session can spawn
 * immediately without waiting for symlink wiring to finish. Outfit runs
 * synchronously before `settle` is returned, preserving the A2 guarantee for the
 * creation-time flow (the disk phase is in place before any caller can commit).
 *
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

  const result = await createWorktree(ref, { cwd });

  try {
    await outfitWorktreeForCard(client, result.path, {
      cardId,
      parentBranch,
      sessionId,
      compiledScriptPaths
    });
  } catch (outfitError) {
    // Atomicity: the worktree dir + git branch now exist on disk but outfit
    // failed partway (e.g. addBranch rejected), so no fully-registered worktree
    // exists. Roll the worktree back so no orphaned, unregistered worktree is
    // left behind (the exact debt this orchestrator exists to prevent).
    // `result.settle` is never returned on this path, so it would be an
    // unobserved promise — attach a no-op handler to keep a later settle
    // rejection from surfacing as an unhandledRejection, then tear down.
    void result.settle.catch(() => undefined);
    try {
      await removeWorktree(result.path);
    } catch (rollbackError) {
      // Surface the original outfit failure as the cause, but make the
      // partial-rollback visible: the worktree could not be cleaned up.
      throw new Error(
        `createWorktreeForCard: outfit failed and worktree rollback also failed at ${result.path}: ` +
          `outfit=${outfitError instanceof Error ? outfitError.message : String(outfitError)}; ` +
          `rollback=${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`
      );
    }
    throw outfitError;
  }

  return result;
}

export interface ReleaseWorktreeForCardOptions {
  /** Card identifier whose branch record will be unregistered. */
  cardId: string;
  /** Session ID forwarded to removeBranch for commit attribution. */
  sessionId?: string;
}

/**
 * Releases a worktree's card binding WITHOUT removing the worktree from disk.
 *
 * The inverse of {@link outfitWorktreeForCard}: it unregisters the branch
 * record, restores the worktree's original `core.hooksPath`, and clears the
 * `.cards/CARD_ID` marker. It is a standalone step — it never calls
 * {@link removeWorktree} — so it is usable on externally-located worktrees a
 * caller wants to un-bind but keep on disk.
 *
 * Steps:
 * 1. Derive the branch name via `git rev-parse --abbrev-ref HEAD`. On detached
 *    HEAD (`"HEAD"`) or a git error, log a warning and skip the branch
 *    unregister — there is no branch record we can confidently remove.
 * 2. `client.removeBranch(...)`, wrapped in {@link BranchUnregisterError} on
 *    failure so callers can apply the fail-open stance to the unregister phase.
 * 3. Restore `core.hooksPath` from `.cards/CARD_ORIGINAL_HOOK_PATH`. If the
 *    snapshot is missing (hand-made worktree, partial outfit), skip with a
 *    warning rather than fail.
 * 4. Clear `.cards/CARD_ID`.
 *
 * @param client - CardsClient used to unregister the branch record.
 * @param worktreeDir - Absolute path to the worktree directory (must still exist).
 * @param options - Card id and optional session id forwarded to removeBranch.
 * @throws BranchUnregisterError when removeBranch failed.
 */
export async function releaseWorktreeForCard(
  client: CardsClient,
  worktreeDir: string,
  options: ReleaseWorktreeForCardOptions
): Promise<void> {
  const { cardId, sessionId } = options;

  // Step 1 — Derive the branch name. Skip-with-warning on detached HEAD or a
  // git error, matching the existing worktree-remove stance.
  let branchName: string | undefined;
  try {
    branchName = await resolveWorktreeBranchName(worktreeDir);
    if (branchName === 'HEAD' || branchName.length === 0) {
      stderrLogger.warn(
        'releaseWorktreeForCard: worktree HEAD is detached; branch record could not be resolved, skipping branch unregister',
        { cardId, worktreeDir }
      );
      branchName = undefined;
    }
  } catch (gitError) {
    stderrLogger.warn('releaseWorktreeForCard: failed to resolve worktree branch name; skipping branch unregister', {
      cardId,
      worktreeDir,
      error: gitError instanceof Error ? gitError.message : String(gitError)
    });
    branchName = undefined;
  }

  // Step 2 — Unregister the branch record. Wrap in a distinct typed error so
  // callers branch on the unregister phase explicitly.
  if (branchName !== undefined) {
    try {
      await client.removeBranch(cardId, branchName, { sessionId });
    } catch (error) {
      throw new BranchUnregisterError(error);
    }
  }

  // Step 3 — Restore the worktree's original core.hooksPath from the snapshot.
  // Skip-with-warning if the snapshot is missing (hand-made worktree or a
  // partial outfit never wrote it).
  const originalHookPathFile = join(worktreeDir, '.cards', 'CARD_ORIGINAL_HOOK_PATH');
  let originalHooksDir: string | undefined;
  try {
    originalHooksDir = (await readFile(originalHookPathFile, 'utf-8')).trim();
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
  if (originalHooksDir && originalHooksDir.length > 0) {
    await execFileAsync('git', ['-C', worktreeDir, 'config', '--worktree', 'core.hooksPath', originalHooksDir], {
      timeout: 5_000
    });
  } else {
    stderrLogger.warn(
      'releaseWorktreeForCard: no CARD_ORIGINAL_HOOK_PATH snapshot found; leaving core.hooksPath unchanged',
      { cardId, worktreeDir }
    );
  }

  // Step 4 — Clear the CARD_ID marker.
  await clearCardBoundFile(worktreeDir);
}

export interface RemoveWorktreeForCardOptions {
  /** Card identifier whose branch record will be unregistered. */
  cardId: string;
  /**
   * Exact branch name to remove from the card's branch record. Retained for
   * caller compatibility; the branch is now derived inside
   * {@link releaseWorktreeForCard} from the worktree's HEAD.
   */
  branchName?: string;
  /** Session ID forwarded to removeBranch for commit attribution. */
  sessionId?: string;
}

/**
 * Removes a card-bound worktree and unregisters its branch from the Cards API.
 *
 * Composes {@link releaseWorktreeForCard} with the pure {@link removeWorktree}
 * git primitive. Release runs FIRST — it reads the worktree's HEAD and the
 * `CARD_ORIGINAL_HOOK_PATH` snapshot, both of which require the worktree to
 * still exist on disk — then the worktree is torn down.
 *
 * Teardown still runs even when release throws: a release failure (e.g. a
 * {@link BranchUnregisterError} from a failed removeBranch) leaves only a
 * recoverable orphaned record, so the disk teardown proceeds regardless and the
 * release error is rethrown afterward. A {@link removeWorktree} failure (the
 * teardown phase) propagates untouched so callers can apply their teardown
 * stance to it.
 *
 * @param client - CardsClient used to unregister the branch record.
 * @param worktreePath - Absolute path to the worktree directory.
 * @param options - Card-binding options.
 * @throws BranchUnregisterError when release failed but disk teardown succeeded.
 */
export async function removeWorktreeForCard(
  client: CardsClient,
  worktreePath: string,
  options: RemoveWorktreeForCardOptions
): Promise<void> {
  const { cardId, sessionId } = options;

  // Release first (needs the worktree on disk), capturing any failure so disk
  // teardown still runs. removeWorktree always executes; the release failure is
  // rethrown only after teardown completes.
  let releaseError: unknown;
  try {
    await releaseWorktreeForCard(client, worktreePath, { cardId, sessionId });
  } catch (error) {
    releaseError = error;
  }

  // Teardown phase: any failure here propagates untouched — it is the
  // worktree-removal failure the callers' teardown stance handles.
  await removeWorktree(worktreePath);

  if (releaseError !== undefined) {
    throw releaseError;
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
 * Outcome of {@link bindWorktreeToCard}.
 *
 * - `'bound'` — this call wrote `.cards/CARD_ID` and registered the branch for
 *   `cardId`. The caller may proceed with card-specific setup (e.g. spawning
 *   attribution) knowing the worktree now belongs to *this* card.
 * - `'already-bound'` — the reconciliation guard found `.cards/CARD_ID` already
 *   present (the worktree is bound, possibly to a *different* card, or in a
 *   both-markers crash state). No `addBranch` was issued; only a stale
 *   `PENDING_BIND` was drained. The caller MUST NOT spawn attribution for
 *   `cardId` — the worktree's true owner is whatever `CARD_ID` already records.
 */
export type BindWorktreeOutcome = 'bound' | 'already-bound';

/**
 * Binds an already-existing, unbound worktree to a card.
 *
 * Sibling to {@link createWorktreeForCard} but for the inverted flow: the
 * worktree already exists on disk (created by a WorktreeCreate hook without a
 * pre-bound card), carries a `.cards/PENDING_BIND` marker, and needs to be
 * associated with a card record after `card create` runs inside it.
 *
 * Steps (under a cross-process advisory file lock keyed on the worktree path so
 * concurrent `card create` invocations — separate short-lived Node processes —
 * serialize against the same worktree; `addBranch` is a non-idempotent POST and
 * the reconciliation guard below is a TOCTOU check that only an out-of-process
 * lock can make safe):
 *
 * 1. Reconciliation guard: if `.cards/CARD_ID` already exists, the worktree is
 *    already bound (or in a both-markers crash state). Clear any stale
 *    `PENDING_BIND`, return `'already-bound'`, and do NOT call `addBranch`.
 * 2. Write `.cards/CARD_ID` via {@link writeCardBoundFile}.
 * 3. Call `client.addBranch(...)` with the worktree's checked-out branch name.
 * 4. Exclude `.cards/CARD_ID` from the worktree's git `info/exclude` (the
 *    unbound creation path only excluded `.cards/PENDING_BIND`).
 * 5. Clear the `PENDING_BIND` marker and return `'bound'`.
 *
 * **Worktree-preserving rollback**: if branch-name resolution or `addBranch`
 * throws, `CARD_ID` is un-written and the error is rethrown. The on-disk
 * `PENDING_BIND` marker is left untouched — it was never cleared (that happens
 * only on success at step 5), so the original full marker written by
 * EnterWorktree remains intact and the bind stays re-tryable. `removeWorktree`
 * is NEVER called — the worktree predates the bind and must survive regardless
 * of bind outcome.
 *
 * @param client - CardsClient used to register the branch record.
 * @param worktreeDir - Absolute path to the (already-existing) worktree root.
 * @param options - Binding options.
 * @returns `'bound'` when this call performed the bind; `'already-bound'` when
 *   the worktree was already bound and only reconciliation ran.
 */
export async function bindWorktreeToCard(
  client: CardsClient,
  worktreeDir: string,
  options: BindWorktreeToCardOptions
): Promise<BindWorktreeOutcome> {
  const { cardId, parentBranch, sessionId } = options;

  // Serialize concurrent binds against the same worktree across processes.
  // `card create` is a short-lived CLI, so two concurrent invocations are
  // separate Node processes — an in-process lock would not serialize them and
  // both would pass the reconciliation guard's TOCTOU access() check, then both
  // call the non-idempotent addBranch and write duplicate branch records. A
  // cross-process advisory file lock keyed on the worktree path closes that
  // window. Fail-closed: a lock-acquire timeout propagates.
  const lockPath = resolveBindLockPath(worktreeDir);
  await acquireLock(lockPath, BIND_LOCK_TIMEOUT_MS);
  try {
    // Step 1 — Reconciliation guard: if CARD_ID already exists, the worktree is
    // already bound (normal re-entry) or in a both-markers crash state (CARD_ID
    // written, PENDING_BIND clear not yet done before crash). In either case,
    // drain the stale PENDING_BIND so the EnterWorktree nag stops and return
    // 'already-bound' without calling addBranch (a non-idempotent POST).
    const cardIdPath = join(worktreeDir, '.cards', 'CARD_ID');
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
      return 'already-bound';
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
      // Cannot resolve the branch name — roll back only the CARD_ID write. The
      // on-disk PENDING_BIND marker is still the original full marker (never
      // cleared yet), so the worktree stays re-tryable.
      await clearCardBoundFile(worktreeDir);
      throw gitError;
    }

    try {
      await client.addBranch(cardId, { name: branchName, worktree: worktreeDir, parentBranch }, { sessionId });
    } catch (addBranchError) {
      // Worktree-preserving rollback: un-write CARD_ID only. Do NOT rewrite
      // PENDING_BIND — the on-disk marker was never cleared on this path, so it
      // is still the original full marker EnterWorktree wrote (with its
      // transcriptPath + sessionId). Rewriting it here would overwrite that
      // valid marker with a transcriptPath-stripped copy and brick the
      // worktree. NEVER call removeWorktree — the worktree predates this bind.
      await clearCardBoundFile(worktreeDir);
      throw addBranchError;
    }

    // Step 4 — Clear the PENDING_BIND marker now that the branch is registered.
    // This runs before the git-exclude step so that a transient fs/git hiccup
    // in the display-only exclude cannot strand the both-markers state.
    await clearPendingBind(worktreeDir);

    // Step 5 — Exclude the CARD_ID marker from the worktree's git status. The
    // unbound creation path only excluded PENDING_BIND, so the CARD_ID this
    // bind just wrote would otherwise show as untracked and committable.
    // This step is display-only (not attribution-critical): if it throws, log
    // the failure to stderr and continue — the bind is already durable.
    try {
      await appendWorktreeGitExcludes(worktreeDir, ['.cards/CARD_ID']);
    } catch (excludeError) {
      process.stderr.write(
        `bindWorktreeToCard: failed to add .cards/CARD_ID to git info/exclude (display-only; bind succeeded): ${
          excludeError instanceof Error ? excludeError.message : String(excludeError)
        }\n`
      );
    }

    return 'bound';
  } finally {
    releaseLock(lockPath);
  }
}
