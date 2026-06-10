/**
 * Git `branch.<name>.cardsParent` config writer and bind-time resolver.
 *
 * At worktree-creation time, {@link writeCardsParentConfig} records the branch
 * that was current when the worktree was created so that `card create` can
 * retrieve it later even after a process boundary.
 *
 * At bind time (when `card create` runs), {@link resolveCardsParentBranch}
 * walks a prioritized resolution chain and returns either the resolved branch
 * name or a `{ kind: 'refuse' }` result that aborts creation before any card
 * is minted.
 *
 * @summary cardsParent git config write and bind-time parentBranch resolver
 * @module cardsParentBranch
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Regex that matches a 40-hex-character SHA — used to reject SHAs as parent branches. */
const SHA_PATTERN = /^[0-9a-f]{40}$/i;

/**
 * Returns `true` when `error` is a non-zero exit from a child process.
 *
 * `execFile` / `execFileAsync` throw an object with a numeric `code` property
 * when the spawned process exits with a non-zero status. Any other shape (e.g.
 * `ENOENT` from a missing binary, or a JS-side `Error`) is not a git exit error
 * and should propagate.
 *
 * @param error - The caught value.
 * @returns `true` when the error carries a numeric process exit `code`.
 */
function isGitExitError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as Record<string, unknown>;
  return typeof e['code'] === 'number';
}

/**
 * A resolved parent branch name.
 */
export interface CardsParentResolved {
  kind: 'resolved';
  /** The resolved parent branch name. */
  parentBranch: string;
}

/**
 * A refusal result returned when no valid parent branch can be determined.
 *
 * Callers must abort `card create` before calling `createCard` when they
 * receive this — no orphan card should be minted.
 */
export interface CardsParentRefused {
  kind: 'refuse';
  /** Human-readable explanation of why resolution failed, suitable for stderr. */
  reason: string;
}

/** Union of both possible resolution outcomes. */
export type CardsParentResult = CardsParentResolved | CardsParentRefused;

/**
 * Writes the `branch.<newBranchName>.cardsParent` git config value in the
 * given worktree directory.
 *
 * Called immediately after the branch exists on disk (inside
 * `createWorktree`/`createWorktreeForCard`), with `parentBranch` captured by
 * `resolveCurrentBranch(cwd)` **before** the worktree was created — the only
 * point where the source HEAD is knowably a branch name.
 *
 * @param worktreeDir - Absolute path to the worktree where git should run.
 * @param newBranchName - The name of the newly-created branch.
 * @param parentBranch - The branch that was current when the worktree was created.
 */
export async function writeCardsParentConfig(
  worktreeDir: string,
  newBranchName: string,
  parentBranch: string
): Promise<void> {
  await execFileAsync('git', ['-C', worktreeDir, 'config', `branch.${newBranchName}.cardsParent`, parentBranch]);
}

/**
 * Resolves the parent branch for a bind-time `card create` invocation.
 *
 * Resolution chain (first non-empty valid result wins):
 * 1. `git config branch.<checkedOutBranch>.cardsParent`
 * 2. Reflog decoration (`git log -1 --pretty=%D --simplify-by-decoration`) —
 *    accepted only if the result is a real branch name (rejects 40-hex SHA and
 *    the literal string `"HEAD"`).
 * 3. The `parentBranchFlag` argument (caller-supplied `--parent-branch` CLI flag).
 * 4. Fail closed: returns `{ kind: 'refuse', reason }`.
 *
 * @param worktreeDir - Absolute path to the worktree where git should run.
 * @param parentBranchFlag - Optional `--parent-branch` flag value from the CLI.
 * @returns Resolved parent branch name, or a refusal with an actionable reason.
 */
export async function resolveCardsParentBranch(
  worktreeDir: string,
  parentBranchFlag?: string
): Promise<CardsParentResult> {
  // 1. Determine the currently checked-out branch name.
  let checkedOutBranch: string | null = null;
  try {
    const { stdout } = await execFileAsync('git', ['-C', worktreeDir, 'rev-parse', '--abbrev-ref', 'HEAD']);
    const trimmed = stdout.trim();
    if (trimmed && trimmed !== 'HEAD') {
      checkedOutBranch = trimmed;
    }
  } catch (error: unknown) {
    // git is unavailable or the directory is not a repo — non-zero exit is
    // expected in those cases. Any other error propagates.
    if (!isGitExitError(error)) throw error;
  }

  // 2. Try git config branch.<branch>.cardsParent.
  if (checkedOutBranch) {
    try {
      const { stdout } = await execFileAsync('git', [
        '-C',
        worktreeDir,
        'config',
        `branch.${checkedOutBranch}.cardsParent`
      ]);
      const value = stdout.trim();
      if (value) {
        return { kind: 'resolved', parentBranch: value };
      }
    } catch (error: unknown) {
      // `git config` exits 1 when the key is absent — that is expected.
      // Any other error propagates.
      if (!isGitExitError(error)) throw error;
    }
  }

  // 3. Try reflog decoration — accept only a real branch name.
  try {
    const { stdout } = await execFileAsync('git', [
      '-C',
      worktreeDir,
      'log',
      '-1',
      '--pretty=%D',
      '--simplify-by-decoration'
    ]);
    const reflogValue = stdout.trim();
    if (reflogValue && isRealBranchName(reflogValue)) {
      return { kind: 'resolved', parentBranch: reflogValue };
    }
  } catch (error: unknown) {
    // git log failure due to non-zero exit (e.g. empty repo) is expected.
    if (!isGitExitError(error)) throw error;
  }

  // 4. Try the --parent-branch CLI flag.
  if (parentBranchFlag?.trim()) {
    return { kind: 'resolved', parentBranch: parentBranchFlag.trim() };
  }

  // 5. Fail closed.
  return {
    kind: 'refuse',
    reason:
      'Cannot determine parent branch for bind-time card creation.\n' +
      'No `branch.<name>.cardsParent` git config was found, the reflog decoration\n' +
      'was absent or ambiguous, and no --parent-branch flag was provided.\n' +
      'Re-run with --parent-branch <branch> to specify the parent branch explicitly.'
  };
}

/**
 * Returns `true` when `value` is a real branch name that can be used as a
 * parent branch.
 *
 * Rejects:
 * - 40-hex-character SHAs (matching {@link SHA_PATTERN})
 * - The literal string `"HEAD"`
 * - Empty strings
 *
 * @param value - Candidate branch name.
 * @returns `true` when `value` is a usable parent branch name.
 */
function isRealBranchName(value: string): boolean {
  if (!value) return false;
  if (value === 'HEAD') return false;
  if (SHA_PATTERN.test(value)) return false;
  return true;
}
