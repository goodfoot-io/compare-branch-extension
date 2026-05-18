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

import { tmpdir as realTmpdir } from 'node:os';
import { acquireLock, releaseLock, tryRemoveStaleLock } from '../src/internal.js';

describe('internal helpers', () => {
  let testDir: string;
  let lockPath: string;

  beforeEach(() => {
    testDir = join(realTmpdir(), `internal-test-${Date.now()}-${Math.random()}`);
    mkdirSync(testDir, { recursive: true });
    process.env['MOCK_HOMEDIR'] = testDir;
    lockPath = join(testDir, 'test.lock');
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
  });
});
