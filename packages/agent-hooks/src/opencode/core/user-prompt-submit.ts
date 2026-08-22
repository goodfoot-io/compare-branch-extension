/**
 * OpenCode plugin entry: card-mention nudge over `chat.message`.
 *
 * Appends a `<cards-extension>` nudge part to the outgoing user message when a
 * root-session prompt mentions card concepts. See the factory for behavior.
 *
 * Exports exactly one plugin factory function — OpenCode invokes every
 * exported function value in a plugin module, so nothing else may be exported.
 *
 * @summary UserPromptSubmit equivalent for OpenCode
 * @module core/user-prompt-submit
 */

import type { Plugin } from '@opencode-ai/plugin';
import { createUserPromptSubmitPlugin } from '../internal/core-handlers.js';

/** Card-mention nudge plugin bound to the real dependency wiring. */
export const CardsUserPromptSubmit: Plugin = createUserPromptSubmitPlugin();
