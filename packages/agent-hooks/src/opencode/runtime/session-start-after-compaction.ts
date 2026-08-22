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
import { createSessionStartAfterCompactionPlugin } from '../internal/runtime-handlers.js';

/** Post-compaction reminder plugin bound to the real dependency wiring. */
export const CardsSessionStartAfterCompaction: Plugin = createSessionStartAfterCompactionPlugin();
