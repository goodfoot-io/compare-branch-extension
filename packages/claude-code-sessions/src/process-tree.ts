/**
 * Process tree utilities for locating Claude Code ancestor processes.
 *
 *
 * @summary Process tree utilities for locating Claude Code ancestor processes
 * @module lib/process-tree
 */

import { execSync } from 'node:child_process';

/** Maximum depth to walk up the process tree. */
export const PROCESS_TREE_MAX_DEPTH = 10;

/**
 * Pattern matching `claude` as a path component in `ps -o args=` output.
 *
 * Matches `claude` when preceded by start-of-string, whitespace, or `/`
 * (path separator) AND followed by `/`, whitespace, or end-of-string.
 *
 * This avoids false positives on `.claude/` directory paths in arguments
 * like `/home/node/.claude/shell-snapshots/...` because the `.` between
 * the `/` and `claude` prevents the lookbehind from matching.
 *
 * The trailing `/` alternative handles versioned executables where the path
 * contains `/claude/versions/X.Y.Z` — `claude` is a directory component,
 * not the terminal command name.
 */
const CLAUDE_ARGS_PATTERN = /(^|\s|\/)claude(\/|\s|$)/i;

/**
 * Checks whether a given PID belongs to a Claude process.
 *
 * Uses `ps -p PID -o args=` to get the full command line, then tests
 * whether `claude` appears as a path component or command name.
 * This matches both the `claude` binary and versioned executables
 * (e.g. `~/.local/share/claude/versions/2.1.51`).
 *
 * @param pid - Process ID to inspect.
 * @returns `true` when the process args match Claude; otherwise `false`.
 */
function isClaude(pid: number): boolean {
  try {
    const args = execSync(`ps -p ${pid} -o args=`, { encoding: 'utf8' }).trim();
    return CLAUDE_ARGS_PATTERN.test(args);
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
 * looking for the nearest ancestor named "claude".
 *
 * @param startPid - Optional root PID for traversal. When omitted, traversal
 *   starts at the parent of the current hook process.
 * @returns The nearest matching Claude ancestor PID, or `null` when no match
 *   is found within {@link PROCESS_TREE_MAX_DEPTH}.
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
 * If Claude launched Claude which launched Claude, this returns that breadcrumb
 * trail nearest-first.
 *
 * @param startPid - Optional root PID for traversal. When omitted, traversal
 *   starts at the parent of the current hook process.
 * @returns All matching Claude ancestor PIDs discovered before traversal stops.
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
