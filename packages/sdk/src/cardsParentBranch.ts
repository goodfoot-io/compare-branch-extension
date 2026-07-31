/**
 * Git `branch.<name>.cardsParent` config writer and bind-time resolver.
 *
 * At worktree-creation time, {@link writeCardsParentConfig} records the branch
 * that was current when the worktree was created so that `cards create` can
 * retrieve it later even after a process boundary.
 *
 * At bind time (when `cards create` runs), {@link resolveCardsParentBranch}
 * walks a prioritized resolution chain and returns either the resolved branch
 * name or a `{ kind: 'refuse' }` result that aborts creation before any card
 * is minted.
 *
 * @summary cardsParent git config write and bind-time parentBranch resolver
 * @module cardsParentBranch
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { gitConfigWithRetry } from './worktree.js';

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
 * Callers must abort `cards create` before calling `createCard` when they
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
  // Retried on config-lock contention: this write runs during worktree
  // creation, concurrently with other config writers on the same repository.
  await gitConfigWithRetry(['-C', worktreeDir, 'config', `branch.${newBranchName}.cardsParent`, parentBranch]);
}

/**
 * Resolves the parent branch for a bind-time `cards create` invocation.
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
  //
  // `%D` emits a ref *decoration* string, not a bare branch name: e.g.
  // `HEAD -> feature`, or `HEAD -> feature, tag: v1, origin/feature` when the
  // commit carries multiple refs. Tokenize before validating: split on `,`,
  // strip the `HEAD -> ` arrow prefix, drop `tag:`/non-branch decorations, and
  // pick the first token that is a real branch name AND is not the worktree's
  // own current branch (a branch is never its own parent). Recording the raw
  // composite string would corrupt branches.json.
  try {
    const { stdout } = await execFileAsync('git', [
      '-C',
      worktreeDir,
      'log',
      '-1',
      '--pretty=%D',
      '--simplify-by-decoration'
    ]);
    const candidate = pickReflogParentBranch(stdout, checkedOutBranch);
    if (candidate) {
      return { kind: 'resolved', parentBranch: candidate };
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
 * Picks a usable parent branch name out of a `git log --pretty=%D` decoration
 * string.
 *
 * `%D` emits a comma-separated ref decoration, e.g.
 * `HEAD -> feature, tag: v1, origin/feature`. This tokenizes it and returns the
 * first token that:
 * - is a real branch name (not the literal `HEAD`, not a 40-hex SHA), and
 * - is not the worktree's own current branch (a branch is never its own parent).
 *
 * `tag: …` and other non-branch decorations are dropped. The `HEAD -> ` arrow
 * prefix is stripped from the token it leads. Remote-tracking decorations like
 * `origin/feature` are left intact and accepted as real branch names.
 *
 * @param decoration - Raw stdout from `git log -1 --pretty=%D --simplify-by-decoration`.
 * @param ownBranch - The worktree's current branch name, or `null` when detached.
 * @returns The chosen parent branch name, or `null` when no usable token remains.
 */
function pickReflogParentBranch(decoration: string, ownBranch: string | null): string | null {
  for (const rawToken of decoration.split(',')) {
    let token = rawToken.trim();
    if (!token) continue;
    // Strip the `HEAD -> ` arrow prefix that leads the symbolic-ref token.
    if (token.startsWith('HEAD -> ')) {
      token = token.slice('HEAD -> '.length).trim();
    }
    // Drop `tag:` and any other `<kind>: <name>` non-branch decorations.
    if (token.includes(':')) continue;
    if (!isRealBranchName(token)) continue;
    // A branch is never its own parent.
    if (ownBranch !== null && token === ownBranch) continue;
    return token;
  }
  return null;
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
