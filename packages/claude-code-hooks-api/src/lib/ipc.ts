/**
 * Process-level helpers for checking process liveness.
 *
 * @module lib/ipc
 */

/**
 * Checks if a process is alive using `kill(pid, 0)`.
 *
 * Signal 0 is a no-op probe: no signal is delivered, but the kernel still
 * validates that the target PID exists. `EPERM` is treated as "alive"
 * because the process exists but is owned by another user.
 *
 * @param pid - Process ID to check.
 * @returns True if the process exists, false if it does not.
 * @throws Rethrows unexpected errors from `process.kill`.
 */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ESRCH") return false;
      if (code === "EPERM") return true;
    }
    throw error;
  }
}
