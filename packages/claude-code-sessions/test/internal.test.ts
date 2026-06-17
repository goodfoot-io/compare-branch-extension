/**
 * Tests for the internal locking, read/write, and pruning helpers.
 *
 * @summary Tests for internal registry helpers
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:os', () => ({
  homedir: vi.fn(() => process.env['MOCK_HOMEDIR'] || '/tmp'),
  tmpdir: vi.fn(() => '/tmp')
}));

vi.mock('../src/ipc.js', () => ({
  isProcessAlive: vi.fn()
}));

import { tmpdir as realTmpdir } from 'node:os';
import { acquireLock, releaseLock, tryRemoveStaleLock } from '../src/internal.js';
import { isProcessAlive } from '../src/ipc.js';

const mockIsProcessAlive = vi.mocked(isProcessAlive);

describe('internal helpers', () => {
  let testDir: string;
  let lockPath: string;

  beforeEach(() => {
    testDir = join(realTmpdir(), `internal-test-${Date.now()}-${Math.random()}`);
    mkdirSync(testDir, { recursive: true });
    process.env['MOCK_HOMEDIR'] = testDir;
    lockPath = join(testDir, 'test.lock');

    // Default: mirror real liveness via kill(pid, 0) so existing dead-PID /
    // live-PID tests behave as before. Individual tests override as needed.
    mockIsProcessAlive.mockReset();
    mockIsProcessAlive.mockImplementation((pid: number) => {
      try {
        process.kill(pid, 0);
        return true;
      } catch (error) {
        if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'EPERM') {
          return true;
        }
        return false;
      }
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    delete process.env['MOCK_HOMEDIR'];
  });

  // -------------------------------------------------------------------------
  // acquireLock
  // -------------------------------------------------------------------------

  describe('acquireLock', () => {
    it('creates lock file with PID content', async () => {
      await acquireLock(lockPath, 2000);

      expect(existsSync(lockPath)).toBe(true);
      const content = readFileSync(lockPath, 'utf-8');
      expect(content).toBe(String(process.pid));

      // Cleanup
      rmSync(lockPath);
    });

    it('throws Lock acquisition timeout when lock held by live process', async () => {
      // Create lock held by our own PID (alive)
      writeFileSync(lockPath, String(process.pid));

      await expect(acquireLock(lockPath, 200)).rejects.toThrow('Lock acquisition timeout');
    });
  });

  // -------------------------------------------------------------------------
  // releaseLock
  // -------------------------------------------------------------------------

  describe('releaseLock', () => {
    it('removes lock file', async () => {
      writeFileSync(lockPath, String(process.pid));
      expect(existsSync(lockPath)).toBe(true);

      releaseLock(lockPath);
      expect(existsSync(lockPath)).toBe(false);
    });

    it('no-ops on ENOENT', () => {
      expect(() => releaseLock(lockPath)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // tryRemoveStaleLock
  // -------------------------------------------------------------------------

  describe('tryRemoveStaleLock', () => {
    it('removes lock from dead process', () => {
      writeFileSync(lockPath, '999999'); // dead PID

      const result = tryRemoveStaleLock(lockPath);
      expect(result).toBe(true);
      expect(existsSync(lockPath)).toBe(false);
    });

    it('preserves lock from live process', () => {
      writeFileSync(lockPath, String(process.pid));

      const result = tryRemoveStaleLock(lockPath);
      expect(result).toBe(false);
      expect(existsSync(lockPath)).toBe(true);
    });

    it('preserves the lock when the liveness probe throws an unexpected error (fail-closed)', () => {
      // A real lock file with a parseable PID is present.
      writeFileSync(lockPath, String(process.pid));

      // isProcessAlive rethrows for any non-ESRCH/non-EPERM kill() failure, so
      // the holder's liveness is *unknown* — the process may well be alive.
      const probeError = Object.assign(new Error('kill failed'), { code: 'EINVAL' });
      mockIsProcessAlive.mockImplementation(() => {
        throw probeError;
      });

      // Fail-closed: an unknown liveness result must NOT delete a potentially
      // live lock. The current broad catch unlinks on any throw and returns true.
      const result = tryRemoveStaleLock(lockPath);
      expect(result).toBe(false);
      expect(existsSync(lockPath)).toBe(true);
    });
  });
});
