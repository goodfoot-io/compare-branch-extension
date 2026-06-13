/**
 * Stop hook — exit-when-done nudge when the action was launched with EXIT_WHEN_DONE=true.
 *
 * Fires at most once per session. Returns `decision: 'block'` with a `reason`
 * pointing the agent at `public/claude/runtime/skills/card/references/shutdown.md`
 * when `actionInput.exitWhenDone` is `true`.
 *
 * Fail-open: every error path returns `null`.
 *
 * Peer-hook interaction: coexists with stop.ts and stop-route-nudge.ts. The
 * @goodfoot/claude-code-hooks build coalesces same-event, matcher-less hooks into
 * a single hooks.json entry; both reasons concatenate when multiple Stop hooks
 * return `decision: 'block'` on the same Stop event.
 *
 * @summary Stop hook — exit-when-done nudge for clean session shutdown
 * @see https://code.claude.com/docs/en/hooks#stop
 */

import { extractActionInput } from '@cards/sdk/config';
import { hasSessionExitWhenDoneNudgeFired, markSessionExitWhenDoneNudgeFired } from '@cards/sessions/card-repo';
import { stopHook, stopOutput } from '@goodfoot/claude-code-hooks';

/**
 * Word stems that signal the assistant is intentionally pausing — waiting on a
 * timer, a build, an external check, or a follow-up trigger. If the last
 * assistant message contains any of these, suppress the exit-when-done nudge:
 * the agent has not declared the work finished, it has parked itself mid-task.
 * Firing the nudge here would consume the once-per-session budget on a false
 * positive and push a paused agent toward shutdown.
 */
const WAITING_STEM_RE =
  /\b(?:wait(?:ing|ed|s)?|await(?:ing|ed|s)?|poll(?:ing|ed|s)?|monitor(?:ing|ed|s)?|pending|sleep(?:ing)?|standby|stand(?:ing)?\s+by|check(?:ing)?\s+back|hold(?:ing)?\s+(?:on|off)|in\s+the\s+meantime|until\s+(?:it|the|then)|ETA)\b/i;

function isWaitingMessage(message: string | undefined): boolean {
  return typeof message === 'string' && WAITING_STEM_RE.test(message);
}

export default stopHook({}, async (input, { logger }) => {
  let actionInput: ReturnType<typeof extractActionInput>;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    logger.warn('stop-exit-when-done: not inside an action subprocess', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }

  if (!actionInput.exitWhenDone) {
    return null;
  }

  if (isWaitingMessage(input.last_assistant_message)) {
    return null;
  }

  let nudgeFired: boolean;
  try {
    nudgeFired = hasSessionExitWhenDoneNudgeFired(input.session_id);
  } catch (error) {
    logger.warn('stop-exit-when-done: failed to check exit-when-done nudge marker', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }

  if (nudgeFired) {
    return null;
  }

  try {
    markSessionExitWhenDoneNudgeFired(input.session_id);
  } catch (error) {
    logger.error('stop-exit-when-done: failed to write exit-when-done nudge marker', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }

  return stopOutput({
    decision: 'block',
    reason: [
      'This action was launched with EXIT_WHEN_DONE=true, signalling that the session should exit once work is complete.',
      '',
      'Read `public/claude/runtime/skills/card/references/shutdown.md` and follow its `<instructions>` to exit the session cleanly.'
    ].join('\n')
  });
});
