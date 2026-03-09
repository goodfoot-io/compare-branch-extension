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
import { appendCommitToSession, getSessionCommits, readSessionHeadSha } from '@cards/claude-code-sessions/card-repo';
import type { ActionInput } from '@cards/sdk/config';
import { extractActionInput } from '@cards/sdk/config';
import { stopHook, stopOutput } from '@goodfoot/claude-code-hooks';
import { stripDiffstatSummaries } from './lib/context.js';

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

function assertValidSha(sha: string, label: string): void {
  if (!SHA_PATTERN.test(sha)) {
    throw new Error(`Invalid ${label}: ${sha}`);
  }
}

/**
 * Returns all commit SHAs between sinceSha and HEAD in the given repo,
 * excluding commits that only touch files under `streams/claude-code-session/`.
 * Runs: git log --format=%H sinceSha..HEAD -- . :!streams/claude-code-session/
 *
 * @param repoPath - Card repository path where git commands should execute.
 * @param sinceSha - Baseline SHA captured at session start.
 * @returns Newer commit SHAs in reverse chronological order (newest first).
 * @throws {CommitLogError} When the git log command fails.
 */
export function getCommitsSince(repoPath: string, sinceSha: string): string[] {
  assertValidSha(sinceSha, 'since SHA');

  try {
    const output = execFileSync(
      'git',
      ['log', '--format=%H', `${sinceSha}..HEAD`, '--', '.', ':!streams/claude-code-session/'],
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
    logger.info('No HEAD SHA on file — skipping commit attribution check');
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
    return stopOutput({
      decision: 'approve',
      systemMessage: `Stop approved — all ${allCommits.length} commits attributed to this session.`
    });
  }

  // Unattributed commits found — gather stat, record, then block.
  // Errors in these side-effect operations are collected as warnings and
  // included in the output without changing the block decision.
  const warnings: string[] = [];

  let diffContent: string;
  try {
    const statOutput = execFileSync(
      'git',
      [
        'log',
        '--no-walk',
        '--pretty=format:%h %an: %s',
        '--stat',
        ...unattributed,
        '--',
        '.',
        ':!streams/claude-code-session/'
      ],
      {
        cwd: actionInput.cardRepoPath,
        encoding: 'utf-8',
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe']
      }
    ).trim();
    diffContent = stripDiffstatSummaries(statOutput);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to generate stat', { repoPath: actionInput.cardRepoPath, error: message });
    diffContent = [
      `(Could not generate log --stat for ${unattributed.length} commit(s))`,
      '',
      `Error: ${message}`,
      '',
      'To view manually:',
      `  git -C ${actionInput.cardRepoPath} log --stat ${unattributed.join(' ')} -- . ':!streams/claude-code-session/'`
    ].join('\n');
    warnings.push(`Stat generation failed: ${message}`);
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

  const commitSummary = `${unattributed.length} unattributed commit${unattributed.length > 1 ? 's' : ''}`;
  const warningBlock = warnings.length > 0 ? `\n\nWarnings:\n${warnings.map((w) => `- ${w}`).join('\n')}` : '';

  return stopOutput({
    decision: 'block',
    reason: `External changes detected in card repo (${commitSummary}):\n\n${diffContent}${warningBlock}`
  });
});
