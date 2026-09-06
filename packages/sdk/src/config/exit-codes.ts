/**
 * Exit code constants and helpers for Cards Extension hooks.
 *
 * Cards hooks communicate success and failure via process exit codes and
 * stderr output. This module centralizes those conventions so the runtime
 * and hooks speak the same protocol.
 *
 * @summary Exit code constants and helpers for Cards Extension hooks
 * @module
 */

// ============================================================================
// Exit Code Constants
// ============================================================================

/**
 * Exit codes used by Cards hooks.
 *
 * The Cards runtime interprets any non-zero exit code as failure.
 */
export const EXIT_CODES = {
  /** Handler completed successfully. */
  SUCCESS: 0,
  /** Handler threw an error. */
  ERROR: 1,
  /** Handler processed switchToInteractive and is exiting for relaunch. */
  SWITCH_TO_INTERACTIVE: 42
} as const;

/**
 * Union of valid Cards hook exit codes.
 */
export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

// ============================================================================
// Error Output Helpers
// ============================================================================

/**
 * Writes an error message to stderr with a trailing newline.
 *
 * Use this when a hook needs to report a failure without polluting stdout.
 * @param message - Error message to write
 * @example
 * ```typescript
 * writeError('Failed to connect to database');
 * ```
 */
export function writeError(message: string): void {
  process.stderr.write(`${message}\n`);
}

// ============================================================================
// Internal Result Tracking
// ============================================================================

/**
 * Internal runtime bookkeeping for hook execution results.
 *
 * This structure allows the runtime to carry error details without changing
 * the exit-code protocol.
 */
export interface HookExecutionResult {
  /** Whether the hook executed successfully. */
  success: boolean;
  /** The exit code to use when exiting. */
  exitCode: ExitCode;
  /** The error that occurred, if any. */
  error?: Error;
}
