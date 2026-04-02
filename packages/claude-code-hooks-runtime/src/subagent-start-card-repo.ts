/**
 * SubagentStart hook that injects card repository reference content.
 *
 * Separated from the main subagent-start hook so the card-repo documentation
 * is delivered as its own context block.
 *
 * @summary SubagentStart hook — card repository reference injection
 * @see https://code.claude.com/docs/en/hooks#subagentstart
 */

import { subagentStartHook, subagentStartOutput } from '@goodfoot/claude-code-hooks';
import cardRepoContent from './content/card-repo.md';

export default subagentStartHook({}, (_input, _ctx) => {
  return subagentStartOutput({
    systemMessage: cardRepoContent.trim()
  });
});
