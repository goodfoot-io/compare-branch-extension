/**
 * SessionStart hook implementation.
 *
 * @see https://code.claude.com/docs/en/hooks#sessionstart
 */

import { sessionStartHook, sessionStartOutput } from "@goodfoot/claude-code-hooks";

export default sessionStartHook({}, (input, { logger }) => {
  logger.info("SessionStart hook triggered", { input });
  return sessionStartOutput({
    systemMessage: "Session initialized by SessionStart hook.",
    hookSpecificOutput: { additionalContext: "Environment ready." },
  });
});
