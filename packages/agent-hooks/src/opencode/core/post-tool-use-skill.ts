/**
 * OpenCode plugin entry: silent `cards:cards` skill-load recorder.
 *
 * Persists the per-session skill marker through `tool.execute.after` so the
 * prompt nudge stops asking once the skill is loaded. See the factory for
 * behavior.
 *
 * Exports exactly one plugin factory function — OpenCode invokes every
 * exported function value in a plugin module, so nothing else may be exported.
 *
 * @summary PostToolUse(Skill) equivalent for OpenCode
 * @module core/post-tool-use-skill
 */

import type { Plugin } from '@opencode-ai/plugin';
import { createPostToolUseSkillPlugin } from '../internal/core-handlers.js';

/** Skill-load recorder plugin bound to the real dependency wiring. */
export const CardsPostToolUseSkill: Plugin = createPostToolUseSkillPlugin();
