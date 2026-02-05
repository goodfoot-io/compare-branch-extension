/**
 * Exit code constants and helpers for Cards Extension hooks.
 *
 * Cards hooks communicate success and failure via process exit codes and
 * stderr output. This module centralizes those conventions so the runtime
 * and hooks speak the same protocol.
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
    ERROR: 1
};
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
export function writeError(message) {
    process.stderr.write(`${message}\n`);
}
/**
 * Writes an error message to stderr and exits with ERROR code.
 *
 * This terminates the process immediately, so any pending async work will
 * not finish unless it was already awaited.
 * @param message - Error message to write before exiting
 * @example
 * ```typescript
 * if (!isValid) {
 *   exitWithError('Invalid configuration');
 * }
 * ```
 */
export function exitWithError(message) {
    writeError(message);
    process.exit(EXIT_CODES.ERROR);
}
