/**
 * Runtime module for Compare Branch Extension hooks.
 *
 * Handles environment variable extraction, handler invocation, and exit code management
 * for compiled hook execution. This module is the core orchestrator that:
 * - Reads input from environment variables
 * - Invokes the hook handler
 * - Manages exit codes (0 for success, 1 for error)
 * @module
 * @example
 * ```typescript
 * // In a compiled hook file
 * import { execute } from '@goodfoot/compare-branch-configuration/runtime';
 * import myHook from './my-hook.js';
 *
 * execute(myHook);
 * ```
 */
import type { HookFunction } from './hooks.js';
import type { EndInterviewInput, EndIssueInput, StartInterviewInput, StartIssueInput } from './types.js';
/**
 * Union type of all possible hook functions.
 * This allows execute() to accept any hook function type.
 */
type AnyHookFunction = HookFunction<StartIssueInput> | HookFunction<EndIssueInput> | HookFunction<StartInterviewInput> | HookFunction<EndInterviewInput>;
/**
 * Executes a hook handler with full runtime orchestration.
 *
 * This is the main entry point that compiled hooks use. When a compiled hook
 * runs as a CLI:
 *
 * 1. Checks for log file configuration conflicts
 * 2. Extracts input from environment variables based on hook type
 * 3. Sets up logger context
 * 4. Builds context object { logger }
 * 5. Invokes handler
 * 6. On success: exits with code 0
 * 7. On error: logs error, writes stderr, exits with code 1
 * @param hookFn - The hook function to execute (from hook factory)
 * @example
 * ```typescript
 * // In compiled hook file
 * import { execute } from '@goodfoot/compare-branch-configuration/runtime';
 * import { startIssueHook } from '@goodfoot/compare-branch-configuration';
 *
 * const myHook = startIssueHook({}, async (input, { logger }) => {
 *   logger.info('Processing issue', { issueId: input.issueId });
 * });
 *
 * execute(myHook);
 * ```
 */
export declare function execute(hookFn: AnyHookFunction): Promise<void>;
export {};
//# sourceMappingURL=runtime.d.ts.map