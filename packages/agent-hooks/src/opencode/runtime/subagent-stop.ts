/**
 * OpenCode plugin entry: subagent (child session) stop tracking.
 *
 * Removes idle child sessions from the parent's active-subagent file so the
 * session reaches a genuine idle state, best-effort. See the factory for
 * behavior.
 *
 * Default-exports OpenCode's detected `{ id, server }` module shape.
 *
 * @summary SubagentStop equivalent for OpenCode (runtime plugin)
 * @module runtime/subagent-stop
 */

import type { Plugin } from '@opencode-ai/plugin';
import { defineOpencodePluginModule } from '../internal/plugin-module.js';
import {
  createInertRuntimePlugin,
  createSubagentStopPlugin,
  isCardsActionSession
} from '../internal/runtime-handlers.js';

/** Subagent-stop tracking plugin bound to the real dependency wiring. */
// Inert outside Cards-action sessions: without `CARD_ID` the lifecycle hooks
// would only idle; exporting no hooks keeps accidental registrations silent.
export const CardsSubagentStop: Plugin = isCardsActionSession()
  ? createSubagentStopPlugin()
  : createInertRuntimePlugin();

export default defineOpencodePluginModule('cards-subagent-stop', CardsSubagentStop);
