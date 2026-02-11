/**
 * Stop hook implementation.
 *
 * @see https://code.claude.com/docs/en/hooks#stop
 */

import { stopHook, stopOutput } from "@goodfoot/claude-code-hooks";

export default stopHook({}, (input, { logger }) => {
  logger.info("Stop hook triggered", { input });
  return stopOutput({
    decision: "approve",
    systemMessage: "Stop hook executed successfully.",
  });
});
