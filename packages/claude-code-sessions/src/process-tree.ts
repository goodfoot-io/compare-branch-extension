/**
 * Process tree utilities for locating supported agent ancestor processes.
 *
 * @summary Process tree utilities for locating supported agent ancestor processes
 * @module lib/process-tree
 */

import { execSync } from 'node:child_process';

/** Maximum depth to walk up the process tree. */
export const PROCESS_TREE_MAX_DEPTH = 10;

const AGENT_ARGS_PATTERNS = [/((^|\s|\/)claude(\/|\s|$))/i, /((^|\s|\/)codex(\/|\s|$))/i];

/**
 * Checks whether a given PID belongs to a supported agent process.
 *
 * @param pid - Process ID to inspect.
 * @returns `true` when the process args match a supported agent executable.
 */
function isSupportedAgent(pid: number): boolean {
  try {
    const args = execSync(`ps -p ${pid} -o args=`, { encoding: 'utf8' }).trim();
    return AGENT_ARGS_PATTERNS.some((pattern) => pattern.test(args));
  } catch {
    return false;
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
 * looking for the nearest supported agent ancestor.
 *
 * @param startPid - Optional root PID for traversal. When omitted, traversal
 *   starts at the parent of the current hook process.
 * @returns The nearest matching agent ancestor PID, or `null` when no match
 *   is found within {@link PROCESS_TREE_MAX_DEPTH}.
 */
export function findAgentPid(startPid?: number): number | null {
  const pids = findAllAgentPids(startPid);
  return pids[0] ?? null;
}

/**
 * Walks the process tree upward from `startPid` (default: `process.ppid`) and
 * returns **all** supported agent ancestor PIDs, ordered nearest-first.
 *
 * Useful when multiple agent sessions are nested and the correct card
 * association may belong to an ancestor further up the tree.
 *
 * @param startPid - Optional root PID for traversal. When omitted, traversal
 *   starts at the parent of the current hook process.
 * @returns All matching agent ancestor PIDs discovered before traversal stops.
 */
export function findAllAgentPids(startPid?: number): number[] {
  const results: number[] = [];
  let pid = startPid ?? process.ppid;

  for (let depth = 0; depth < PROCESS_TREE_MAX_DEPTH; depth++) {
    if (pid <= 1) break;

    if (isSupportedAgent(pid)) {
      results.push(pid);
    }

    const parentPid = getParentPid(pid);
    if (parentPid === null) break;
    pid = parentPid;
  }

  return results;
}
