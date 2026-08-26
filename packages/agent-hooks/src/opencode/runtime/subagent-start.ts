/**
 * OpenCode plugin entry: subagent (child session) start tracking.
 *
 * Adds child sessions of tracked root sessions to the active-subagent file,
 * best-effort. See the factory for behavior.
 *
 * Default-exports OpenCode's detected `{ id, server }` module shape.
 *
 * @summary SubagentStart equivalent for OpenCode (runtime plugin)
 * @module runtime/subagent-start
 */

import type { Plugin } from '@opencode-ai/plugin';
import { defineOpencodePluginModule } from '../internal/plugin-module.js';
import {
  createInertRuntimePlugin,
  createSubagentStartPlugin,
  isCardsActionSession
} from '../internal/runtime-handlers.js';

/** Subagent-start tracking plugin bound to the real dependency wiring. */
// Inert outside Cards-action sessions: without `CARD_ID` the lifecycle hooks
// would only idle; exporting no hooks keeps accidental registrations silent.
export const CardsSubagentStart: Plugin = isCardsActionSession()
  ? createSubagentStartPlugin()
  : createInertRuntimePlugin();

export default defineOpencodePluginModule('cards-subagent-start', CardsSubagentStart);
