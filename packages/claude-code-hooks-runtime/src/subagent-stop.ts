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
import { join } from 'node:path';
import { extractActionInput } from '@cards/sdk/config';
import { subagentStopHook, subagentStopOutput } from '@goodfoot/claude-code-hooks';

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
  const dir = join(cardRepoPath, 'streams', 'claude-code-session');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${sessionId}-${agentId}.flush`), '');
}

export default subagentStopHook({}, async (input, { logger }) => {
  // 1. Extract action input — fail open if not in action subprocess
  let actionInput: ReturnType<typeof extractActionInput>;
  try {
    actionInput = extractActionInput();
  } catch {
    return subagentStopOutput({ decision: 'approve' });
  }

  // 2. Write sentinel file to signal the subagent transcript watcher (wrapped in try/catch — non-fatal)
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
