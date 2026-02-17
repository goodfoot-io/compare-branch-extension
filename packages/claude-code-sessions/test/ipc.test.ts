import { describe, expect, it, vi } from 'vitest';
import { isProcessAlive } from '../src/ipc.js';

describe('isProcessAlive', () => {
  it('returns true for the current process', () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  it('returns false for a non-existent PID', () => {
    expect(isProcessAlive(999999999)).toBe(false);
  });

  it('returns true when process.kill throws EPERM', () => {
    const spy = vi.spyOn(process, 'kill').mockImplementation(() => {
      const error = new Error('EPERM') as NodeJS.ErrnoException;
      error.code = 'EPERM';
      throw error;
    });

    expect(isProcessAlive(12345)).toBe(true);
    spy.mockRestore();
  });

  it('rethrows unexpected errors', () => {
    const spy = vi.spyOn(process, 'kill').mockImplementation(() => {
      throw new Error('unexpected');
    });

    expect(() => isProcessAlive(12345)).toThrow('unexpected');
    spy.mockRestore();
  });

  it('rethrows errors with unrecognised errno codes', () => {
    const spy = vi.spyOn(process, 'kill').mockImplementation(() => {
      const error = new Error('EINVAL') as NodeJS.ErrnoException;
      error.code = 'EINVAL';
      throw error;
    });

    expect(() => isProcessAlive(12345)).toThrow('EINVAL');
    spy.mockRestore();
  });
});
