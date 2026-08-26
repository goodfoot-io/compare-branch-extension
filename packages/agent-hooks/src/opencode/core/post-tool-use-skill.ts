/**
 * OpenCode plugin entry: silent cards skill-load recorder.
 *
 * Persists the per-session skill marker through `tool.execute.after` so the
 * prompt nudge stops asking once the skill is loaded. See the factory for
 * behavior.
 *
 * Default-exports OpenCode's detected `{ id, server }` module shape. The named
 * factory remains available to focused tests without forcing the host through
 * its fragile legacy scan of every module export.
 *
 * @summary PostToolUse(Skill) equivalent for OpenCode
 * @module core/post-tool-use-skill
 */

import type { Plugin } from '@opencode-ai/plugin';
import { createPostToolUseSkillPlugin } from '../internal/core-handlers.js';
import { defineOpencodePluginModule } from '../internal/plugin-module.js';

/** Skill-load recorder plugin bound to the real dependency wiring. */
export const CardsPostToolUseSkill: Plugin = createPostToolUseSkillPlugin();

export default defineOpencodePluginModule('cards-post-tool-use-skill', CardsPostToolUseSkill);
