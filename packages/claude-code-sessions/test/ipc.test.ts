/**
 * @file Tests for IPC utilities.
 * @summary Tests for IPC process-liveness utilities.
 */
import { describe, expect, it, vi } from 'vitest';
import { isProcessAlive } from '../src/ipc.js';

// On Windows `isProcessAlive` uses `tasklist` and never calls `process.kill`,
// so the three tests that mock `process.kill` to assert the POSIX
// errno-handling branch exercise a code path that does not run on Windows.
// The real Windows behavior is covered by the first two (unmocked) tests.
const posixKillOnly = it.skipIf(process.platform === 'win32');

describe('isProcessAlive', () => {
  it('returns true for the current process', () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  it('returns false for a non-existent PID', () => {
    expect(isProcessAlive(999999999)).toBe(false);
  });

  posixKillOnly('returns true when process.kill throws EPERM', () => {
    const spy = vi.spyOn(process, 'kill').mockImplementation(() => {
      const error = new Error('EPERM') as NodeJS.ErrnoException;
      error.code = 'EPERM';
      throw error;
    });

    expect(isProcessAlive(12345)).toBe(true);
    spy.mockRestore();
  });

  posixKillOnly('rethrows unexpected errors', () => {
    const spy = vi.spyOn(process, 'kill').mockImplementation(() => {
      throw new Error('unexpected');
    });

    expect(() => isProcessAlive(12345)).toThrow('unexpected');
    spy.mockRestore();
  });

  posixKillOnly('rethrows errors with unrecognised errno codes', () => {
    const spy = vi.spyOn(process, 'kill').mockImplementation(() => {
      const error = new Error('EINVAL') as NodeJS.ErrnoException;
      error.code = 'EINVAL';
      throw error;
    });

    expect(() => isProcessAlive(12345)).toThrow('EINVAL');
    spy.mockRestore();
  });
});
