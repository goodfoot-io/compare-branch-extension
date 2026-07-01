/**
 * Node-only card repository utilities.
 *
 * Functions in this module use `execFileSync` and are not safe for browser
 * contexts. Import from `@cards.management/sdk/card-repo` to keep the `@cards.management/sdk/client`
 * subpath browser-safe.
 *
 * @summary Node-only card repository utilities
 * @module
 */

import { execFileSync } from 'node:child_process';
import { BOOKKEEPING_PATHSPEC_EXCLUSIONS } from './client/cardRepoFilters.js';

const SHA_PATTERN = /^[0-9a-f]{40}$/i;

function assertValidSha(sha: string, label: string): void {
  if (!SHA_PATTERN.test(sha)) {
    throw new Error(`Invalid ${label}: ${sha}`);
  }
}

/**
 * Returns all commit SHAs between sinceSha and HEAD in the given repo,
 * excluding commits that only touch system-managed bookkeeping paths
 * (session streams, commits.csv, branches.json).
 *
 * @param repoPath - Card repository path where git commands should execute.
 * @param sinceSha - Baseline SHA captured at session start.
 * @returns Newer commit SHAs in reverse chronological order (newest first).
 * @throws {Error} When the SHA is invalid or the git log command fails.
 */
export function getCommitsSince(repoPath: string, sinceSha: string): string[] {
  assertValidSha(sinceSha, 'since SHA');

  const output = execFileSync(
    'git',
    ['log', '--format=%H', `${sinceSha}..HEAD`, '--', '.', ...BOOKKEEPING_PATHSPEC_EXCLUSIONS],
    {
      cwd: repoPath,
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    }
  ).trim();

  if (!output) return [];

  const shas = output.split('\n');
  for (const sha of shas) {
    assertValidSha(sha, 'commit SHA');
  }
  return shas;
}
