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
 */

import { execFileSync } from 'node:child_process';
import { getCommitsSince } from '@cards/sdk/card-repo';
import { BOOKKEEPING_PATHSPEC_EXCLUSIONS, getUnattributedCommits } from '@cards/sdk/client';
import type { ActionInput } from '@cards/sdk/config';
import { extractActionInput } from '@cards/sdk/config';
import { appendCommitToSession, getSessionCommits, readSessionHeadSha } from '@cards/sessions/card-repo';
import { stopHook, stopOutput } from '@goodfoot/codex-hooks';
import { CommitLogError, CommitRecordError } from './lib/errors.js';
import { formatCommitLog } from './lib/file-tree.js';

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
    return undefined;
  }

  const headSha = readSessionHeadSha(input.session_id);
  if (!headSha) {
    logger.info('No HEAD SHA on file — skipping commit attribution check');
    return undefined;
  }

  const sessionId = input.session_id;

  // Get all commits since session start
  let allCommits: string[];
  try {
    allCommits = getCommitsSince(actionInput.cardRepoPath, headSha);
  } catch (cause) {
    const error = new CommitLogError(actionInput.cardRepoPath, headSha, cause);
    logger.error('Failed to list commits', { repoPath: error.repoPath, error: error.message });
    return undefined;
  }

  if (allCommits.length === 0) {
    return undefined;
  }

  // Get session's attributed commits
  let sessionCommits: string[];
  try {
    sessionCommits = getSessionCommits(sessionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to read session commits', { error: message });
    return undefined;
  }

  const unattributed = getUnattributedCommits(allCommits, sessionCommits);

  if (unattributed.length === 0) {
    return undefined;
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
        '--pretty=format:%h - %an: %s',
        '--name-only',
        ...unattributed,
        '--',
        '.',
        ...BOOKKEEPING_PATHSPEC_EXCLUSIONS
      ],
      {
        cwd: actionInput.cardRepoPath,
        encoding: 'utf-8',
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe']
      }
    ).trim();
    diffContent = formatCommitLog(statOutput, 'blank-line');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to generate file list', { repoPath: actionInput.cardRepoPath, error: message });
    diffContent = [
      `(Could not generate log --name-only for ${unattributed.length} commit(s))`,
      '',
      `Error: ${message}`,
      '',
      'To view manually:',
      `  git -C ${actionInput.cardRepoPath} log --name-only ${unattributed.join(' ')} -- . ${BOOKKEEPING_PATHSPEC_EXCLUSIONS.map((p) => `'${p}'`).join(' ')}`
    ].join('\n');
    warnings.push(`File list generation failed: ${message}`);
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
