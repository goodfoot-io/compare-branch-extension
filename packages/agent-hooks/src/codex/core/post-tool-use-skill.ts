/**
 * PostToolUse hook that silently records when the `cards:cards` skill is loaded.
 *
 * Matches the `Skill` tool invocation to observe skill loads. When the loaded
 * skill name starts with `cards:cards`, it persists a per-session marker file
 * via {@link markSessionSkillLoaded}. The marker short-circuits the
 * {@link ../user-prompt-submit UserPromptSubmit} nudge so it stops asking once
 * the skill is loaded.
 *
 * `Skill` is not in `KnownToolName`, so `input.tool_input` arrives as
 * `unknown`. The handler narrows it with a local type guard, and on any
 * mismatch returns `undefined` — fail-open: no crash, no output.
 *
 * Always returns `undefined` — recording is silent.
 *
 * @summary PostToolUse hook recording cards:cards skill loads
 * @module post-tool-use-skill
 */

import { markSessionSkillLoaded } from '@cards/sessions/card-repo';
import { postToolUseHook } from '@goodfoot/codex-hooks';

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

/**
 * Narrows `unknown` tool_input to `{ skill: string }` for the `Skill` tool.
 *
 * `Skill` is not in the SDK's `KnownToolName` union, so tool_input is
 * untyped — we guard at runtime.
 *
 * @param value - The `tool_input` value to narrow.
 * @returns `true` when `value` is a non-null object with a string `skill` property.
 */
function isSkillToolInput(value: unknown): value is { skill: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'skill' in value &&
    typeof (value as Record<string, unknown>)['skill'] === 'string'
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export default postToolUseHook({ matcher: 'Skill' }, async (input, { logger }) => {
  try {
    if (!isSkillToolInput(input.tool_input)) return undefined;

    if (input.tool_input.skill.startsWith('cards:cards')) {
      markSessionSkillLoaded(input.session_id, 'cards:cards');
      logger.info('Recorded cards:cards skill load', {
        sessionId: input.session_id,
        skill: input.tool_input.skill
      });
    }

    return undefined;
  } catch (error) {
    logger.warn('PostToolUse skill hook failed (fail-open)', { error });
    return undefined;
  }
});
