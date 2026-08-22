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
 * Exports exactly one plugin factory function — OpenCode invokes every
 * exported function value in a plugin module, so nothing else may be exported.
 *
 * @summary SessionStart equivalent for OpenCode (runtime plugin)
 * @module runtime/session-start
 */

import type { Plugin } from '@opencode-ai/plugin';
import { createSessionStartPlugin } from '../internal/runtime-handlers.js';

/** Runtime session-start plugin bound to the real dependency wiring. */
export const CardsRuntimeSessionStart: Plugin = createSessionStartPlugin();
