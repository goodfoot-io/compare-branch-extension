/**
 * Bounded, idempotent termination for launcher-owned Codex process trees.
 *
 * @summary Drain-safe Codex process-tree termination
 * @module
 */

import { type ChildProcess, execFile } from 'node:child_process';

export type CodexTerminationResult = 'graceful' | 'forced' | 'failed';
export type CodexTerminationReason = 'cancel' | 'shutdown';

export interface CodexTerminationOptions {
  gracefulTimeoutMs: number;
  forceTimeoutMs: number;
  /** Test/platform seam; production uses the launcher-owned tree adapter. */
  signalTree?: (child: ChildProcess, signal: NodeJS.Signals) => void | Promise<void>;
}

export interface CodexTerminationController {
  terminate(reason: CodexTerminationReason): Promise<CodexTerminationResult>;
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
  if (pid === undefined) throw new Error('Cannot terminate Codex process tree without a root pid');

  if (process.platform === 'win32') {
    await windowsTaskkill(pid, signal === 'SIGKILL');
    return;
  }

  // `spawnCodexSession` launches Codex detached on POSIX, giving the action a
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
 * Creates one termination controller for a launcher-owned Codex process tree.
 * Concurrent requests share the exact same promise and escalation sequence.
 *
 * @param child - Root process launched into the owned tree.
 * @param options - Grace and force deadlines plus an optional signal adapter.
 * @returns An idempotent controller shared by cancellation and shutdown.
 */
export function createCodexTerminationController(
  child: ChildProcess,
  options: CodexTerminationOptions
): CodexTerminationController {
  const signalTree = options.signalTree ?? signalOwnedTree;
  let termination: Promise<CodexTerminationResult> | undefined;

  return {
    terminate(_reason: CodexTerminationReason): Promise<CodexTerminationResult> {
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
