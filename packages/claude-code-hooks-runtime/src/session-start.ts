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
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { registerSessionPid } from '@cards/git-hooks/lib/card-repo-sessions';
import { findClaudePid } from '@cards/git-hooks/lib/process-tree';
import type { ActionInput } from '@cards/sdk/config';
import { extractActionInput } from '@cards/sdk/config';
import { sessionStartHook, sessionStartOutput } from '@goodfoot/claude-code-hooks';

/**
 * Error thrown when the card repository cannot be read.
 *
 * Wraps the underlying filesystem error with the repository path for
 * structured error handling in the session-start hook.
 */
export class CardRepoAccessError extends Error {
  override readonly name = 'CardRepoAccessError';

  constructor(
    public readonly repoPath: string,
    cause: unknown
  ) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Cannot read card repository at ${repoPath}: ${reason}`);
    this.cause = cause;
  }
}

/**
 * Error thrown when PID-to-session registration fails.
 *
 * Wraps the underlying error with the PID and session ID for
 * structured error handling in the session-start hook.
 */
export class SessionRegistrationError extends Error {
  override readonly name = 'SessionRegistrationError';

  constructor(
    public readonly pid: number,
    public readonly sessionId: string,
    cause: unknown
  ) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to register PID ${pid} for session ${sessionId}: ${reason}`);
    this.cause = cause;
  }
}

/**
 * Resolves the git HEAD sha for a repository path.
 *
 * Returns `null` when the path is not a git repository or git is
 * unavailable. Intentionally fails open so hook failures do not block
 * Claude.
 *
 * @param repoPath - Repository directory where `git rev-parse HEAD` should run.
 * @returns Current `HEAD` SHA, or `null` when unavailable.
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

/**
 * Builds a directory listing of `rootPath` with `.meta.json` files replaced
 * by their contents wrapped in fenced JSON blocks.
 *
 * Each non-meta entry is a relative path (from `rootPath`). Meta-JSON files
 * are rendered as `path/to/file.meta.json:\n\`\`\`json\n<content>\n\`\`\``.
 *
 * @throws {CardRepoAccessError} When the directory cannot be read.
 */
export function buildCardRepoListing(cardId: string, rootPath: string): string {
  const lines: string[] = [`The card \`${cardId}\` repository at ${rootPath} contains the following files:`];

  function walk(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Include the directory itself in the listing
        lines.push(relative(rootPath, fullPath) + '/');
        walk(fullPath);
      } else {
        const relPath = relative(rootPath, fullPath);
        if (entry.name.endsWith('.meta.json')) {
          const content = readFileSync(fullPath, 'utf-8');
          lines.push(`${relPath}:\n\`\`\`${relPath}\n${content}\n\`\`\``);
        } else {
          lines.push(relPath);
        }
      }
    }
  }

  try {
    walk(rootPath);
  } catch (error) {
    throw new CardRepoAccessError(rootPath, error);
  }

  return lines.join('\n');
}

export default sessionStartHook({}, async (input, { logger, persistEnvVar }) => {
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

  // Register PID→sessionId for commit attribution
  const claudePid = findClaudePid();
  if (claudePid) {
    try {
      await registerSessionPid(claudePid, input.session_id);
      persistEnvVar('SESSION_CLAUDE_PID', String(claudePid));
      logger.info('Registered PID for commit attribution', { pid: claudePid, sessionId: input.session_id });
    } catch (cause) {
      const error = new SessionRegistrationError(claudePid, input.session_id, cause);
      logger.error('Session registration failed', { pid: error.pid, sessionId: error.sessionId, error: error.message });
      return sessionStartOutput({
        continue: false,
        systemMessage: [
          `Session registration failed for PID ${error.pid} (session ${error.sessionId}).`,
          '',
          `Error: ${error.message}`,
          '',
          'Commit attribution requires a valid PID-to-session mapping. To resolve:',
          '1. Verify the session registry is accessible and not locked by another process',
          '2. Ensure sufficient disk space for the session registry file',
          '3. Check that the Claude process (PID ' + String(error.pid) + ') is still running'
        ].join('\n'),
        stopReason: `Session registration failed: ${error.message}`
      });
    }
  } else {
    logger.warn('Could not find Claude PID for commit attribution');
  }

  logger.info('Action subprocess confirmed', {
    cardId: actionInput.cardId,
    actionName: actionInput.actionName,
    environment: actionInput.environment,
    executionMode: actionInput.executionMode
  });

  let cardRepoListing: string;
  try {
    cardRepoListing = buildCardRepoListing(actionInput.cardId, actionInput.cardRepoPath);
  } catch (error) {
    if (error instanceof CardRepoAccessError) {
      logger.error('Card repo inaccessible', { repoPath: error.repoPath, error: error.message });
      return sessionStartOutput({
        continue: false,
        systemMessage: [
          `The card repository at '${error.repoPath}' is not accessible.`,
          '',
          `Error: ${error.message}`,
          '',
          'This session cannot proceed without a valid card repository. To resolve:',
          `1. Verify the card repository directory exists at: ${error.repoPath}`,
          '2. Ensure the current process has read permissions for the directory and its contents',
          '3. Check that the CARD_REPO_PATH environment variable points to a valid card repository'
        ].join('\n'),
        stopReason: `Card repository inaccessible at ${error.repoPath}: ${error.message}`
      });
    }
    throw error;
  }

  return sessionStartOutput({
    systemMessage: cardRepoListing,
    hookSpecificOutput: {
      additionalContext: cardRepoListing
    }
  });
});
