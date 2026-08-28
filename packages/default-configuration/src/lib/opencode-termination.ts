/**
 * Bounded, idempotent termination for launcher-owned OpenCode process trees.
 *
 * Adapted from {@link ./codex-termination.js}: OpenCode's parallel tools,
 * subagents, and background jobs all run inside the single `opencode` CLI
 * process and its descendants, so the same owned-process-group idiom applies
 * unchanged — signal the group, wait, escalate, report. What differs from
 * Codex is upstream of this module: the drain handshake (crossing OpenCode's
 * own idle boundary before a `shutdownReady` acknowledgement even reaches
 * this controller) lives in the `cards-stop-exit-when-done` OpenCode plugin
 * (`public/packages/agent-hooks/src/opencode/runtime/stop-exit-when-done.ts`),
 * not here. This module's only job is the bounded kill sequence once
 * termination has actually been requested.
 *
 * @summary Drain-safe OpenCode process-tree termination
 * @module
 */

import { type ChildProcess, execFile } from 'node:child_process';

export type OpencodeTerminationResult = 'graceful' | 'forced' | 'failed';
export type OpencodeTerminationReason = 'cancel' | 'shutdown';

export interface OpencodeTerminationOptions {
  gracefulTimeoutMs: number;
  forceTimeoutMs: number;
  /** Test/platform seam; production uses the launcher-owned tree adapter. */
  signalTree?: (child: ChildProcess, signal: NodeJS.Signals) => void | Promise<void>;
}

export interface OpencodeTerminationController {
  terminate(reason: OpencodeTerminationReason): Promise<OpencodeTerminationResult>;
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
  if (pid === undefined) throw new Error('Cannot terminate OpenCode process tree without a root pid');

  if (process.platform === 'win32') {
    await windowsTaskkill(pid, signal === 'SIGKILL');
    return;
  }

  // `spawnOpencodeSession` launches `opencode` detached on POSIX, giving the
  // action a process group whose id is the root pid. Negative-pid signalling
  // stays inside that launcher-owned group and cannot sweep sibling actions —
  // the exact worktree-wide-discovery hazard this module deliberately avoids.
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
 * Creates one termination controller for a launcher-owned OpenCode process
 * tree. Concurrent requests (a user `cancel` racing an agent-initiated
 * `shutdown`) share the exact same promise and escalation sequence — the
 * second caller observes whichever outcome the first triggered rather than
 * signalling twice.
 *
 * @param child - Root `opencode` process launched into the owned tree.
 * @param options - Grace and force deadlines plus an optional signal adapter.
 * @returns An idempotent controller shared by cancellation and shutdown.
 */
export function createOpencodeTerminationController(
  child: ChildProcess,
  options: OpencodeTerminationOptions
): OpencodeTerminationController {
  const signalTree = options.signalTree ?? signalOwnedTree;
  let termination: Promise<OpencodeTerminationResult> | undefined;

  return {
    terminate(_reason: OpencodeTerminationReason): Promise<OpencodeTerminationResult> {
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
