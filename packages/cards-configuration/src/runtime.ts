/**
 * Runtime orchestration for compiled Cards hooks.
 *
 * This module is bundled into compiled hooks by the CLI. It reads hook input
 * from environment variables, sets logger context, invokes the handler, and
 * exits the process with the correct code. It never returns in normal use.
 * @module
 * @example
 * ```typescript
 * // In a compiled hook file
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
 * Extend this when adding new hook event types so {@link execute} can accept them.
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
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Cleans up logger state and terminates the process.
 */
function cleanupAndExit(exitCode: number): never {
  logger.clearContext();
  logger.close();
  process.exit(exitCode);
}

/**
 * Checks for log file configuration conflicts between CLI and env var.
 *
 * The CLI injects CARDS_HOOKS_CLI_LOG_FILE; users can also set
 * CARDS_HOOKS_LOG_FILE directly. Both together must agree.
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
 * Handles errors from environment variable extraction.
 *
 * Logs the error, writes a concise message to stderr, and exits.
 */
function handleEnvExtractionError(error: unknown): never {
  const message = getErrorMessage(error);
  logger.error(`Failed to extract input from environment: ${message}`);
  writeError(`Hook failed: ${message}`);
  cleanupAndExit(EXIT_CODES.ERROR);
}

/**
 * Handles errors thrown by the hook handler.
 *
 * Writes a stack trace to stderr for debugging and exits with ERROR.
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
 *
 * This function exits the process in all handled paths. The returned promise
 * only resolves if `process.exit` is mocked (for example, in tests).
 * @param hookFn - The hook function to execute (from a hook factory)
 * @returns A promise that resolves only in test scenarios where process.exit is mocked
 * @example
 * ```typescript
 * // In compiled hook file
 * import { execute } from '@cards/configuration/runtime';
 * import { startCardHook } from '@cards/configuration';
 *
 * const myHook = startCardHook({}, async (input, { logger }) => {
 *   logger.info('Processing card', { cardId: input.cardId });
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
