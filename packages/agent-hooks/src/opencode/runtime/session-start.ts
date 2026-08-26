/**
 * OpenCode plugin entry: runtime session start, identity, context, streaming.
 *
 * Registers root card sessions from `event`/`session.created`, materializes
 * the NDJSON transcript, spawns the stream-sync-watcher via the CONTRACT-B
 * manifest adapter, injects card context every turn through the system
 * transform, and persists `CARDS_SESSION_ID` / `OPENCODE_RUN_ID` /
 * `CARDS_TRANSCRIPT_PATH` through the stateless `shell.env`. See the factory
 * for behavior.
 *
 * Default-exports OpenCode's detected `{ id, server }` module shape.
 *
 * @summary SessionStart equivalent for OpenCode (runtime plugin)
 * @module runtime/session-start
 */

import type { Plugin } from '@opencode-ai/plugin';
import { defineOpencodePluginModule } from '../internal/plugin-module.js';
import {
  createInertRuntimePlugin,
  createSessionStartPlugin,
  isCardsActionSession
} from '../internal/runtime-handlers.js';

/** Runtime session-start plugin bound to the real dependency wiring. */
// Inert outside Cards-action sessions: without `CARD_ID` the lifecycle hooks
// would only idle; exporting no hooks keeps accidental registrations silent.
export const CardsRuntimeSessionStart: Plugin = isCardsActionSession()
  ? createSessionStartPlugin()
  : createInertRuntimePlugin();

export default defineOpencodePluginModule('cards-runtime-session-start', CardsRuntimeSessionStart);
