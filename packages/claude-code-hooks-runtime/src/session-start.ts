/**
 * SessionStart hook implementation.
 *
 * Runs as a subprocess of an action. Uses {@link extractActionInput} to
 * confirm we are inside an action subprocess and to expose the action
 * process environment variables to the session context.
 *
 * @see https://code.claude.com/docs/en/hooks#sessionstart
 */

import { execSync } from 'node:child_process';
import type { ActionInput } from '@cards/sdk/config';
import { extractActionInput } from '@cards/sdk/config';
import { sessionStartHook, sessionStartOutput } from '@goodfoot/claude-code-hooks';

/**
 * Resolves the git HEAD sha for a repository path.
 *
 * Returns `null` when the path is not a git repository or git is
 * unavailable. Intentionally fails open so hook failures do not block
 * Claude.
 */
export function resolveHeadSha(repoPath: string): string | null {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: repoPath,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch {
    return null;
  }
}

export default sessionStartHook({}, (_input, { logger, persistEnvVar }) => {
  let actionInput: ActionInput;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Not running inside an action subprocess', { error: message });
    return sessionStartOutput({
      systemMessage: 'SessionStart hook: not running inside an action subprocess.'
    });
  }

  const headSha = resolveHeadSha(actionInput.cardRepoPath);
  if (headSha) {
    persistEnvVar('SESSION_GIT_HEAD_SHA', headSha);
    logger.info('Stored git HEAD sha', { headSha, repoPath: actionInput.cardRepoPath });
  } else {
    logger.warn('Could not resolve git HEAD sha', { repoPath: actionInput.cardRepoPath });
  }

  logger.info('Action subprocess confirmed', {
    cardId: actionInput.cardId,
    actionName: actionInput.actionName,
    environment: actionInput.environment,
    executionMode: actionInput.executionMode
  });

  return sessionStartOutput({
    systemMessage: [
      `Action: ${actionInput.actionName}`,
      `Card: ${actionInput.cardId}`,
      `Environment: ${actionInput.environment}`,
      `Mode: ${actionInput.executionMode}`,
      ...(headSha ? [`HEAD: ${headSha}`] : [])
    ].join(' | '),
    hookSpecificOutput: {
      additionalContext: JSON.stringify(actionInput)
    }
  });
});
