/**
 * Spike test proving the SIGHUP survival mechanism in the action handler runtime.
 *
 * When a VSCode terminal closes, SIGHUP is sent to the entire process group.
 * The `process.on('SIGHUP', () => {})` no-op handler in `executeCommand`
 * prevents Node.js from terminating the action handler, allowing post-exit
 * cleanup code (e.g. spawning a branch-cleanup-watcher) to run after the
 * child process dies from SIGHUP.
 *
 * This test spawns a detached process group containing a parent (simulating the
 * action handler) and a child, sends SIGHUP to the group, and verifies:
 * 1. The child dies from SIGHUP (default Node.js behavior)
 * 2. The parent survives because of the no-op SIGHUP handler
 * 3. The parent's post-child-exit code executes (writes a marker file)
 *
 * @summary Spike: SIGHUP survival allows post-exit cleanup in action handler
 */

import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Wait for a condition to become true within a timeout.
 * Polls every 100ms.
 *
 * @param check - Predicate to evaluate on each poll.
 * @param timeoutMs - Maximum time to wait before rejecting.
 * @param label - Description for the timeout error message.
 * @returns Resolves when check returns true, rejects on timeout.
 * @throws {Error} When the condition is not met within timeoutMs.
 */
function waitForCondition(check: () => boolean, timeoutMs: number, label?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (check()) {
      resolve();
      return;
    }
    const deadline = Date.now() + timeoutMs;
    const interval = setInterval(() => {
      if (check()) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() > deadline) {
        clearInterval(interval);
        reject(new Error(`Timeout waiting for: ${label ?? 'condition'}`));
      }
    }, 100);
  });
}

/**
 * Kill a process group (negative PID). Silently ignores ESRCH (already dead).
 *
 * @param pid - The process group leader PID.
 * @param signal - Signal to send (defaults to SIGKILL).
 * @throws {NodeJS.ErrnoException} When process.kill fails with an error other than ESRCH.
 */
function killProcessGroup(pid: number, signal: NodeJS.Signals = 'SIGKILL'): void {
  try {
    process.kill(-pid, signal);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
  }
}

describe('SIGHUP survival mechanism', () => {
  let tempDir: string;
  let processGroupPids: number[];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sighup-survival-test-'));
    processGroupPids = [];
  });

  afterEach(() => {
    for (const pid of processGroupPids) {
      killProcessGroup(pid);
    }
    processGroupPids = [];
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('action handler with SIGHUP no-op survives to run post-exit cleanup', async () => {
    const readyMarker = path.join(tempDir, 'ready');
    const cleanupMarker = path.join(tempDir, 'cleanup-ran');

    // Inline script simulating the action handler with the SIGHUP fix.
    // It installs the same no-op SIGHUP handler that executeCommand uses,
    // spawns a child process, and writes a marker file after the child exits.
    const handlerScript = `
      const { spawn } = require('node:child_process');
      const fs = require('node:fs');

      // The fix under test: no-op SIGHUP handler prevents Node.js termination
      process.on('SIGHUP', () => {});

      // Spawn a long-lived child (simulating the claude CLI)
      const child = spawn('node', ['-e', 'setTimeout(() => {}, 60000)'], {
        stdio: 'ignore'
      });

      // Signal that the handler is ready
      fs.writeFileSync(${JSON.stringify(readyMarker)}, 'ready');

      // After the child exits (killed by SIGHUP), run post-exit cleanup
      child.on('close', () => {
        fs.writeFileSync(${JSON.stringify(cleanupMarker)}, 'cleanup-ran');
        process.exit(0);
      });
    `;

    const scriptPath = path.join(tempDir, 'handler.cjs');
    fs.writeFileSync(scriptPath, handlerScript);

    // Spawn in a detached process group so SIGHUP hits the whole group
    const proc = spawn('node', [scriptPath], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    if (proc.pid) {
      processGroupPids.push(proc.pid);
    }

    let stderr = '';
    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    const exitPromise = new Promise<{ code: number | null; signal: string | null }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Handler did not exit within 10s after SIGHUP. stderr: ${stderr}`));
      }, 10000);

      proc.on('close', (code, signal) => {
        clearTimeout(timeout);
        resolve({ code, signal });
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // Wait for the handler to be running and child spawned
    await waitForCondition(() => fs.existsSync(readyMarker), 5000, 'ready marker');

    // Brief pause to ensure the child process is fully spawned
    await new Promise((r) => setTimeout(r, 200));

    // Send SIGHUP to the entire process group (simulates terminal close)
    killProcessGroup(proc.pid!, 'SIGHUP');

    // The handler should survive SIGHUP, its child should die, and the
    // close handler should write the cleanup marker before exiting.
    const result = await exitPromise;

    expect(result.code).toBe(0);
    expect(fs.existsSync(cleanupMarker)).toBe(true);
    expect(fs.readFileSync(cleanupMarker, 'utf-8')).toBe('cleanup-ran');
  }, 15000);

  it('without SIGHUP handler, post-exit cleanup does NOT run (control case)', async () => {
    const readyMarker = path.join(tempDir, 'ready');
    const cleanupMarker = path.join(tempDir, 'cleanup-ran');

    // Same script but WITHOUT the SIGHUP handler — proving the fix is necessary
    const handlerScript = `
      const { spawn } = require('node:child_process');
      const fs = require('node:fs');

      // NO SIGHUP handler — Node.js will terminate immediately on SIGHUP

      const child = spawn('node', ['-e', 'setTimeout(() => {}, 60000)'], {
        stdio: 'ignore'
      });

      fs.writeFileSync(${JSON.stringify(readyMarker)}, 'ready');

      child.on('close', () => {
        fs.writeFileSync(${JSON.stringify(cleanupMarker)}, 'cleanup-ran');
        process.exit(0);
      });
    `;

    const scriptPath = path.join(tempDir, 'handler-no-fix.cjs');
    fs.writeFileSync(scriptPath, handlerScript);

    const proc = spawn('node', [scriptPath], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    if (proc.pid) {
      processGroupPids.push(proc.pid);
    }

    let stderr = '';
    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    const exitPromise = new Promise<{ code: number | null; signal: string | null }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Handler did not exit within 10s after SIGHUP. stderr: ${stderr}`));
      }, 10000);

      proc.on('close', (code, signal) => {
        clearTimeout(timeout);
        resolve({ code, signal });
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    await waitForCondition(() => fs.existsSync(readyMarker), 5000, 'ready marker');
    await new Promise((r) => setTimeout(r, 200));

    killProcessGroup(proc.pid!, 'SIGHUP');

    const result = await exitPromise;

    // Without the SIGHUP handler, the process is killed by the signal
    // (exit code null, signal SIGHUP) and cleanup never runs
    expect(result.signal).toBe('SIGHUP');
    expect(result.code).toBeNull();
    expect(fs.existsSync(cleanupMarker)).toBe(false);
  }, 15000);
});
