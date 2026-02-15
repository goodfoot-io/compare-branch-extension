/**
 * Stop hook implementation.
 *
 * Runs as a subprocess of an action. Uses {@link extractActionInput} to
 * confirm we are inside an action subprocess and to expose the action
 * process environment variables.
 *
 * After confirming the action context, the hook checks for unattributed
 * commits in the card repo since the session started (tracked via a
 * per-session `.head` file). Unattributed commits are those not recorded
 * in the session's CSV by the card-repo post-commit hook.
 *
 *
 * @summary Stop hook implementation
 * @see https://code.claude.com/docs/en/hooks#stop
 */

import { execFileSync } from 'node:child_process';
import {
  appendCommitToSession,
  getSessionCommits,
  readSessionHeadSha,
  removeSessionCsv,
  removeSessionHeadSha,
  removeSessionPid
} from '@cards/git-hooks/lib/card-repo-sessions';
import { findClaudePid } from '@cards/git-hooks/lib/process-tree';
import type { ActionInput } from '@cards/sdk/config';
import { extractActionInput } from '@cards/sdk/config';
import type { Logger } from '@goodfoot/claude-code-hooks';
import { stopHook, stopOutput } from '@goodfoot/claude-code-hooks';

/**
 * Well-known git empty tree SHA, used as a diff base for initial commits.
 * This is a deterministic value that never changes.
 */
const EMPTY_TREE_SHA = '4b825dc642cb6eb9a060e54bf899d15363d7aa09';
const SHA_PATTERN = /^[0-9a-f]{40}$/i;

/**
 * Error thrown when `git log` fails to list commits since a baseline SHA.
 */
export class CommitLogError extends Error {
  override readonly name = 'CommitLogError';

  constructor(
    public readonly repoPath: string,
    public readonly sinceSha: string,
    cause: unknown
  ) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to list commits since ${sinceSha} in ${repoPath}: ${reason}`);
    this.cause = cause;
  }
}

/**
 * Error thrown when `git diff` fails to generate a diff for unattributed commits.
 */
export class CommitDiffError extends Error {
  override readonly name = 'CommitDiffError';

  constructor(
    public readonly repoPath: string,
    public readonly shas: string[],
    cause: unknown
  ) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to generate diff for ${shas.length} commit(s) in ${repoPath}: ${reason}`);
    this.cause = cause;
  }
}

/**
 * Error thrown when recording an unattributed commit to the session CSV fails.
 */
export class CommitRecordError extends Error {
  override readonly name = 'CommitRecordError';

  constructor(
    public readonly sessionId: string,
    public readonly sha: string,
    cause: unknown
  ) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to record commit ${sha} for session ${sessionId}: ${reason}`);
    this.cause = cause;
  }
}

/**
 * Error thrown when session cleanup (PID/CSV removal) fails.
 */
export class SessionCleanupError extends Error {
  override readonly name = 'SessionCleanupError';

  constructor(
    public readonly sessionId: string,
    cause: unknown
  ) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to clean up session ${sessionId}: ${reason}`);
    this.cause = cause;
  }
}

function assertValidSha(sha: string, label: string): void {
  if (!SHA_PATTERN.test(sha)) {
    throw new Error(`Invalid ${label}: ${sha}`);
  }
}

/**
 * Returns all commit SHAs between sinceSha and HEAD in the given repo.
 * Runs: git log --format=%H sinceSha..HEAD
 *
 * @param repoPath - Card repository path where git commands should execute.
 * @param sinceSha - Baseline SHA captured at session start.
 * @returns Newer commit SHAs in reverse chronological order (newest first).
 * @throws {CommitLogError} When the git log command fails.
 */
export function getCommitsSince(repoPath: string, sinceSha: string): string[] {
  assertValidSha(sinceSha, 'since SHA');

  try {
    const output = execFileSync('git', ['log', '--format=%H', `${sinceSha}..HEAD`], {
      cwd: repoPath,
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    if (!output) return [];
    const shas = output.split('\n');
    for (const sha of shas) {
      assertValidSha(sha, 'commit SHA');
    }
    return shas;
  } catch (error) {
    throw new CommitLogError(repoPath, sinceSha, error);
  }
}

/**
 * Returns commits from allCommits that are NOT in sessionCommits.
 *
 * @param allCommits - Full commit list detected since session start.
 * @param sessionCommits - Commits already attributed to the current session.
 * @returns SHAs that still need attribution review.
 */
export function getUnattributedCommits(allCommits: string[], sessionCommits: string[]): string[] {
  const sessionSet = new Set(sessionCommits);
  return allCommits.filter((sha) => !sessionSet.has(sha));
}

/**
 * Returns the combined diff content for the given commit SHAs.
 * Uses the range from oldest unattributed commit's parent to HEAD.
 * Detects initial commits (no parent) and uses the empty tree SHA as base.
 *
 * @param repoPath - Card repository path where git commands should execute.
 * @param shas - Unattributed commit SHAs (newest first from {@link getCommitsSince}).
 * @returns Unified diff text for all unattributed changes.
 * @throws {CommitDiffError} When the git diff command fails.
 */
export function getDiffForCommits(repoPath: string, shas: string[]): string {
  if (shas.length === 0) return '';
  // shas are in reverse chronological order (newest first from git log)
  // oldest is last element
  const oldest = shas[shas.length - 1]!;
  assertValidSha(oldest, 'oldest commit SHA');

  try {
    // Determine the diff base: check if the oldest commit has a parent.
    // `git rev-list --parents -n 1 SHA` outputs "SHA PARENT..." for regular
    // commits and just "SHA" for initial commits (no parent).
    const parentCheck = execFileSync('git', ['rev-list', '--parents', '-n', '1', oldest], {
      cwd: repoPath,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    const base = parentCheck.includes(' ') ? `${oldest}~1` : EMPTY_TREE_SHA;

    return execFileSync('git', ['diff', `${base}..HEAD`], {
      cwd: repoPath,
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (error) {
    throw new CommitDiffError(repoPath, shas, error);
  }
}

/**
 * Records unattributed commits so they are treated as acknowledged on the next stop.
 *
 * @param sessionId - Session ID whose commit CSV should be updated.
 * @param shas - Unattributed commit SHAs to persist.
 * @throws {CommitRecordError} When a commit cannot be appended to the session CSV.
 */
async function recordUnattributedCommits(sessionId: string, shas: string[]): Promise<void> {
  for (const sha of shas) {
    try {
      await appendCommitToSession(sessionId, sha);
    } catch (error) {
      throw new CommitRecordError(sessionId, sha, error);
    }
  }
}

/**
 * Removes PID/session artifacts created during session-start.
 *
 * @param logger - Hook logger used for diagnostic output.
 * @param sessionId - Session ID whose CSV buffer should be cleaned up.
 * @throws {SessionCleanupError} When PID or CSV cleanup fails.
 */
async function cleanupSession(logger: Logger, sessionId: string): Promise<void> {
  const resolvedPid = findClaudePid();

  try {
    if (resolvedPid) {
      await removeSessionPid(resolvedPid);
      logger.info('Cleaned up PID registration', { pid: resolvedPid });
    }

    removeSessionHeadSha(sessionId);
    removeSessionCsv(sessionId);
    logger.info('Cleaned up session CSV', { sessionId });
  } catch (error) {
    throw new SessionCleanupError(sessionId, error);
  }
}

export default stopHook({}, async (input, { logger }) => {
  let actionInput: ActionInput;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Not running inside an action subprocess', { error: message });
    return stopOutput({
      decision: 'approve',
      systemMessage: 'Stop hook: not running inside an action subprocess.'
    });
  }

  const headSha = readSessionHeadSha(input.session_id);
  if (!headSha) {
    logger.info('No SESSION_GIT_HEAD_SHA — skipping commit attribution check');
    return stopOutput({
      decision: 'approve',
      systemMessage: 'Stop approved (no HEAD SHA tracked for this session).'
    });
  }

  const sessionId = input.session_id;

  // Get all commits since session start
  let allCommits: string[];
  try {
    allCommits = getCommitsSince(actionInput.cardRepoPath, headSha);
  } catch (error) {
    if (error instanceof CommitLogError) {
      logger.error('Failed to list commits', { repoPath: error.repoPath, error: error.message });
      return stopOutput({
        decision: 'approve',
        systemMessage: [
          `Could not list commits since session start in '${error.repoPath}'.`,
          '',
          `Error: ${error.message}`,
          '',
          'Commit attribution could not be verified. To investigate:',
          `1. Verify the card repository is a valid git repo at: ${error.repoPath}`,
          '2. Check that git is available and the repository is not corrupted',
          `3. Confirm the baseline SHA (${error.sinceSha}) exists in the repository`
        ].join('\n'),
        reason: `Commit log failed: ${error.message}`
      });
    }
    throw error;
  }

  if (allCommits.length === 0) {
    // No commits since session start — approve (include cleanup warnings if any)
    try {
      await cleanupSession(logger, sessionId);
    } catch (error) {
      if (error instanceof SessionCleanupError) {
        logger.error('Session cleanup failed', { sessionId: error.sessionId, error: error.message });
        return stopOutput({
          decision: 'approve',
          systemMessage: [
            'Stop approved — no commits since session start.',
            '',
            `Warning: ${error.message}`,
            '',
            'Stale session artifacts may remain. To clean up manually:',
            '1. Check for leftover PID entries in the session registry',
            `2. Remove the session CSV for session ${sessionId} if it exists`
          ].join('\n'),
          reason: `Cleanup failed: ${error.message}`
        });
      }
      throw error;
    }
    return stopOutput({
      decision: 'approve',
      systemMessage: 'Stop approved — no commits since session start.'
    });
  }

  // Get session's attributed commits
  let sessionCommits: string[];
  try {
    sessionCommits = getSessionCommits(sessionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to read session commits', { error: message });
    return stopOutput({
      decision: 'approve',
      systemMessage: [
        `Could not read session commit records for session ${sessionId}.`,
        '',
        `Error: ${message}`,
        '',
        'Commit attribution could not be verified. To investigate:',
        '1. Check that the session CSV file exists and is readable',
        `2. Verify file permissions for session ${sessionId}`
      ].join('\n'),
      reason: `Session CSV read failed: ${message}`
    });
  }

  const unattributed = getUnattributedCommits(allCommits, sessionCommits);

  if (unattributed.length === 0) {
    // All commits attributed — approve (include cleanup warnings if any)
    try {
      await cleanupSession(logger, sessionId);
    } catch (error) {
      if (error instanceof SessionCleanupError) {
        logger.error('Session cleanup failed', { sessionId: error.sessionId, error: error.message });
        return stopOutput({
          decision: 'approve',
          systemMessage: [
            `Stop approved — all ${allCommits.length} commits attributed to this session.`,
            '',
            `Warning: ${error.message}`,
            '',
            'Stale session artifacts may remain. To clean up manually:',
            '1. Check for leftover PID entries in the session registry',
            `2. Remove the session CSV for session ${sessionId} if it exists`
          ].join('\n'),
          reason: `Cleanup failed: ${error.message}`
        });
      }
      throw error;
    }
    return stopOutput({
      decision: 'approve',
      systemMessage: `Stop approved — all ${allCommits.length} commits attributed to this session.`
    });
  }

  // Unattributed commits found — gather diff, record, cleanup, then block.
  // Errors in these side-effect operations are collected as warnings and
  // included in the output without changing the block decision.
  const warnings: string[] = [];

  let diffContent: string;
  try {
    diffContent = getDiffForCommits(actionInput.cardRepoPath, unattributed);
  } catch (error) {
    if (error instanceof CommitDiffError) {
      logger.error('Failed to generate diff', { repoPath: error.repoPath, error: error.message });
      diffContent = [
        `(Could not generate diff for ${error.shas.length} commit(s))`,
        '',
        `Error: ${error.message}`,
        '',
        'To view the diff manually:',
        `  git -C ${error.repoPath} diff ${error.shas[error.shas.length - 1]}~1..HEAD`
      ].join('\n');
      warnings.push(`Diff generation failed: ${error.message}`);
    } else {
      throw error;
    }
  }

  try {
    await recordUnattributedCommits(sessionId, unattributed);
  } catch (error) {
    if (error instanceof CommitRecordError) {
      logger.error('Failed to record unattributed commit', {
        sessionId: error.sessionId,
        sha: error.sha,
        error: error.message
      });
      warnings.push(
        `Commit recording failed for ${error.sha}: ${error.message}. ` +
          'The next stop may re-flag these commits as unattributed. ' +
          'Verify the session CSV is writable.'
      );
    } else {
      throw error;
    }
  }

  try {
    await cleanupSession(logger, sessionId);
  } catch (error) {
    if (error instanceof SessionCleanupError) {
      logger.error('Session cleanup failed', { sessionId: error.sessionId, error: error.message });
      warnings.push(
        `Session cleanup failed: ${error.message}. ` +
          'Stale PID entries or CSV files may remain. ' +
          `Check the session registry and remove artifacts for session ${sessionId} manually.`
      );
    } else {
      throw error;
    }
  }

  const commitSummary = `${unattributed.length} unattributed commit${unattributed.length > 1 ? 's' : ''}`;
  const warningBlock = warnings.length > 0 ? `\n\nWarnings:\n${warnings.map((w) => `- ${w}`).join('\n')}` : '';

  return stopOutput({
    decision: 'block',
    reason: `External changes detected in card repo (${commitSummary}):\n\n${diffContent}${warningBlock}`
  });
});
