/**
 * OpenCode plugin entry: assistant capability menu.
 *
 * Announces the assistant's capabilities once per root session through the
 * system transform — the closest analog of the Codex assistant's one-time
 * SessionStart announcement. See the factory for behavior.
 *
 * Default-exports OpenCode's detected `{ id, server }` module shape. The named
 * factory remains available to focused tests without forcing the host through
 * its fragile legacy scan of every module export.
 *
 * @summary SessionStart equivalent for the Cards Assistant on OpenCode
 * @module assistant/session-start
 */

import type { Plugin } from '@opencode-ai/plugin';
import { createAssistantSessionStartPlugin } from '../internal/assistant-handlers.js';
import { defineOpencodePluginModule } from '../internal/plugin-module.js';

/** Assistant announcement plugin bound to the real dependency wiring. */
export const CardsAssistantSessionStart: Plugin = createAssistantSessionStartPlugin();

export default defineOpencodePluginModule('cards-assistant-session-start', CardsAssistantSessionStart);
