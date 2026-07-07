/**
 * Mocked branch tests for `isProcessAlive`.
 *
 * Ported from the deleted `test/bin/transcript-watcher.test.ts`. Kept separate
 * from `process-utils.test.ts` (whose "real implementations only" design
 * exercises everything against real processes) because the EPERM branch
 * (process exists but this user cannot signal it) and the win32 `tasklist`
 * branch cannot be reached with a real process on a POSIX CI runner — they
 * need `process.kill`/`execFileSync` mocked to exercise deliberately.
 *
 * @summary Mocked isProcessAlive branch coverage: ESRCH, EPERM, win32 tasklist
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

// execFileSync is non-configurable on the node:child_process namespace object,
// so it cannot be spied via vi.spyOn — mock the module instead. The Windows
// branch of isProcessAlive calls execFileSync('tasklist', ...).
const mockExecFileSync = vi.fn();
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, execFileSync: (...args: unknown[]) => mockExecFileSync(...args) };
});

import { isProcessAlive } from '../src/bin/process-utils.js';

describe('isProcessAlive', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockExecFileSync.mockReset();
  });

  it('returns true for the current process PID', () => {
    // On Windows, exercise the real tasklist mechanism by faking a row that
    // includes the current PID; on POSIX, process.kill(pid, 0) is real.
    if (process.platform === 'win32') {
      mockExecFileSync.mockReturnValue(`node.exe ${process.pid} Console 1 8 K`);
    }
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  // isProcessAlive uses a different real mechanism per platform: `tasklist`
  // on Windows, `process.kill(pid, 0)` on POSIX. Each test exercises the
  // mechanism the production code actually invokes on the host platform.
  const isWindows = process.platform === 'win32';

  it('returns false when the process does not exist', () => {
    if (isWindows) {
      // Windows path: tasklist prints no matching PID row (its "no tasks"
      // message goes to stdout/stderr without the PID).
      mockExecFileSync.mockReturnValue('INFO: No tasks are running which match the specified criteria.');
    } else {
      vi.spyOn(process, 'kill').mockImplementation(() => {
        const err = new Error('kill ESRCH') as NodeJS.ErrnoException;
        err.code = 'ESRCH';
        throw err;
      });
    }
    expect(isProcessAlive(2147483647)).toBe(false);
  });

  it('returns true when the process exists but is not owned by us', () => {
    if (isWindows) {
      // Windows path: tasklist still lists the PID even for processes the
      // current user cannot signal — the PID appears in the output row.
      mockExecFileSync.mockReturnValue('System Idle Process               1 Services                   0          8 K');
    } else {
      vi.spyOn(process, 'kill').mockImplementation(() => {
        const err = new Error('kill EPERM') as NodeJS.ErrnoException;
        err.code = 'EPERM';
        throw err;
      });
    }
    expect(isProcessAlive(1)).toBe(true);
  });
});
