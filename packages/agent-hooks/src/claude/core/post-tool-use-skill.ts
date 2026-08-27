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
 * mismatch returns `null` — fail-open: no crash, no output.
 *
 * Always returns `null` — recording is silent.
 *
 * @summary PostToolUse hook recording cards:cards skill loads
 * @module post-tool-use-skill
 */

import { markSessionSkillLoaded } from '@cards.management/sessions/card-repo';
import { postToolUseHook } from '@goodfoot/agent-hooks/claude-code';
import { applyDefaultLogFile } from '../../shared/default-log-file.js';

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
  // Point hook file logging at <mainRepoRoot>/.cards/logs/claude-code-cards-api-hooks.log,
  // computed from the payload cwd. No-op under an explicit CLAUDE_CODE_HOOKS_LOG_FILE.
  applyDefaultLogFile(input.cwd);

  try {
    if (!isSkillToolInput(input.tool_input)) return null;

    if (input.tool_input.skill.startsWith('cards:cards')) {
      markSessionSkillLoaded(input.session_id, 'cards:cards');
      logger.info('Recorded cards:cards skill load', {
        sessionId: input.session_id,
        skill: input.tool_input.skill
      });
    }

    return null;
  } catch (error) {
    logger.warn('PostToolUse skill hook failed (fail-open)', { error });
    return null;
  }
});
