/**
 * OpenCode plugin entry: exit-when-done nudge (notify-only).
 *
 * On `event`/`session.idle` for a root card session launched with
 * `EXIT_WHEN_DONE=true`, announces the shutdown runbook through the log
 * channels with a named warning: a plugin cannot terminate its host process,
 * so v1 degrades to notify-only. See the factory for behavior.
 *
 * Exports exactly one plugin factory function — OpenCode invokes every
 * exported function value in a plugin module, so nothing else may be exported.
 *
 * @summary Stop exit-when-done equivalent for OpenCode (runtime plugin)
 * @module runtime/stop-exit-when-done
 */

import type { Plugin } from '@opencode-ai/plugin';
import { createStopExitWhenDonePlugin } from '../internal/runtime-handlers.js';

/** Exit-when-done nudge plugin bound to the real dependency wiring. */
export const CardsStopExitWhenDone: Plugin = createStopExitWhenDonePlugin();
