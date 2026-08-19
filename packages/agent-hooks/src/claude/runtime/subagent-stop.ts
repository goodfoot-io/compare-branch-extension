/**
 * SubagentStop hook implementation.
 *
 * No-op. (Subagent transcript sync to the Cards API is handled by the Phase 3
 * transcript-sync engine via manifest globs, not by this hook.)
 *
 * @summary SubagentStop hook — no-op
 */

import { subagentStopHook } from '@goodfoot/claude-code-hooks';

export default subagentStopHook({}, async () => {
  return null;
});
