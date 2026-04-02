/**
 * SessionStart hook that injects card repository reference content.
 *
 * Separated from the main session-start hook so the card-repo documentation
 * is delivered as its own context block.
 *
 * @summary SessionStart hook — card repository reference injection
 * @see https://code.claude.com/docs/en/hooks#sessionstart
 */

import { sessionStartHook, sessionStartOutput } from '@goodfoot/claude-code-hooks';
import cardRepoContent from './content/card-repo.md';

export default sessionStartHook({}, (_input, _ctx) => {
  return sessionStartOutput({
    systemMessage: cardRepoContent.trim()
  });
});
