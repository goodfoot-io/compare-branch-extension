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

import { extractInput } from './env.js';
import { EXIT_CODES, writeError } from './exit-codes.js';
import type { HookContext, HookFunction } from './hooks.js';
import { logger } from './logger.js';
import type { EndInterviewInput, EndIssueInput, HookInput, StartInterviewInput, StartIssueInput } from './types.js';

/**
 * Union type of all possible hook functions.
 * This allows execute() to accept any hook function type.
 */
type AnyHookFunction =
  | HookFunction<StartIssueInput>
  | HookFunction<EndIssueInput>
  | HookFunction<StartInterviewInput>
  | HookFunction<EndInterviewInput>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the error message from an unknown error value.
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Cleans up logger state and exits with the given code.
 */
function cleanupAndExit(exitCode: number): never {
  logger.clearContext();
  logger.close();
  process.exit(exitCode);
}

/**
 * Checks for log file configuration conflicts between CLI and env var.
 * Exits with error if there's a conflict.
 */
function configureLogFile(): void {
  const cliLogFile = process.env.COMPARE_BRANCH_HOOKS_CLI_LOG_FILE;
  const envLogFile = process.env.COMPARE_BRANCH_HOOKS_LOG_FILE;

  if (cliLogFile !== undefined && envLogFile !== undefined && cliLogFile !== envLogFile) {
    process.stderr.write(
      `Log file configuration conflict: CLI --log="${cliLogFile}" vs COMPARE_BRANCH_HOOKS_LOG_FILE="${envLogFile}". ` +
        'Use only one method to configure hook logging.\n'
    );
    process.exit(EXIT_CODES.ERROR);
  }

  if (cliLogFile !== undefined) {
    logger.setLogFile(cliLogFile);
  }
}

/**
 * Handles errors from environment variable extraction.
 * Logs the error, writes to stderr, and exits with ERROR code.
 */
function handleEnvExtractionError(error: unknown): never {
  const message = getErrorMessage(error);
  logger.error(`Failed to extract input from environment: ${message}`);
  writeError(`Hook failed: ${message}`);
  cleanupAndExit(EXIT_CODES.ERROR);
}

/**
 * Handles errors thrown by the hook handler.
 * Writes stack trace to stderr and exits with ERROR code.
 */
function handleHandlerError(error: unknown): never {
  const errorOutput = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${errorOutput}\n`);
  logger.error(`Hook handler error: ${getErrorMessage(error)}`);
  cleanupAndExit(EXIT_CODES.ERROR);
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
 * import { startIssueHook } from '@goodfoot/compare-branch-hooks';
 *
 * const myHook = startIssueHook({}, async (input, { logger }) => {
 *   logger.info('Processing issue', { issueId: input.issueId });
 * });
 *
 * execute(myHook);
 * ```
 */
export async function execute(hookFn: AnyHookFunction): Promise<void> {
  try {
    configureLogFile();

    // Extract input from environment variables
    const hookEventName = hookFn.hookEventName;
    let input: HookInput;
    try {
      input = extractInput(hookEventName);
    } catch (error) {
      handleEnvExtractionError(error);
    }

    // Set logger context and build handler context
    logger.setContext(hookEventName, input);
    const context: HookContext = { logger };

    // Execute handler
    try {
      // Type assertion is safe: extractInput returns the correct type based on hookEventName
      await (hookFn as HookFunction<HookInput>)(input, context);
    } catch (error) {
      handleHandlerError(error);
    }

    cleanupAndExit(EXIT_CODES.SUCCESS);
  } catch (error) {
    // Unexpected error - try to clean up and exit
    logger.error(`Unexpected runtime error: ${getErrorMessage(error)}`);
    cleanupAndExit(EXIT_CODES.ERROR);
  }
}
