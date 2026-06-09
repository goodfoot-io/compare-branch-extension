/**
 * Process tree utilities for locating supported agent ancestor processes.
 *
 * @summary Process tree utilities for locating supported agent ancestor processes
 * @module lib/process-tree
 */

import { execSync } from 'node:child_process';

/** Maximum depth to walk up the process tree. */
export const PROCESS_TREE_MAX_DEPTH = 10;

/** Whether the current host is Windows. */
const IS_WINDOWS = process.platform === 'win32';

/**
 * Set of normalized command names that identify shell processes the walk skips.
 *
 * On POSIX the value compared is the kernel `comm` (15-char truncated basename
 * of the executable). On Windows it is the `Win32_Process.Name`, normalized to
 * the same key space by {@link normalizeComm} (lowercased, executable extension
 * stripped) so `Bash.exe`/`cmd.exe` collapse onto `bash`/`cmd`. The Windows
 * shells (`cmd`, `powershell`, `pwsh`) are included because Claude Code runs
 * hooks through Git Bash and `cross-spawn` routes the agent launch through
 * `cmd.exe`, both of which can appear as ancestors of the hook process. The
 * first ancestor whose normalized name is *not* in this set is the agent.
 */
const SHELL_COMMS = new Set(['bash', 'zsh', 'sh', 'dash', 'fish', 'ksh', 'cmd', 'powershell', 'pwsh']);

/**
 * Process identity used while walking the tree: the command name and parent PID.
 */
interface ProcessInfo {
  /** Command name (POSIX `comm` / Windows `Win32_Process.Name`). */
  comm: string;
  /** Parent process ID. */
  ppid: number;
}

/**
 * Normalizes a command name to the {@link SHELL_COMMS} key space.
 *
 * Lowercases and strips a trailing Windows executable extension so a Windows
 * `Win32_Process.Name` such as `Bash.exe` or `cmd.exe` compares equal to the
 * POSIX `comm` values `bash`/`cmd`.
 *
 * @param comm - Raw command name from `ps` or `Win32_Process`.
 * @returns The normalized command key.
 */
function normalizeComm(comm: string): string {
  return comm
    .trim()
    .toLowerCase()
    .replace(/\.(exe|com|bat|cmd)$/, '');
}

/**
 * Builds the platform command that reports a process's name and parent PID.
 *
 * On Windows a single PowerShell CIM query emits `Name|ParentProcessId`; `ps`
 * is not available. On POSIX a single `ps` invocation emits both fields.
 *
 * @param pid - Process ID to inspect.
 * @returns The shell command string to execute.
 */
function buildProcessInfoCommand(pid: number): string {
  if (IS_WINDOWS) {
    return (
      'powershell -NoProfile -NonInteractive -Command ' +
      `"Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}' | ` +
      "Select-Object -First 1 | ForEach-Object { $_.Name + '|' + $_.ParentProcessId }\""
    );
  }
  return `ps -p ${pid} -o comm=,ppid=`;
}

/**
 * Parses the raw output of {@link buildProcessInfoCommand} into a {@link ProcessInfo}.
 *
 * Windows output is `Name|ParentProcessId`. POSIX `ps` output is the command
 * name followed by the parent PID, whitespace-separated; the parent PID is the
 * trailing numeric token and the command name is everything before it.
 *
 * @param raw - Trimmed command output.
 * @returns Parsed process info, or `null` when the output is empty or malformed.
 */
function parseProcessInfo(raw: string): ProcessInfo | null {
  if (!raw) return null;

  if (IS_WINDOWS) {
    const sep = raw.lastIndexOf('|');
    if (sep < 0) return null;
    const comm = raw.slice(0, sep).trim();
    const ppid = Number.parseInt(raw.slice(sep + 1).trim(), 10);
    if (!comm || Number.isNaN(ppid)) return null;
    return { comm, ppid };
  }

  const tokens = raw.split(/\s+/);
  const ppid = Number.parseInt(tokens[tokens.length - 1] ?? '', 10);
  const comm = tokens.slice(0, -1).join(' ').trim();
  if (!comm || Number.isNaN(ppid)) return null;
  return { comm, ppid };
}

/**
 * Returns the command name and parent PID for `pid`, or `null` on failure.
 *
 * A single subprocess reports both fields. Returns `null` when the process is
 * gone, the query fails, or the output cannot be parsed.
 *
 * @param pid - Process ID to inspect.
 * @returns The process info, or `null` when unavailable.
 */
function getProcessInfo(pid: number): ProcessInfo | null {
  try {
    const raw = execSync(buildProcessInfoCommand(pid), {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return parseProcessInfo(raw);
  } catch {
    return null;
  }
}

/**
 * Walks the process tree upward from `startPid` (default: `process.ppid`)
 * skipping shell processes and returning the first non-shell ancestor PID.
 *
 * Under shell-skip the first non-shell ancestor *is* the agent process. The
 * walk traverses at most {@link PROCESS_TREE_MAX_DEPTH} levels and is
 * cross-platform: it resolves each process's name and parent PID via `ps` on
 * POSIX and a PowerShell `Win32_Process` query on Windows.
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

    const info = getProcessInfo(pid);
    if (info === null) return null;

    if (!SHELL_COMMS.has(normalizeComm(info.comm))) return pid;

    // Stop on a missing or self-parenting PID that would otherwise loop.
    if (info.ppid <= 0 || info.ppid === pid) return null;
    pid = info.ppid;
  }

  return null;
}
