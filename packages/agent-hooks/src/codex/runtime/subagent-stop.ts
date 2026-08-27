/**
 * SubagentStop hook implementation.
 *
 * Removes the completed subagent from the session's active-subagent tracking
 * file. (Subagent transcript sync to the Cards API is handled by the Phase 3
 * transcript-sync engine via manifest globs, not by this hook.)
 *
 * @summary SubagentStop hook — clears active-subagent tracking
 */

import { rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { removeActiveSubagent } from '@cards.management/sessions/card-repo';
import { subagentStopHook } from '@goodfoot/agent-hooks/codex';

export default subagentStopHook({}, async (input, { logger }) => {
  try {
    await removeActiveSubagent(input.session_id, input.agent_id);
  } catch (error) {
    logger.warn('Failed to remove active subagent', {
      sessionId: input.session_id,
      agentId: input.agent_id,
      error: error instanceof Error ? error.message : String(error)
    });

    // Recovery: if the structured remove failed, unlink the whole file to
    // prevent a permanent stale entry that blocks the session from reaching
    // idle. Future subagents will re-create the file atomically.
    const subagentsPath = join(homedir(), '.cards', 'card-repo-commits', `${input.session_id}.subagents`);
    try {
      rmSync(subagentsPath, { force: true });
    } catch (recoveryError) {
      logger.warn('Recovery unlink of subagents file also failed — session may be stuck', {
        sessionId: input.session_id,
        path: subagentsPath,
        error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
      });
    }
  }

  return undefined;
});
