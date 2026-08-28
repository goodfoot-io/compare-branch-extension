/**
 * Bounded, idempotent termination for launcher-owned Claude process trees.
 *
 * @summary Drain-safe Claude process-tree termination
 * @module
 */

import { type ChildProcess, execFile } from 'node:child_process';

export type ClaudeTerminationResult = 'graceful' | 'forced' | 'failed';
export type ClaudeTerminationReason = 'cancel' | 'shutdown';

export interface ClaudeTerminationOptions {
  gracefulTimeoutMs: number;
  forceTimeoutMs: number;
  /** Test/platform seam; production uses the launcher-owned tree adapter. */
  signalTree?: (child: ChildProcess, signal: NodeJS.Signals) => void | Promise<void>;
}

export interface ClaudeTerminationController {
  terminate(reason: ClaudeTerminationReason): Promise<ClaudeTerminationResult>;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function windowsTaskkill(pid: number, force: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('taskkill.exe', ['/PID', String(pid), '/T', ...(force ? ['/F'] : [])], (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function signalOwnedTree(child: ChildProcess, signal: NodeJS.Signals): Promise<void> {
  const pid = child.pid;
  if (pid === undefined) throw new Error('Cannot terminate Claude process tree without a root pid');

  if (process.platform === 'win32') {
    await windowsTaskkill(pid, signal === 'SIGKILL');
    return;
  }

  // `spawnClaudeSession` launches Claude detached on POSIX, giving the action a
  // process group whose id is the root pid. Negative-pid signalling stays
  // inside that launcher-owned group and cannot sweep unrelated processes.
  process.kill(-pid, signal);
}

function ownedTreeExists(child: ChildProcess): boolean {
  const pid = child.pid;
  if (pid === undefined) return false;
  if (process.platform === 'win32') return child.exitCode === null && child.signalCode === null;

  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ESRCH') return false;
    if (code === 'EPERM') return true;
    throw error;
  }
}

async function waitForTreeExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (ownedTreeExists(child)) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return false;
    await delay(Math.min(10, remaining));
  }
  return true;
}

/**
 * Creates one termination controller for a launcher-owned Claude process tree.
 * Concurrent requests share the exact same promise and escalation sequence.
 *
 * @param child - Root process launched into the owned tree.
 * @param options - Grace and force deadlines plus an optional signal adapter.
 * @returns An idempotent controller shared by cancellation and shutdown.
 */
export function createClaudeTerminationController(
  child: ChildProcess,
  options: ClaudeTerminationOptions
): ClaudeTerminationController {
  const signalTree = options.signalTree ?? signalOwnedTree;
  let termination: Promise<ClaudeTerminationResult> | undefined;

  return {
    terminate(_reason: ClaudeTerminationReason): Promise<ClaudeTerminationResult> {
      if (termination !== undefined) return termination;

      termination = (async () => {
        if (!ownedTreeExists(child)) return 'graceful';

        try {
          await signalTree(child, 'SIGTERM');
        } catch {
          return ownedTreeExists(child) ? 'failed' : 'graceful';
        }

        if (await waitForTreeExit(child, options.gracefulTimeoutMs)) return 'graceful';

        try {
          await signalTree(child, 'SIGKILL');
        } catch {
          return ownedTreeExists(child) ? 'failed' : 'forced';
        }

        return (await waitForTreeExit(child, options.forceTimeoutMs)) ? 'forced' : 'failed';
      })();

      return termination;
    }
  };
}
