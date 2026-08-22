/**
 * OpenCode plugin entry: subagent (child session) start tracking.
 *
 * Adds child sessions of tracked root sessions to the active-subagent file,
 * best-effort. See the factory for behavior.
 *
 * Exports exactly one plugin factory function — OpenCode invokes every
 * exported function value in a plugin module, so nothing else may be exported.
 *
 * @summary SubagentStart equivalent for OpenCode (runtime plugin)
 * @module runtime/subagent-start
 */

import type { Plugin } from '@opencode-ai/plugin';
import { createSubagentStartPlugin } from '../internal/runtime-handlers.js';

/** Subagent-start tracking plugin bound to the real dependency wiring. */
export const CardsSubagentStart: Plugin = createSubagentStartPlugin();
