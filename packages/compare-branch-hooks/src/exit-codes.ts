/**
 * Exit code constants and helpers for Compare Branch Extension hooks.
 *
 * Compare Branch hooks use exit codes to communicate success/failure:
 * - Exit 0: Hook completed successfully
 * - Exit non-zero: Hook failed (error message written to stderr)
 *
 * Unlike claude-code-hooks which outputs JSON to stdout, these hooks
 * communicate purely through exit codes and stderr for errors.
 * @module
 */

// ============================================================================
// Exit Code Constants
// ============================================================================

/**
 * Exit codes used by Compare Branch hooks.
 *
 * | Exit Code | Name | When Used |
 * |-----------|------|-----------|
 * | 0 | SUCCESS | Handler completed successfully |
 * | 1 | ERROR | Handler threw an error |
 */
export const EXIT_CODES = {
  /** Handler completed successfully. */
  SUCCESS: 0,
  /** Handler threw an error. */
  ERROR: 1,
} as const;

/**
 * Exit code type.
 */
export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

// ============================================================================
// Error Output Helpers
// ============================================================================

/**
 * Writes an error message to stderr.
 *
 * Use this function to output error information before exiting.
 * Errors are written to stderr to avoid interfering with any
 * potential stdout communication.
 *
 * @param message - The error message to write
 * @example
 * ```typescript
 * writeError('Failed to connect to database');
 * ```
 */
export function writeError(message: string): void {
  process.stderr.write(`${message}\n`);
}

/**
 * Writes an error message to stderr and exits with ERROR code.
 *
 * This function never returns - it terminates the process.
 *
 * @param message - The error message to write
 * @example
 * ```typescript
 * if (!isValid) {
 *   exitWithError('Invalid configuration');
 * }
 * // This code is never reached if isValid is false
 * ```
 */
export function exitWithError(message: string): never {
  writeError(message);
  process.exit(EXIT_CODES.ERROR);
}

// ============================================================================
// Internal Result Tracking
// ============================================================================

/**
 * Internal type for tracking hook execution result.
 *
 * Used by the runtime to determine the final exit code.
 */
export interface HookExecutionResult {
  /** Whether the hook executed successfully. */
  success: boolean;
  /** The exit code to use when exiting. */
  exitCode: ExitCode;
  /** The error that occurred, if any. */
  error?: Error;
}
