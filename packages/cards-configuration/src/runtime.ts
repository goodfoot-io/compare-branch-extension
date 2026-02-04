/**
 * Runtime orchestration for compiled Cards hooks.
 *
 * This module is bundled into compiled hooks by the CLI. It provides the
 * execution harness that reads hook input from environment variables, sets
 * up the logger context, invokes the user's handler, and exits the process
 * with the appropriate code.
 *
 * The runtime is designed to never return in normal use. All code paths
 * terminate with `process.exit()`. The only exception is test scenarios
 * where `process.exit` is mocked.
 *
 * ## Execution Flow
 *
 * 1. Configure log file from CLI injection or environment variable
 * 2. Extract input payload from environment variables based on hookEventName
 * 3. Set logger context with hook type and input
 * 4. Invoke the user's handler with input and context
 * 5. On success: clean up and exit with code 0
 * 6. On error: log error, write to stderr, clean up and exit with code 1
 *
 * @module
 * @see {@link execute} for the main entry point
 *
 * @example
 * ```typescript
 * // This is what compiled hooks look like internally
 * import { execute } from '@cards/configuration/runtime';
 * import myHook from './my-hook.js';
 *
 * execute(myHook);
 * ```
 */

import { extractInput } from './env.js';
import { EXIT_CODES, writeError } from './exit-codes.js';
import type { HookContext, HookFunction } from './hooks.js';
import { logger } from './logger.js';
import type { EndCardInput, EndInterviewInput, HookInput, StartCardInput, StartInterviewInput } from './types.js';

/**
 * Union of hook function types supported by the runtime.
 *
 * Extend this type when adding new hook event types so {@link execute}
 * can accept them. Each variant corresponds to a different input payload
 * shape based on the hook's event type.
 *
 * @internal
 */
type AnyHookFunction =
  | HookFunction<StartCardInput>
  | HookFunction<EndCardInput>
  | HookFunction<StartInterviewInput>
  | HookFunction<EndInterviewInput>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalizes an unknown error value into a human-readable message.
 *
 * Errors in JavaScript can be thrown with any value. This function ensures
 * we always get a string message regardless of what was thrown.
 *
 * @param error - The caught error value, which may or may not be an Error instance
 * @returns A string message suitable for logging or display
 *
 * @internal
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Cleans up logger state and terminates the process.
 *
 * This function never returns. It clears the logger's hook context, closes
 * open file handles to flush pending writes, and exits with the specified
 * code.
 *
 * @param exitCode - The exit code to pass to `process.exit()`
 * @returns Never returns; process terminates
 *
 * @internal
 */
function cleanupAndExit(exitCode: number): never {
  logger.clearContext();
  logger.close();
  process.exit(exitCode);
}

/**
 * Validates log file configuration and resolves conflicts.
 *
 * The CLI can inject a log file path via `CARDS_HOOKS_CLI_LOG_FILE`, and
 * users can also set `CARDS_HOOKS_LOG_FILE` directly. If both are set and
 * differ, this is a configuration error that we surface immediately rather
 * than silently using one or the other.
 *
 * If only the CLI variable is set, we apply it to the logger. The user
 * variable is handled by the Logger constructor automatically.
 *
 * @internal
 */
function configureLogFile(): void {
  const cliLogFile = process.env['CARDS_HOOKS_CLI_LOG_FILE'];
  const envLogFile = process.env['CARDS_HOOKS_LOG_FILE'];

  if (cliLogFile !== undefined && envLogFile !== undefined && cliLogFile !== envLogFile) {
    process.stderr.write(
      `Log file configuration conflict: CLI --log="${cliLogFile}" vs CARDS_HOOKS_LOG_FILE="${envLogFile}". ` +
        'Use only one method to configure hook logging.\n'
    );
    process.exit(EXIT_CODES.ERROR);
  }

  if (cliLogFile !== undefined) {
    logger.setLogFile(cliLogFile);
  }
}

/**
 * Handles errors during environment variable extraction.
 *
 * Environment extraction can fail if required variables are missing or
 * malformed. This provides user-friendly error output and ensures proper
 * cleanup before exit.
 *
 * @param error - The error thrown during extraction
 * @returns Never returns; process terminates with error code
 *
 * @internal
 */
function handleEnvExtractionError(error: unknown): never {
  const message = getErrorMessage(error);
  logger.error(`Failed to extract input from environment: ${message}`);
  writeError(`Hook failed: ${message}`);
  cleanupAndExit(EXIT_CODES.ERROR);
}

/**
 * Handles errors thrown by the user's hook handler.
 *
 * When a handler throws or rejects, we want to provide useful debugging
 * information. This writes the full stack trace to stderr (which the
 * execution wrapper captures) and logs a structured error event.
 *
 * @param error - The error thrown or rejection reason from the handler
 * @returns Never returns; process terminates with error code
 *
 * @internal
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
 * This is the main entry point that compiled hooks use. The CLI generates
 * wrapper code that imports the user's hook and passes it to this function.
 * From there, execute handles all the ceremony: environment parsing, logging
 * setup, handler invocation, error handling, and process termination.
 *
 * The function exits the process in all normal code paths. The returned
 * promise only resolves if `process.exit` is mocked, which happens in test
 * scenarios. Production code should not await this function or expect it
 * to return.
 *
 * ## Error Handling
 *
 * Errors are handled at three levels:
 *
 * 1. **Configuration errors** (log file conflicts): Exit immediately with
 *    a clear message explaining the conflict.
 *
 * 2. **Environment extraction errors** (missing/invalid variables): Log the
 *    error and exit. These indicate a problem with how the hook was invoked.
 *
 * 3. **Handler errors** (user code throws): Write the stack trace to stderr,
 *    log a structured error, and exit. The execution wrapper captures stderr
 *    for debugging.
 *
 * @param hookFn - The hook function to execute, typically from a factory like
 *   {@link actionStart} or {@link typeValidator}
 * @returns A promise that resolves only when `process.exit` is mocked (tests)
 *
 * @example
 * ```typescript
 * // Generated wrapper code (produced by CLI)
 * import { execute } from '@cards/configuration/runtime';
 * import hook from './user-hook.js';
 *
 * // This call never returns in production
 * execute(hook);
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
