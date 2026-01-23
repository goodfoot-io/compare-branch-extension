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
 * import { execute } from '@goodfoot/compare-branch-hooks/runtime';
 * import myHook from './my-hook.js';
 *
 * execute(myHook);
 * ```
 */

import { extractInput } from "./env.js";
import { EXIT_CODES, writeError } from "./exit-codes.js";
import type { HookContext, HookFunction } from "./hooks.js";
import { logger } from "./logger.js";
import type {
  EndInterviewInput,
  EndIssueInput,
  EndTaskInput,
  HookInput,
  StartInterviewInput,
  StartIssueInput,
  StartTaskInput,
} from "./types.js";

/**
 * Union type of all possible hook functions.
 * This allows execute() to accept any hook function type.
 */
type AnyHookFunction =
  | HookFunction<StartIssueInput>
  | HookFunction<StartTaskInput>
  | HookFunction<EndTaskInput>
  | HookFunction<EndIssueInput>
  | HookFunction<StartInterviewInput>
  | HookFunction<EndInterviewInput>;

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Handles errors from environment variable extraction.
 *
 * Logs the error, writes to stderr, and exits with ERROR code.
 * @param error - The error that occurred during env extraction
 */
function handleEnvExtractionError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`Failed to extract input from environment: ${message}`);
  writeError(`Hook failed: ${message}`);
  logger.clearContext();
  logger.close();
  process.exit(EXIT_CODES.ERROR);
}

/**
 * Handles errors thrown by the hook handler.
 *
 * Writes stack trace to stderr (with sourcemaps if available) and exits with ERROR code.
 * @param error - The error thrown by the handler
 */
function handleHandlerError(error: unknown): never {
  // Write stack trace to stderr (sourcemaps are applied automatically by Node.js)
  if (error instanceof Error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
  } else {
    process.stderr.write(`${String(error)}\n`);
  }

  // Log to file if configured
  logger.error(`Hook handler error: ${error instanceof Error ? error.message : String(error)}`);

  // Clear logger context and close
  logger.clearContext();
  logger.close();

  // Exit with code 1 (ERROR)
  process.exit(EXIT_CODES.ERROR);
}

// ============================================================================
// Execute Function
// ============================================================================

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
 * import { execute } from '@goodfoot/compare-branch-hooks/runtime';
 * import { startTaskHook } from '@goodfoot/compare-branch-hooks';
 *
 * const myHook = startTaskHook({}, async (input, { logger }) => {
 *   logger.info('Processing task', { taskId: input.taskId });
 * });
 *
 * execute(myHook);
 * ```
 */
export async function execute(hookFn: AnyHookFunction): Promise<void> {
  try {
    // Check for log file configuration conflicts
    // COMPARE_BRANCH_HOOKS_CLI_LOG_FILE is injected by the CLI --log parameter
    // COMPARE_BRANCH_HOOKS_LOG_FILE is the user's environment variable
    const cliLogFile = process.env.COMPARE_BRANCH_HOOKS_CLI_LOG_FILE;
    const envLogFile = process.env.COMPARE_BRANCH_HOOKS_LOG_FILE;

    if (cliLogFile !== undefined && envLogFile !== undefined && cliLogFile !== envLogFile) {
      // Write error to stderr and exit with error code
      process.stderr.write(
        `Log file configuration conflict: CLI --log="${cliLogFile}" vs COMPARE_BRANCH_HOOKS_LOG_FILE="${envLogFile}". ` +
          "Use only one method to configure hook logging.\n",
      );
      process.exit(EXIT_CODES.ERROR);
    }

    // If CLI log file is set, configure the logger
    if (cliLogFile !== undefined) {
      logger.setLogFile(cliLogFile);
    }

    // Extract input from environment variables
    const hookEventName = hookFn.hookEventName;
    let input: HookInput;
    try {
      input = extractInput(hookEventName);
    } catch (error) {
      handleEnvExtractionError(error);
    }

    // Set logger context
    logger.setContext(hookEventName, input);

    // Build context
    const context: HookContext = { logger };

    // Execute handler
    try {
      // Type assertion is safe here because extractInput returns the correct type
      // based on hookEventName, which matches the hook function's expected input type
      await (hookFn as HookFunction<HookInput>)(input, context);
    } catch (error) {
      // Handler threw - output stacktrace to stderr and exit with code 1
      handleHandlerError(error);
    }

    // Success - clear context and exit with 0
    logger.clearContext();
    logger.close();
    process.exit(EXIT_CODES.SUCCESS);
  } catch (error) {
    // Unexpected error - try to clean up and exit
    logger.error(`Unexpected runtime error: ${error instanceof Error ? error.message : String(error)}`);
    logger.clearContext();
    logger.close();
    process.exit(EXIT_CODES.ERROR);
  }
}
