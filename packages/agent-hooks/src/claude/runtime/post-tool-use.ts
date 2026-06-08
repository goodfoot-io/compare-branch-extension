/**
 * PostToolUse hook implementation.
 *
 * Runs as a subprocess of an action after every tool use. Uses
 * {@link extractActionInput} to confirm we are inside an action subprocess
 * and to expose the action process environment variables.
 *
 * After confirming the action context, the hook checks for unattributed
 * commits in the card repo since the session started. Uses a two-phase
 * detection: file-read fast path when HEAD is unchanged, git subprocess
 * slow path when HEAD has advanced.
 *
 * Unattributed commits are surfaced as `additionalContext` so Claude sees
 * external changes immediately rather than at stop time. The stop hook
 * continues to function as a backstop.
 *
 * @summary PostToolUse hook for surfacing unattributed card-repo commits
 * @see https://code.claude.com/docs/en/hooks#posttooluse
 */

import { execFileSync } from 'node:child_process';
import { getCommitsSince } from '@cards/sdk/card-repo';
import { BOOKKEEPING_PATHSPEC_EXCLUSIONS, getUnattributedCommits } from '@cards/sdk/client';
import type { ActionInput } from '@cards/sdk/config';
import { extractActionInput } from '@cards/sdk/config';
import { appendCommitToSession, getSessionCommits, readSessionHeadSha } from '@cards/sessions/card-repo';
import { postToolUseHook, postToolUseOutput } from '@goodfoot/claude-code-hooks';
import { CommitLogError, CommitRecordError } from '../../shared/errors.js';
import { formatCommitLog } from '../../shared/file-tree.js';
import { resolveHeadFromFiles } from '../../shared/resolve-head.js';

/**
 * Records unattributed commits so they are not re-flagged on subsequent tool uses or stop.
 *
 * Unlike the stop hook, recording failures are collected as warnings rather
 * than thrown — surfacing the commits is more important than recording them.
 *
 * @param sessionId - Session ID whose commit CSV should be updated.
 * @param shas - Unattributed commit SHAs to persist.
 * @returns Array of warning messages for any SHAs that failed to record.
 */
async function recordUnattributedCommits(sessionId: string, shas: string[]): Promise<string[]> {
  const warnings: string[] = [];
  for (const sha of shas) {
    try {
      await appendCommitToSession(sessionId, sha);
    } catch (cause) {
      const error = new CommitRecordError(sessionId, sha, cause);
      warnings.push(
        `Commit recording failed for ${error.sha}: ${error.message}. ` +
          'The next tool use or stop may re-flag this commit as unattributed. ' +
          'Verify the session CSV is writable.'
      );
    }
  }
  return warnings;
}

export default postToolUseHook({}, async (input, { logger }) => {
  // Step 1: Action guard
  let actionInput: ActionInput;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Not running inside an action subprocess', { error: message });
    return null;
  }

  // Step 2: Baseline SHA
  let headSha: string | null;
  try {
    headSha = readSessionHeadSha(input.session_id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to read session HEAD SHA', { error: message });
    return postToolUseOutput({
      hookSpecificOutput: {
        additionalContext: [
          `Could not read session HEAD SHA for session ${input.session_id}.`,
          '',
          `Error: ${message}`,
          '',
          'Commit attribution could not be verified. To investigate:',
          '1. Check that the session .head file exists and is readable',
          `2. Verify file permissions for session ${input.session_id}`
        ].join('\n')
      }
    });
  }
  if (!headSha) {
    return null;
  }

  const sessionId = input.session_id;

  // Step 3: Current HEAD (file read)
  const currentHead = resolveHeadFromFiles(actionInput.cardRepoPath);
  if (currentHead === null) {
    return postToolUseOutput({
      hookSpecificOutput: {
        additionalContext: [
          `Could not resolve HEAD in '${actionInput.cardRepoPath}'.`,
          '',
          'Commit attribution cannot be verified. To investigate:',
          `1. Verify the card repository is a valid git repo at: ${actionInput.cardRepoPath}`,
          '2. Check that .git/HEAD exists and is readable'
        ].join('\n')
      }
    });
  }

  // Step 4: Fast-path exit
  if (currentHead === headSha) {
    return null;
  }

  // Step 5: Session CSV
  let sessionCommits: string[];
  try {
    sessionCommits = getSessionCommits(sessionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to read session commits', { error: message });
    return postToolUseOutput({
      hookSpecificOutput: {
        additionalContext: [
          `Could not read session commit records for session ${sessionId}.`,
          '',
          `Error: ${message}`,
          '',
          'Commit attribution could not be verified. To investigate:',
          '1. Check that the session CSV file exists and is readable',
          `2. Verify file permissions for session ${sessionId}`
        ].join('\n')
      }
    });
  }

  // Step 6: Enumerate all commits since baseline
  let allCommits: string[];
  try {
    allCommits = getCommitsSince(actionInput.cardRepoPath, headSha);
  } catch (cause) {
    const error = new CommitLogError(actionInput.cardRepoPath, headSha, cause);
    logger.error('Failed to list commits', { repoPath: error.repoPath, error: error.message });
    return postToolUseOutput({
      hookSpecificOutput: {
        additionalContext: [
          `Could not list commits since session start in '${error.repoPath}'.`,
          '',
          `Error: ${error.message}`,
          '',
          'Commit attribution could not be verified. To investigate:',
          `1. Verify the card repository is a valid git repo at: ${error.repoPath}`,
          '2. Check that git is available and the repository is not corrupted',
          `3. Confirm the baseline SHA (${error.sinceSha}) exists in the repository`
        ].join('\n')
      }
    });
  }

  // Step 7: Diff against session CSV
  const unattributed = getUnattributedCommits(allCommits, sessionCommits);
  if (unattributed.length === 0) {
    return null;
  }

  // Step 8: Format
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

  // Step 9: Record
  const recordWarnings = await recordUnattributedCommits(sessionId, unattributed);
  warnings.push(...recordWarnings);

  // Step 10: Return
  const commitSummary = `${unattributed.length} unattributed commit${unattributed.length > 1 ? 's' : ''}`;
  const warningBlock = warnings.length > 0 ? `\n\nWarnings:\n${warnings.map((w) => `- ${w}`).join('\n')}` : '';

  return postToolUseOutput({
    hookSpecificOutput: {
      additionalContext: `External changes detected in card repo (${commitSummary}):\n\n${diffContent}${warningBlock}`
    }
  });
});
