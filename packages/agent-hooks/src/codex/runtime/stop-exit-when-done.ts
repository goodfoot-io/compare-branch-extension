/**
 * Stop hook — exit-when-done nudge for a completed Codex action.
 *
 * Fires at most once per idle session launched with `EXIT_WHEN_DONE=true` and
 * directs the agent to the installed, fail-closed shutdown runbook. The hook is
 * matcher-less so the Codex hook builder composes it with the route nudge in a
 * single Stop group; each hook retains its own once-per-session marker.
 *
 * @summary Stop hook — exit-when-done nudge for clean Codex shutdown
 */

import { fileURLToPath } from 'node:url';
import { extractActionInput } from '@cards.management/sdk/config';
import {
  hasSessionExitWhenDoneNudgeFired,
  markSessionExitWhenDoneNudgeFired
} from '@cards.management/sessions/card-repo';
import { stopHook, stopOutput } from '@goodfoot/codex-hooks';
import { isSessionIdle } from '../../shared/session-idle.js';

/**
 * Resolve against the compiled hook so installed plugins never depend on cwd.
 *
 * @returns Absolute path to the installed Codex shutdown runbook.
 */
function resolveShutdownRunbookPath(): string {
  return fileURLToPath(new URL('../../skills/card/references/shutdown.md', import.meta.url));
}

export default stopHook({}, async (input, { logger }) => {
  let actionInput: ReturnType<typeof extractActionInput>;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    logger.warn('stop-exit-when-done: not inside an action subprocess', {
      error: error instanceof Error ? error.message : String(error)
    });
    return undefined;
  }

  if (!actionInput.exitWhenDone || !isSessionIdle(input.session_id)) {
    return undefined;
  }

  let nudgeFired: boolean;
  try {
    nudgeFired = hasSessionExitWhenDoneNudgeFired(input.session_id);
  } catch (error) {
    logger.warn('stop-exit-when-done: failed to check exit-when-done nudge marker', {
      error: error instanceof Error ? error.message : String(error)
    });
    return undefined;
  }

  if (nudgeFired) {
    return undefined;
  }

  try {
    markSessionExitWhenDoneNudgeFired(input.session_id);
  } catch (error) {
    logger.error('stop-exit-when-done: failed to write exit-when-done nudge marker', {
      error: error instanceof Error ? error.message : String(error)
    });
    return undefined;
  }

  return stopOutput({
    decision: 'block',
    reason: [
      'This action was launched with EXIT_WHEN_DONE=true and the session is now idle.',
      '',
      `The current Codex session id is \`${input.session_id}\`; supply it where the runbook requires \`<SESSION ID FROM THE STOP MESSAGE>\`.`,
      '',
      `Read \`${resolveShutdownRunbookPath()}\` and follow its \`<instructions>\` to terminate the validated Codex launcher cleanly.`
    ].join('\n')
  });
});
