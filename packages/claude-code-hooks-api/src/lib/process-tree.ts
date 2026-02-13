/**
 * Process tree utilities for locating Claude Code ancestor processes.
 *
 *
 * @summary Process tree utilities for locating Claude Code ancestor processes
 * @module lib/process-tree
 */

import { execSync } from 'node:child_process';
import { basename } from 'node:path';

/** Maximum depth to walk up the process tree. */
export const PROCESS_TREE_MAX_DEPTH = 10;

/**
 * Checks whether a given PID belongs to a process named "claude".
 *
 * Two-step matching:
 * 1. Primary: `ps -p PID -o comm=` -> basename -> compare "claude" (case-insensitive)
 * 2. Fallback: `ps -p PID -o args=` -> test /\bclaude\b/i
 */
function isClaude(pid: number): boolean {
  try {
    const comm = execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8' }).trim();
    if (basename(comm).toLowerCase() === 'claude') return true;

    const args = execSync(`ps -p ${pid} -o args=`, { encoding: 'utf8' }).trim();
    return /\bclaude\b/i.test(args);
  } catch {
    return false;
  }
}

/**
 * Returns the parent PID for a given PID, or null if it cannot be determined.
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
 * looking for the nearest ancestor named "claude".
 *
 * @param startPid - PID to start walking from. Defaults to `process.ppid`.
 * @returns Claude PID if found, null otherwise. Never throws.
 */
export function findClaudePid(startPid?: number): number | null {
  const pids = findAllClaudePids(startPid);
  return pids[0] ?? null;
}

/**
 * Walks the process tree upward from `startPid` (default: `process.ppid`) and
 * returns **all** PIDs named "claude", ordered nearest-first.
 *
 * Useful when multiple Claude sessions are nested (e.g. a Task subagent
 * spawned by an outer Claude) and the correct card association may belong
 * to an ancestor further up the tree.
 *
 * @param startPid - PID to start walking from. Defaults to `process.ppid`.
 * @returns Array of Claude PIDs found in the ancestor chain, nearest first.
 */
export function findAllClaudePids(startPid?: number): number[] {
  const results: number[] = [];
  let pid = startPid ?? process.ppid;

  for (let depth = 0; depth < PROCESS_TREE_MAX_DEPTH; depth++) {
    if (pid <= 1) break;

    if (isClaude(pid)) {
      results.push(pid);
    }

    const parentPid = getParentPid(pid);
    if (parentPid === null) break;
    pid = parentPid;
  }

  return results;
}
