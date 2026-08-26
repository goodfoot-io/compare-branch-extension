/**
 * OpenCode plugin entry: routing reminder after compaction.
 *
 * Pushes the `<routing-instructions>` reminder into the compaction context for
 * root card sessions. See the factory for behavior.
 *
 * Default-exports OpenCode's detected `{ id, server }` module shape.
 *
 * @summary SessionStart(compact) equivalent for OpenCode (runtime plugin)
 * @module runtime/session-start-after-compaction
 */

import type { Plugin } from '@opencode-ai/plugin';
import { defineOpencodePluginModule } from '../internal/plugin-module.js';
import {
  createInertRuntimePlugin,
  createSessionStartAfterCompactionPlugin,
  isCardsActionSession
} from '../internal/runtime-handlers.js';

/** Post-compaction reminder plugin bound to the real dependency wiring. */
// Inert outside Cards-action sessions: without `CARD_ID` the lifecycle hooks
// would only idle; exporting no hooks keeps accidental registrations silent.
export const CardsSessionStartAfterCompaction: Plugin = isCardsActionSession()
  ? createSessionStartAfterCompactionPlugin()
  : createInertRuntimePlugin();

export default defineOpencodePluginModule('cards-session-start-after-compaction', CardsSessionStartAfterCompaction);
