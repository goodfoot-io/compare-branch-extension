/**
 * Process tree utilities for locating supported agent ancestor processes.
 *
 * @summary Process tree utilities for locating supported agent ancestor processes
 * @module lib/process-tree
 */

import { execSync } from 'node:child_process';

/** Maximum depth to walk up the process tree. */
export const PROCESS_TREE_MAX_DEPTH = 10;

/**
 * Set of `comm` values that identify shell processes the walk skips.
 *
 * `comm` is the kernel-maintained command name (15-char truncated basename of
 * the executable), not influenced by argv path components. The first ancestor
 * whose `comm` is *not* in this set is treated as the agent process.
 */
const SHELL_COMMS = new Set(['bash', 'zsh', 'sh', 'dash', 'fish', 'ksh']);

/**
 * Returns the kernel `comm` value for `pid`, or `null` when `ps` fails.
 *
 * @param pid - Process ID to inspect.
 * @returns The trimmed `comm` value, or `null` when the process is gone or
 *   `ps` cannot be invoked.
 */
function getComm(pid: number): string | null {
  try {
    return execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

/**
 * Returns the parent PID for a process, or `null` when traversal should stop.
 *
 * `null` is returned for missing processes, malformed `ps` output, and
 * self-parenting values that would otherwise create a loop.
 *
 * @param pid - Process ID whose parent should be queried.
 * @returns Parent PID when available, otherwise `null`.
 */
function getParentPid(pid: number): number | null {
  try {
    const ppidStr = execSync(`ps -p ${pid} -o ppid=`, { encoding: 'utf8' }).trim();
    const parentPid = Number.parseInt(ppidStr, 10);
    if (Number.isNaN(parentPid) || parentPid === pid) return null;
    return parentPid;
  } catch {
    return null;
  }
}

/**
 * Walks the process tree upward from `startPid` (default: `process.ppid`)
 * skipping shell processes and returning the first non-shell ancestor PID.
 *
 * Under shell-skip the first non-shell ancestor *is* the agent process. The
 * walk traverses at most {@link PROCESS_TREE_MAX_DEPTH} levels.
 *
 * @param startPid - Optional root PID for traversal. When omitted, traversal
 *   starts at the parent of the current hook process.
 * @returns The first non-shell ancestor PID, or `null` when no non-shell
 *   ancestor is found within {@link PROCESS_TREE_MAX_DEPTH}.
 */
export function findAgentPid(startPid?: number): number | null {
  let pid = startPid ?? process.ppid;

  for (let depth = 0; depth < PROCESS_TREE_MAX_DEPTH; depth++) {
    if (pid <= 1) return null;

    const comm = getComm(pid);
    if (comm !== null && !SHELL_COMMS.has(comm)) return pid;

    const parentPid = getParentPid(pid);
    if (parentPid === null) return null;
    pid = parentPid;
  }

  return null;
}
