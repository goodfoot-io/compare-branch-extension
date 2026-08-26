/**
 * OpenCode plugin entry: card-mention nudge over `chat.message`.
 *
 * Appends a `<cards-extension>` nudge part to the outgoing user message when a
 * root-session prompt mentions card concepts. See the factory for behavior.
 *
 * Default-exports OpenCode's detected `{ id, server }` module shape. The named
 * factory remains available to focused tests without forcing the host through
 * its fragile legacy scan of every module export.
 *
 * @summary UserPromptSubmit equivalent for OpenCode
 * @module core/user-prompt-submit
 */

import type { Plugin } from '@opencode-ai/plugin';
import { createUserPromptSubmitPlugin } from '../internal/core-handlers.js';
import { defineOpencodePluginModule } from '../internal/plugin-module.js';

/** Card-mention nudge plugin bound to the real dependency wiring. */
export const CardsUserPromptSubmit: Plugin = createUserPromptSubmitPlugin();

export default defineOpencodePluginModule('cards-user-prompt-submit', CardsUserPromptSubmit);
