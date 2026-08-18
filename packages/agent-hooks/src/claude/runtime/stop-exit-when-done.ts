/**
 * Stop hook — exit-when-done nudge when the action was launched with EXIT_WHEN_DONE=true.
 *
 * Fires at most once per session. Returns `decision: 'block'` with a `reason`
 * pointing the agent at the installed `shutdown.md` (resolved relative to this
 * compiled hook's own location — see {@link resolveShutdownRunbookPath}) when
 * `actionInput.exitWhenDone` is `true`.
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

import { fileURLToPath } from 'node:url';
import { extractActionInput } from '@cards.management/sdk/config';
import {
  hasSessionExitWhenDoneNudgeFired,
  markSessionExitWhenDoneNudgeFired
} from '@cards.management/sessions/card-repo';
import { stopHook, stopOutput } from '@goodfoot/claude-code-hooks';
import { isSessionIdle } from '../../shared/session-idle.js';

// Every build target compiles this hook to `<outBase>/hooks/bin/<name>.mjs`
// (see agent-hooks/scripts/build.mjs) with skills shipped as a sibling of
// `hooks/` at `<outBase>/skills/...`. Resolving from `import.meta.url` finds
// the runbook wherever the plugin is installed; a repo-root-relative string
// (e.g. `public/claude/runtime/skills/...`) only resolves when the agent's cwd
// happens to be this monorepo's root, which is not true for an installed
// (marketplace) plugin.
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
    return null;
  }

  if (!actionInput.exitWhenDone) {
    return null;
  }

  if (!isSessionIdle(input.session_id)) {
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
      `Read \`${resolveShutdownRunbookPath()}\` (\`shutdown.md\` in \`runtime:card\`'s \`references/\`) and follow its \`<instructions>\` to exit the session cleanly.`
    ].join('\n')
  });
});
