/**
 * SessionStart hook implementation.
 *
 * Runs as a subprocess of an action. Uses {@link extractActionInput} to
 * confirm we are inside an action subprocess and to expose the action
 * process environment variables to the session context.
 *
 *
 * @summary SessionStart hook implementation
 * @see https://code.claude.com/docs/en/hooks#sessionstart
 */

import { execFileSync, spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findClaudePid, registerSession } from '@cards/claude-code-sessions';
import { writeSessionHeadSha } from '@cards/claude-code-sessions/card-repo';
import type { ActionInput } from '@cards/sdk/config';
import { CARDS_ENV_VARS, extractActionInput } from '@cards/sdk/config';
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
    return execFileSync('git', ['rev-parse', 'HEAD'], {
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
 * @param cardId - Card identifier used in the listing header message.
 * @param rootPath - Root directory of the card repository to traverse.
 * @returns Multi-line listing string used as additional session context.
 * @throws {CardRepoAccessError} When the directory cannot be read.
 */
export function buildCardRepoListing(cardId: string, rootPath: string): string {
  const lines: string[] = [`The card \`${cardId}\` repository at ${rootPath} contains the following files:`];

  function walk(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git') continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Include the directory itself in the listing
        lines.push(`${relative(rootPath, fullPath)}/`);
        walk(fullPath);
      } else {
        const relPath = relative(rootPath, fullPath);
        if (entry.name.endsWith('.meta.json')) {
          const content = readFileSync(fullPath, 'utf-8');
          lines.push(`${relPath}:\n\`\`\`json\n${content}\n\`\`\``);
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

/**
 * Builds a prose paragraph describing the runtime context for this session.
 *
 * Surfaces env vars that are not stored in CARD.meta.json so skills and
 * subagents can access them without placeholder passthrough.
 *
 * @param actionInput - Parsed action input from the environment.
 * @returns A natural-language paragraph describing the session context.
 */
export function buildRuntimeContext(actionInput: ActionInput): string {
  const workspaceBranch = process.env[CARDS_ENV_VARS.WORKSPACE_BRANCH];
  const baseBranch = process.env[CARDS_ENV_VARS.BASE_BRANCH];

  let sentence = `This session is running the ${actionInput.actionName} action in ${actionInput.executionMode} mode`;

  if (workspaceBranch) {
    sentence += ` on branch \`${workspaceBranch}\``;
    if (baseBranch) {
      sentence += `, merging into \`${baseBranch}\``;
    }
  }

  sentence += `.`;

  return `${sentence} The card repository is at ${actionInput.cardRepoPath}.`;
}

/**
 * Spawns a detached transcript watcher process for crash-resilient transcript upload.
 *
 * The watcher monitors the Claude PID and uploads the transcript if the process
 * exits without the session-end hook having run (crash/SIGKILL).
 *
 * @param pid - Claude process ID to monitor.
 * @param sessionId - Session identifier for the transcript.
 * @param transcriptPath - Path to the transcript file.
 * @param cardId - Card identifier for the upload target.
 * @param cardRepoPath - Path to the card repository.
 */
export function spawnTranscriptWatcher(
  pid: number,
  sessionId: string,
  transcriptPath: string,
  cardId: string,
  cardRepoPath: string
): void {
  const watcherPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../bin/transcript-watcher.mjs');

  // Resolve node executable: prefer VSCODE_NODE env var, fallback to file, then 'node'
  let nodeBin: string;
  try {
    nodeBin = process.env['VSCODE_NODE'] ?? readFileSync(join(homedir(), '.cards', 'VSCODE_NODE'), 'utf-8').trim();
  } catch {
    nodeBin = 'node';
  }

  const child = spawn(nodeBin, [watcherPath, String(pid), sessionId, transcriptPath, cardId, cardRepoPath], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
}

/**
 * Registers the Claude PID for commit attribution and spawns the transcript watcher.
 *
 * Returns a failure output if PID registration fails (blocking), or `null` on
 * success. Watcher spawn failure is non-fatal and only logged.
 *
 * @param claudePid - Claude process ID to register and monitor.
 * @param sessionId - Session identifier for the registration.
 * @param transcriptPath - Path to the transcript file for the watcher.
 * @param actionInput - Parsed action input containing card context.
 * @param logger - Logger for structured output.
 * @returns A session-start failure output on registration error, or `null` on success.
 */
async function registerPidAndSpawnWatcher(
  claudePid: number,
  sessionId: string,
  transcriptPath: string,
  actionInput: ActionInput,
  logger: Parameters<Parameters<typeof sessionStartHook>[1]>[1]['logger']
): Promise<ReturnType<typeof sessionStartOutput> | null> {
  try {
    await registerSession(claudePid, sessionId);
    logger.info('Registered PID for commit attribution', { pid: claudePid, sessionId });
  } catch (cause) {
    const error = new SessionRegistrationError(claudePid, sessionId, cause);
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
        `3. Check that the Claude process (PID ${String(error.pid)}) is still running`
      ].join('\n'),
      stopReason: `Session registration failed: ${error.message}`
    });
  }

  try {
    spawnTranscriptWatcher(claudePid, sessionId, transcriptPath, actionInput.cardId, actionInput.cardRepoPath);
    logger.info('Spawned transcript watcher', { pid: claudePid, sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Transcript watcher spawn failed', { error: message });
  }

  return null;
}

export default sessionStartHook({}, async (input, { logger }) => {
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
    writeSessionHeadSha(input.session_id, headSha);
    logger.info('Stored git HEAD sha', { headSha, repoPath: actionInput.cardRepoPath });
  } else {
    logger.warn('Could not resolve git HEAD sha', { repoPath: actionInput.cardRepoPath });
  }

  const claudePid = findClaudePid();
  if (claudePid) {
    const failure = await registerPidAndSpawnWatcher(
      claudePid,
      input.session_id,
      input.transcript_path,
      actionInput,
      logger
    );
    if (failure) return failure;
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

  const runtimeContext = buildRuntimeContext(actionInput);
  const systemMessage = `${runtimeContext}\n\n${cardRepoListing}`;

  return sessionStartOutput({
    systemMessage,
    hookSpecificOutput: {
      additionalContext: systemMessage
    }
  });
});
