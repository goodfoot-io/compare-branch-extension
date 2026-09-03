/**
 * Notification hook (`notification_type: "idle_prompt"`) — Claude shutdown
 * drain readiness acknowledgement for sessions that have never completed a
 * turn.
 *
 * `stop-shutdown-drain.ts` only fires on the `Stop` event, which requires an
 * assistant turn to have completed at least once. An interactive Chat session
 * that is sitting idle at the prompt before its first human message can never
 * emit a `Stop` event, so it could never acknowledge a `cards shutdown`
 * request — even though it is genuinely idle. The CLI's `idle_prompt`
 * notification (see `notification-idle-nudge.ts`) fires whenever the CLI's
 * internal loading/queued-work state is clear, including before any turn has
 * completed, so this hook attempts the identical drain from that event
 * instead, closing the gap.
 *
 * Notification hooks acknowledge via `additionalContext`, but this hook has
 * nothing to say to the model — it is a pure side-effecting drain-ack, so it
 * always returns `null`, matching `stop-shutdown-drain.ts`.
 *
 * @summary Notification(idle_prompt) hook — Claude shutdown drain readiness acknowledgement
 * @see https://code.claude.com/docs/en/hooks#notification
 */

import { extractActionInput } from '@cards.management/sdk/config';
import { notificationHook } from '@goodfoot/agent-hooks/claude-code';
import { attemptShutdownDrain } from '../../shared/shutdown-drain.js';

export default notificationHook({ matcher: 'idle_prompt' }, async (input, { logger }) => {
  try {
    extractActionInput();
  } catch (error) {
    logger.warn('notification-shutdown-drain: not inside an action subprocess', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }

  await attemptShutdownDrain(input.session_id, logger, 'notification-shutdown-drain');

  return null;
});
