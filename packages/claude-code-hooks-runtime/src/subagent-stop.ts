/**
 * SubagentStop hook implementation.
 *
 * Writes a sentinel file to signal the subagent's transcript watcher
 * to flush remaining lines and close the stream. Uses `{sessionId}-{agentId}`
 * as the sentinel stem to distinguish from session-level watchers.
 *
 * Approves unconditionally — sentinel write failure is non-fatal since the
 * transcript watcher provides crash resilience via PID monitoring.
 *
 * @summary SubagentStop hook — writes sentinel file for subagent transcript watcher
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { extractActionInput } from '@cards/sdk/config';
import { subagentStopHook, subagentStopOutput } from '@goodfoot/claude-code-hooks';
import { sentinelFilePath } from './bin/transcript-watcher.js';

/**
 * Writes a sentinel file to signal the subagent's transcript watcher that the
 * subagent has stopped gracefully.
 *
 * Creates parent directories if they do not exist. The file content is empty;
 * existence of the file is the signal.
 *
 * @param cardRepoPath - Absolute path to the card repository root
 * @param sessionId - Claude session ID (parent session)
 * @param agentId - The subagent's unique identifier
 */
export async function writeSentinelFile(cardRepoPath: string, sessionId: string, agentId: string): Promise<void> {
  const path = sentinelFilePath(cardRepoPath, sessionId, agentId);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, '');
}

export default subagentStopHook({}, async (input, { logger }) => {
  let actionInput: ReturnType<typeof extractActionInput>;
  try {
    actionInput = extractActionInput();
  } catch {
    return subagentStopOutput({ decision: 'approve' });
  }

  try {
    await writeSentinelFile(actionInput.cardRepoPath, input.session_id, input.agent_id);
    logger.info('Sentinel file written', {
      sessionId: input.session_id,
      agentId: input.agent_id,
      cardRepoPath: actionInput.cardRepoPath
    });
  } catch (error) {
    logger.warn('Failed to write sentinel file', {
      sessionId: input.session_id,
      agentId: input.agent_id,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return subagentStopOutput({ decision: 'approve' });
});
