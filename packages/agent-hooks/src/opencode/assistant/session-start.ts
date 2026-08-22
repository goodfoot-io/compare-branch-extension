/**
 * OpenCode plugin entry: assistant capability menu.
 *
 * Announces the assistant's capabilities once per root session through the
 * system transform — the closest analog of the Codex assistant's one-time
 * SessionStart announcement. See the factory for behavior.
 *
 * Exports exactly one plugin factory function — OpenCode invokes every
 * exported function value in a plugin module, so nothing else may be exported.
 *
 * @summary SessionStart equivalent for the Cards Assistant on OpenCode
 * @module assistant/session-start
 */

import type { Plugin } from '@opencode-ai/plugin';
import { createAssistantSessionStartPlugin } from '../internal/assistant-handlers.js';

/** Assistant announcement plugin bound to the real dependency wiring. */
export const CardsAssistantSessionStart: Plugin = createAssistantSessionStartPlugin();
