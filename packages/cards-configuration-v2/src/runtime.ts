/**
 * Runtime orchestration for compiled Cards action and type handlers.
 *
 * This module is bundled into compiled handlers by the CLI. It provides the
 * execution harness that reads handler input from environment variables, sets
 * up the logger context, invokes the user's handler, and exits the process
 * with the appropriate code.
 *
 * The runtime is designed to never return in normal use. All code paths
 * terminate with `process.exit()`. The only exception is test scenarios
 * where `process.exit` is mocked.
 *
 * ## Execution Flow
 *
 * 1. Extract input payload from environment variables based on command type
 * 2. Set logger context with command type and input
 * 3. Build ActionContext with logger and cwd
 * 4. Invoke the command with input and context
 * 5. On success: clean up and exit with code 0
 * 6. On error: log error, write to stderr, clean up and exit with code 1
 *
 * @module
 * @see {@link execute} for the main entry point
 *
 * @example
 * ```typescript
 * // This is what compiled handlers look like internally
 * import { execute } from '@cards/configuration-v2/runtime';
 * import myCommand from './my-command.js';
 *
 * execute(myCommand);
 * ```
 */

import type {
  ActionEndCommand,
  ActionStartCommand,
  TypeCreateCommand,
  TypeDeleteCommand,
  TypeUpdateCommand,
  TypeValidatorCommand
} from './command-types.js';
import { extractActionInput, extractTypeInput } from './env.js';
import { EXIT_CODES, writeError } from './exit-codes.js';
import type { ActionContext, ActionEndInput, ActionStartInput, TypeHookInput } from './inputs.js';
import { logger } from './logger.js';

// ============================================================================
// Command Type Union
// ============================================================================

/**
 * Union of all command types supported by the runtime.
 *
 * This type union allows {@link execute} to accept any command returned by
 * the factory functions. The runtime dispatches based on the `factoryType`
 * discriminant.
 *
 * @internal
 */
type AnyCommand =
  | ActionStartCommand
  | ActionEndCommand
  | TypeValidatorCommand
  | TypeCreateCommand
  | TypeUpdateCommand
  | TypeDeleteCommand;

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
 * This function never returns. It clears the logger's context, closes
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
  writeError(`Handler failed: ${message}`);
  cleanupAndExit(EXIT_CODES.ERROR);
}

/**
 * Handles errors thrown by the user's command handler.
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
  logger.error(`Handler error: ${getErrorMessage(error)}`);
  cleanupAndExit(EXIT_CODES.ERROR);
}

// ============================================================================
// Execute Function
// ============================================================================

/**
 * Executes a command handler with full runtime orchestration.
 *
 * This is the main entry point that compiled handlers use. The CLI generates
 * wrapper code that imports the user's command and passes it to this function.
 * From there, execute handles all the ceremony: environment parsing, logging
 * setup, handler invocation, error handling, and process termination.
 *
 * The function exits the process in all normal code paths. The returned
 * promise only resolves if `process.exit` is mocked, which happens in test
 * scenarios. Production code should not await this function or expect it
 * to return.
 *
 * ## Supported Command Types
 *
 * - **Action Start** (`actionStart`): Invoked when an action begins
 * - **Action End** (`actionEnd`): Invoked after successful action completion
 * - **Type Validator** (`typeValidator`): Validates typed file content
 * - **Type Create** (`typeCreate`): Runs after new typed file creation
 * - **Type Update** (`typeUpdate`): Runs after typed file modification
 * - **Type Delete** (`typeDelete`): Runs when typed file is deleted
 *
 * ## Error Handling
 *
 * Errors are handled at three levels:
 *
 * 1. **Environment extraction errors** (missing/invalid variables): Log the
 *    error and exit. These indicate a problem with how the handler was invoked.
 *
 * 2. **Handler errors** (user code throws): Write the stack trace to stderr,
 *    log a structured error, and exit. The execution wrapper captures stderr
 *    for debugging.
 *
 * 3. **Unexpected errors**: Catch-all for any other failures during runtime
 *    orchestration.
 *
 * @param command - The command to execute, returned from a factory function
 * @returns A promise that resolves only when `process.exit` is mocked (tests)
 *
 * @example
 * ```typescript
 * // Generated wrapper code (produced by CLI)
 * import { execute } from '@cards/configuration-v2/runtime';
 * import command from './user-command.js';
 *
 * // This call never returns in production
 * execute(command);
 * ```
 */
export async function execute(command: AnyCommand): Promise<void> {
  try {
    // Determine command type and extract appropriate input
    const factoryType = command.factoryType;
    let input: ActionStartInput | ActionEndInput | TypeHookInput;

    try {
      if (factoryType === 'actionStart' || factoryType === 'actionEnd') {
        input = extractActionInput();
      } else {
        // Type commands: validator, create, update, delete
        input = extractTypeInput();
      }
    } catch (error) {
      handleEnvExtractionError(error);
      // TypeScript knows this is unreachable due to 'never' return type
      // But at runtime in tests with mocked process.exit, it may continue
      // This return prevents that from happening
      return;
    }

    // Set logger context with command type
    logger.setContext(factoryType, input as unknown as Record<string, unknown>);

    // Build ActionContext with logger and cwd
    const context: ActionContext = {
      logger,
      cwd: process.cwd()
    };

    // Execute the command handler
    try {
      await command(input as never, context);
    } catch (error) {
      handleHandlerError(error);
      // Same guard for tests with mocked process.exit
      return;
    }

    // Clean up and exit successfully
    cleanupAndExit(EXIT_CODES.SUCCESS);
  } catch (error) {
    // Unexpected error - try to clean up and exit
    logger.error(`Unexpected runtime error: ${getErrorMessage(error)}`);
    cleanupAndExit(EXIT_CODES.ERROR);
  }
}
