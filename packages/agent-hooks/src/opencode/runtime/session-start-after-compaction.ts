/**
 * OpenCode plugin entry: routing reminder after compaction.
 *
 * Pushes the `<routing-instructions>` reminder into the compaction context for
 * root card sessions. See the factory for behavior.
 *
 * Exports exactly one plugin factory function — OpenCode invokes every
 * exported function value in a plugin module, so nothing else may be exported.
 *
 * @summary SessionStart(compact) equivalent for OpenCode (runtime plugin)
 * @module runtime/session-start-after-compaction
 */

import type { Plugin } from '@opencode-ai/plugin';
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
