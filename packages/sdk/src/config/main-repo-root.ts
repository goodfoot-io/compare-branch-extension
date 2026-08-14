/**
 * Internal main-repository root resolution shared by config diagnostics.
 * @summary Resolves the owning main repository with rich failure information.
 * @module
 */

import { execFileSync } from 'node:child_process';
import { basename, dirname } from 'node:path';

/** Result of resolving the owning main repository. */
export type MainRepoRootResult = { ok: true; path: string } | { ok: false; reason: string };

/**
 * Turns an unknown failure into bounded, single-line diagnostic text.
 * @param error - Failure raised while resolving the repository.
 * @returns Safe text suitable for a caller-owned warning channel.
 */
function describeFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const singleLine = message.replace(/[\r\n]+/gu, ' ').trim();
  return singleLine.length > 1024 ? `${singleLine.slice(0, 1009)}...[truncated]` : singleLine;
}

/**
 * Resolves the owning main repository without guessing at nonstandard layouts.
 *
 * `REPO_ROOT` wins when nonempty. Otherwise the git common directory is used
 * only when it has the standard `<root>/.git` shape, including from a linked
 * worktree. Failures remain data so callers can either suppress or report them.
 * @returns A resolved absolute path or a durable disabled reason.
 */
export function resolveMainRepoRoot(): MainRepoRootResult {
  const repoRoot = process.env['REPO_ROOT'];
  if (repoRoot !== undefined && repoRoot.length > 0) {
    return { ok: true, path: repoRoot };
  }

  try {
    const commonDir = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000
    }).trim();

    if (commonDir.length === 0) {
      return { ok: false, reason: 'git returned an empty common directory' };
    }

    if (basename(commonDir) !== '.git') {
      return {
        ok: false,
        reason: `git common directory has unsupported basename ${JSON.stringify(basename(commonDir))}`
      };
    }

    return { ok: true, path: dirname(commonDir) };
  } catch (error) {
    return { ok: false, reason: `git common-directory lookup failed: ${describeFailure(error)}` };
  }
}
