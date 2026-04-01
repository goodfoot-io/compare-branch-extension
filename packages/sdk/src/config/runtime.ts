/**
 * Runtime orchestration for compiled Cards action handlers.
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
 * 3. Optionally connect to SOCKET_PATH for command dispatch (fail-open)
 * 4. Build ActionContext with logger, cwd, and socket-backed callbacks
 * 5. Invoke the command with input and context
 * 6. On success: clean up socket and exit with code 0
 * 7. On error: log error, write to stderr, clean up and exit with code 1
 *
 *
 * @summary Runtime orchestration for compiled Cards action handlers
 * @module
 * @see {@link executeCommand} for the main entry point
 *
 * @example
 * ```typescript
 * // This is what compiled handlers look like internally
 * import { executeCommand } from '@cards/sdk/config/runtime';
 * import myCommand from './my-command.js';
 *
 * executeCommand(myCommand);
 * ```
 */

import type { ActionCommand } from './command-types.js';
import { CARDS_ENV_VARS, extractActionInput } from './env.js';
import { EXIT_CODES, writeError } from './exit-codes.js';
import type { ActionContext, ActionInput } from './inputs.js';
import { logger } from './logger.js';
import type { SocketCommand } from './socket-client.js';
import { SocketClient } from './socket-client.js';

// ============================================================================
// Command Type Union
// ============================================================================

/**
 * Union of all command types supported by the runtime.
 *
 * This type union allows {@link executeCommand} to accept any command returned by
 * the factory functions. The runtime dispatches based on the `factoryType`
 * discriminant.
 *
 * @internal
 */
type AnyCommand = ActionCommand;

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
 * From there, executeCommand handles all the ceremony: environment parsing, logging
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
 * import { executeCommand } from '@cards/sdk/config/runtime';
 * import command from './user-command.js';
 *
 * // This call never returns in production
 * executeCommand(command);
 * ```
 */
export async function executeCommand(command: AnyCommand): Promise<void> {
  // Prevent SIGHUP from killing the action handler before post-exit cleanup
  // (e.g. spawnBranchCleanupWatcher) can run. When a VSCode terminal closes,
  // node-pty sends SIGHUP to the process group. Without this handler, Node.js
  // terminates immediately and any post-exit code after the awaited child
  // process never executes. The handler is a no-op: the child process (e.g.
  // claude CLI) will receive SIGHUP independently, exit, and the awaiting
  // code will resume to run post-exit cleanup.
  process.on('SIGHUP', () => {});

  try {
    let input: ActionInput;

    try {
      input = extractActionInput();
    } catch (error) {
      return handleEnvExtractionError(error);
    }

    // Set logger context with command type
    logger.setContext(command.factoryType, { ...input });

    // Socket connection and ActionContext for action commands
    let socketClient: SocketClient | undefined;
    const socketPath = process.env[CARDS_ENV_VARS.SOCKET_PATH];
    if (socketPath) {
      try {
        socketClient = await SocketClient.connect(socketPath);
      } catch (error) {
        logger.warn(`Failed to connect to socket at ${socketPath}: ${getErrorMessage(error)}`);
        // Fail-open: continue without socket
      }
    }

    // Callback registration state
    let cancelCallback: (() => void | Promise<void>) | undefined;
    let switchToInteractiveCallback: (() => unknown | Promise<unknown>) | undefined;
    let commandProcessed = false;

    // Build ActionContext with logger, cwd, and socket-backed callbacks
    const context: ActionContext = {
      logger,
      cwd: process.cwd(),
      onCancel: (callback) => {
        cancelCallback = callback;
      },
      onSwitchToInteractive: (callback) => {
        switchToInteractiveCallback = callback;
      }
    };

    // Wire socket command dispatch
    if (socketClient) {
      socketClient.onCommand((cmd: SocketCommand) => {
        // First-wins semantics: ignore subsequent commands
        if (commandProcessed) return;
        commandProcessed = true;

        if (cmd.type === 'cancel') {
          handleCancelCommand(cancelCallback, socketClient);
        } else if (cmd.type === 'switchToInteractive') {
          handleSwitchToInteractiveCommand(switchToInteractiveCallback, socketClient!);
        }
      });
    }

    // Execute the action command handler
    try {
      await command(input, context);
    } catch (error) {
      socketClient?.close();
      return handleHandlerError(error);
    }

    // Clean up socket and exit successfully
    socketClient?.close();
    cleanupAndExit(EXIT_CODES.SUCCESS);
  } catch (error) {
    // Unexpected error - try to clean up and exit
    logger.error(`Unexpected runtime error: ${getErrorMessage(error)}`);
    cleanupAndExit(EXIT_CODES.ERROR);
  }
}

// ============================================================================
// Socket Command Handlers
// ============================================================================

/**
 * Resolves a callback result that may be sync or async into a Promise.
 *
 * User-registered callbacks may return void, a value, or a Promise.
 * This normalizes all cases into a single Promise for consistent handling.
 *
 * @param result - Callback return value that may already be a promise.
 * @returns Promise resolving to the callback result.
 * @internal
 */
function toPromise<T>(result: T | Promise<T>): Promise<T> {
  if (result && typeof (result as Promise<T>).then === 'function') {
    return result as Promise<T>;
  }
  return Promise.resolve(result);
}

/**
 * Handles a `cancel` command from the socket.
 *
 * If a cancel callback was registered, it is invoked. Otherwise, SIGTERM
 * is sent to the current process as a fallback. After the callback completes
 * (or immediately if no callback), the process exits with error code.
 *
 * @param callback - The registered cancel callback, if any
 * @param socketClient - The socket client to close before exiting
 *
 * @internal
 */
function handleCancelCommand(
  callback: (() => void | Promise<void>) | undefined,
  socketClient: SocketClient | undefined
): void {
  if (!callback) {
    process.kill(process.pid, 'SIGTERM');
    return;
  }

  toPromise(callback()).then(
    () => {
      socketClient?.close();
      cleanupAndExit(EXIT_CODES.ERROR);
    },
    () => {
      socketClient?.close();
      cleanupAndExit(EXIT_CODES.ERROR);
    }
  );
}

/**
 * Handles a `switchToInteractive` command from the socket.
 *
 * If no callback was registered, the command is ignored (no-op). Otherwise,
 * the callback is invoked and its return value is sent as
 * `switchToInteractiveResponse` on the socket. `process.exit(42)` is called
 * inside the `write()` callback to guarantee the response is flushed before
 * the event loop tears down.
 *
 * @param callback - The registered switchToInteractive callback, if any
 * @param socketClient - The socket client used to send the response
 *
 * @internal
 */
function handleSwitchToInteractiveCommand(
  callback: (() => unknown | Promise<unknown>) | undefined,
  socketClient: SocketClient
): void {
  if (!callback) {
    return;
  }

  toPromise(callback()).then(
    (data) => {
      socketClient.sendResponseThen({ type: 'switchToInteractiveResponse', data }, () => {
        cleanupAndExit(EXIT_CODES.SWITCH_TO_INTERACTIVE);
      });
    },
    (error) => {
      logger.error(`switchToInteractive callback error: ${getErrorMessage(error)}`);
      socketClient.close();
      cleanupAndExit(EXIT_CODES.ERROR);
    }
  );
}
