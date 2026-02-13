/**
 * Process-level helpers for checking process liveness.
 *
 *
 * @summary Process-level helpers for checking process liveness
 * @module ipc
 */

/**
 * Checks if a process is alive using `kill(pid, 0)`.
 *
 * Signal 0 is a no-op probe: no signal is delivered, but the kernel still
 * validates that the target PID exists. `EPERM` is treated as "alive"
 * because the process exists but is owned by another user.
 *
 * @param pid - PID to probe. Callers usually pass a value previously recorded
 *   in the session registry.
 * @returns `true` when the PID still exists. `EPERM` is treated as alive
 *   because permission failures still mean the process is present.
 * @throws Rethrows unexpected `process.kill` failures so callers can fail closed.
 */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ESRCH') return false;
      if (code === 'EPERM') return true;
    }
    throw error;
  }
}
