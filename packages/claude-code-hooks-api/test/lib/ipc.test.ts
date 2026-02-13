import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isProcessAlive } from '../../src/lib/ipc.js';

/**
 * Exercises ipc behavior in the lib area through focused scenarios.
 * The cases lock in edge handling and regression coverage so refactors preserve expected state
 * transitions and output.
 *
 * @summary Tests ipc behavior in lib
 */

describe('ipc functions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isProcessAlive', () => {
    it('returns false for non-existent PID', () => {
      expect(isProcessAlive(999999999)).toBe(false);
    });

    it('returns true for current process', () => {
      expect(isProcessAlive(process.pid)).toBe(true);
    });
  });
});
