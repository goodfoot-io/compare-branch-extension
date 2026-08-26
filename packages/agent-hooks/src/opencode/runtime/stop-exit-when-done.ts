/**
 * OpenCode plugin entry: exit-when-done nudge.
 *
 * On `event`/`session.idle` for a root card session launched with
 * `EXIT_WHEN_DONE=true`, announces the shutdown protocol through the log
 * channels: the plugin only instructs the model to run `cards "$CARD_ID"
 * shutdown` — the action handler, parent of this process, performs the
 * graceful termination. See the factory for behavior.
 *
 * Default-exports OpenCode's detected `{ id, server }` module shape.
 *
 * @summary Stop exit-when-done equivalent for OpenCode (runtime plugin)
 * @module runtime/stop-exit-when-done
 */

import type { Plugin } from '@opencode-ai/plugin';
import { defineOpencodePluginModule } from '../internal/plugin-module.js';
import {
  createInertRuntimePlugin,
  createStopExitWhenDonePlugin,
  isCardsActionSession
} from '../internal/runtime-handlers.js';

/** Exit-when-done nudge plugin bound to the real dependency wiring. */
// Inert outside Cards-action sessions: without `CARD_ID` the lifecycle hooks
// would only idle; exporting no hooks keeps accidental registrations silent.
export const CardsStopExitWhenDone: Plugin = isCardsActionSession()
  ? createStopExitWhenDonePlugin()
  : createInertRuntimePlugin();

export default defineOpencodePluginModule('cards-stop-exit-when-done', CardsStopExitWhenDone);
